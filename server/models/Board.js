const db = require('./database');

async function list() {
  return db.query('SELECT * FROM boards ORDER BY position ASC, id ASC');
}

async function get(id) {
  const rows = await db.query('SELECT * FROM boards WHERE id = ?', [id]);
  return rows[0] || null;
}

async function create({ name, description, color }) {
  const result = await db.query('INSERT INTO boards (name, description, color) VALUES (?,?,?)', [name, description || null, color || null]);
  return get(result.insertId);
}

async function update(id, { name, description, color }) {
  await db.query('UPDATE boards SET name = ?, description = ?, color = ? WHERE id = ?', [name, description || null, color || null, id]);
  return get(id);
}

async function remove(id) {
  // Cascata removerá categories->tasks e tags
  await db.query('DELETE FROM boards WHERE id = ?', [id]);
}
async function reorder(orderIds) {
  const existing = await db.query('SELECT id FROM boards ORDER BY position ASC, id ASC');
  const set = new Set(existing.map(r => r.id));
  let pos = 1;
  for (const bid of orderIds) {
    if (set.has(bid)) await db.query('UPDATE boards SET position = ? WHERE id = ?', [pos++, bid]);
  }
  const leftovers = await db.query('SELECT id FROM boards ORDER BY position ASC, id ASC');
  pos = 1;
  for (const r of leftovers) await db.query('UPDATE boards SET position = ? WHERE id = ?', [pos++, r.id]);
  return list();
}

module.exports = { list, get, create, update, remove, reorder };
