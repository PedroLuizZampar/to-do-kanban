const db = require('./database');

async function list(userId) {
  return db.query('SELECT * FROM boards WHERE user_id = ? ORDER BY position ASC, id ASC', [userId]);
}

async function get(id, userId) {
  const rows = await db.query('SELECT * FROM boards WHERE id = ? AND user_id = ?', [id, userId]);
  return rows[0] || null;
}

async function create({ name, description, color, user_id }) {
  const result = await db.query('INSERT INTO boards (name, description, color, user_id) VALUES (?,?,?,?)', [name, description || null, color || null, user_id]);
  return get(result.insertId, user_id);
}

async function update(id, { name, description, color }, userId) {
  await db.query('UPDATE boards SET name = ?, description = ?, color = ? WHERE id = ? AND user_id = ?', 
    [name, description || null, color || null, id, userId]);
  return get(id, userId);
}

async function remove(id, userId) {
  // Cascata removerá categories->tasks e tags
  await db.query('DELETE FROM boards WHERE id = ? AND user_id = ?', [id, userId]);
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
