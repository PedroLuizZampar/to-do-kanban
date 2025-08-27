const db = require('./database');

async function list(boardId) {
  return db.query('SELECT * FROM templates WHERE board_id = ? ORDER BY position ASC, id ASC', [boardId]);
}

async function get(id) {
  const rows = await db.query('SELECT * FROM templates WHERE id = ?', [id]);
  return rows[0] || null;
}

async function create({ board_id, name, content, is_default }) {
  let pos = 1;
  if (board_id) {
    const rows = await db.query('SELECT COALESCE(MAX(position),0) AS maxp FROM templates WHERE board_id = ?', [board_id]);
    pos = (rows[0]?.maxp || 0) + 1;
  }
  const res = await db.query('INSERT INTO templates (board_id, name, content, is_default, position) VALUES (?,?,?,?,?)', [board_id, name, JSON.stringify(content || {}), !!is_default, pos]);
  if (is_default) await setDefault(board_id, res.insertId);
  return get(res.insertId);
}

async function update(id, { name, content, is_default }) {
  const row = await get(id);
  if (!row) return null;
  await db.query('UPDATE templates SET name = ?, content = ?, is_default = ? WHERE id = ?', [name ?? row.name, JSON.stringify(content ?? row.content), !!is_default, id]);
  if (is_default) await setDefault(row.board_id, id);
  return get(id);
}

async function remove(id) {
  await db.query('DELETE FROM templates WHERE id = ?', [id]);
}

async function setDefault(boardId, templateId) {
  await db.query('UPDATE templates SET is_default = FALSE WHERE board_id = ?', [boardId]);
  await db.query('UPDATE templates SET is_default = TRUE WHERE id = ?', [templateId]);
  return get(templateId);
}

async function clearDefault(boardId) {
  await db.query('UPDATE templates SET is_default = FALSE WHERE board_id = ?', [boardId]);
  return true;
}

async function reorder(boardId, orderIds) {
  const existing = await db.query('SELECT id FROM templates WHERE board_id = ? ORDER BY position ASC, id ASC', [boardId]);
  const set = new Set(existing.map(r => r.id));
  let pos = 1;
  for (const id of orderIds) {
    if (set.has(id)) await db.query('UPDATE templates SET position = ? WHERE id = ?', [pos++, id]);
  }
  const leftovers = await db.query('SELECT id FROM templates WHERE board_id = ? ORDER BY position ASC, id ASC', [boardId]);
  pos = 1;
  for (const r of leftovers) await db.query('UPDATE templates SET position = ? WHERE id = ?', [pos++, r.id]);
  return list(boardId);
}

module.exports = { list, get, create, update, remove, setDefault, clearDefault, reorder };
