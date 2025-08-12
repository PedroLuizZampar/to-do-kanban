const db = require('./database');

async function list(userId) {
  // Boards do usuário + boards onde ele é membro
  const own = await db.query('SELECT * FROM boards WHERE user_id = ? ORDER BY position ASC, id ASC', [userId]);
  const member = await db.query(
    'SELECT b.* FROM boards b INNER JOIN board_members bm ON bm.board_id = b.id WHERE bm.user_id = ? ORDER BY b.position ASC, b.id ASC',
    [userId]
  );
  // Evita duplicados se o owner também for membro
  const byId = new Map();
  for (const b of own.concat(member)) byId.set(b.id, b);
  return Array.from(byId.values());
}

async function get(id, userId) {
  // Permite acesso se owner ou membro
  const rows = await db.query(
    `SELECT b.* FROM boards b
     LEFT JOIN board_members bm ON bm.board_id = b.id AND bm.user_id = ?
     WHERE b.id = ? AND (b.user_id = ? OR bm.user_id IS NOT NULL)
     LIMIT 1`,
    [userId, id, userId]
  );
  return rows[0] || null;
}

async function create({ name, description, color, user_id }) {
  const result = await db.query('INSERT INTO boards (name, description, color, user_id) VALUES (?,?,?,?)', [name, description || null, color || null, user_id]);
  return get(result.insertId, user_id);
}

async function canEdit(id, userId) {
  const rows = await db.query(
    `SELECT b.id FROM boards b
     LEFT JOIN board_members bm ON bm.board_id = b.id AND bm.user_id = ?
     WHERE b.id = ? AND (b.user_id = ? OR bm.user_id IS NOT NULL)
     LIMIT 1`,
    [userId, id, userId]
  );
  return !!rows[0];
}

async function update(id, { name, description, color }, userId) {
  const allowed = await canEdit(id, userId);
  if (!allowed) return null;
  await db.query('UPDATE boards SET name = ?, description = ?, color = ? WHERE id = ?', 
    [name, description || null, color || null, id]);
  return get(id, userId);
}

async function remove(id, userId) {
  // Agora membros também podem excluir, conforme requisito
  const allowed = await canEdit(id, userId);
  if (!allowed) return false;
  await db.query('DELETE FROM boards WHERE id = ?', [id]);
  return true;
}

async function reorder(orderIds, userId) {
  const existing = await db.query('SELECT id FROM boards WHERE user_id = ? ORDER BY position ASC, id ASC', [userId]);
  const set = new Set(existing.map(r => r.id));
  let pos = 1;
  for (const bid of orderIds) {
    if (set.has(bid)) await db.query('UPDATE boards SET position = ? WHERE id = ?', [pos++, bid]);
  }
  const leftovers = await db.query('SELECT id FROM boards WHERE user_id = ? ORDER BY position ASC, id ASC', [userId]);
  pos = 1;
  for (const r of leftovers) await db.query('UPDATE boards SET position = ? WHERE id = ?', [pos++, r.id]);
  return list(userId);
}

module.exports = { list, get, create, update, remove, reorder };

// Compartilhamento
async function listUsersToInvite(boardId, requesterId) {
  // Garante que requester tem acesso ao board
  const b = await get(boardId, requesterId);
  if (!b) throw new Error('Sem acesso');
  // Todos usuários exceto já membros e owner
  return db.query(
    `SELECT u.id, u.username, u.email, u.avatar_url
     FROM users u
     WHERE u.id <> ? AND u.is_admin = 0
       AND u.id NOT IN (SELECT user_id FROM board_members WHERE board_id = ?)
       AND u.id NOT IN (SELECT invited_user_id FROM board_invites WHERE board_id = ? AND status = 'pending')
     ORDER BY u.username ASC`,
    [b.user_id, boardId, boardId]
  );
}

async function inviteUsers(boardId, invitedIds, invitedBy) {
  const b = await get(boardId, invitedBy);
  if (!b) throw new Error('Sem acesso');
  for (const uid of invitedIds) {
    await db.query(
      'INSERT IGNORE INTO board_invites (board_id, invited_user_id, invited_by) VALUES (?,?,?)',
      [boardId, uid, invitedBy]
    );
  }
  return true;
}

async function listInbox(userId) {
  return db.query(
    `SELECT bi.id, bi.board_id, b.name as board_name, u.username as invited_by_name, bi.status, bi.created_at
     FROM board_invites bi
     JOIN boards b ON b.id = bi.board_id
     JOIN users u ON u.id = bi.invited_by
     WHERE bi.invited_user_id = ? AND bi.status = 'pending'
     ORDER BY bi.created_at DESC`,
    [userId]
  );
}

async function respondInvite(inviteId, userId, accept) {
  const rows = await db.query('SELECT * FROM board_invites WHERE id = ? AND invited_user_id = ?', [inviteId, userId]);
  const inv = rows[0];
  if (!inv || inv.status !== 'pending') return null;
  if (accept) {
    await db.query('UPDATE board_invites SET status = "accepted" WHERE id = ?', [inviteId]);
    await db.query('INSERT IGNORE INTO board_members (board_id, user_id, role) VALUES (?,?,"editor")', [inv.board_id, userId]);
  } else {
    await db.query('UPDATE board_invites SET status = "declined" WHERE id = ?', [inviteId]);
  }
  return true;
}

async function listMembers(boardId, requesterId) {
  const b = await get(boardId, requesterId);
  if (!b) throw new Error('Sem acesso');
  const rows = await db.query(
    `SELECT u.id, u.username, u.email, u.avatar_url, 'owner' AS role
       FROM boards b
       JOIN users u ON u.id = b.user_id
      WHERE b.id = ?
     UNION
     SELECT u.id, u.username, u.email, u.avatar_url, bm.role AS role
       FROM board_members bm
       JOIN users u ON u.id = bm.user_id
      WHERE bm.board_id = ?
     ORDER BY username ASC`,
    [boardId, boardId]
  );
  return rows;
}

module.exports = { list, get, create, update, remove, reorder, listUsersToInvite, inviteUsers, listInbox, respondInvite, listMembers };
