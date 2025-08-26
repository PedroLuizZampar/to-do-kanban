const db = require('./database');

async function list(boardId) {
  return db.query('SELECT * FROM templates WHERE board_id = ? ORDER BY id ASC', [boardId]);
}

async function get(id) {
  const rows = await db.query('SELECT * FROM templates WHERE id = ?', [id]);
  return rows[0] || null;
}

async function create({ board_id, name, content, is_default }) {
  const res = await db.query('INSERT INTO templates (board_id, name, content, is_default) VALUES (?,?,?,?)', [board_id, name, JSON.stringify(content || {}), !!is_default]);
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

module.exports = { list, get, create, update, remove, setDefault, clearDefault };
