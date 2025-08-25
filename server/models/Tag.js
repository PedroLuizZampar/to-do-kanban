const db = require('./database');

async function list(boardId) {
	if (boardId) return db.query('SELECT * FROM tags WHERE board_id = ? ORDER BY created_at ASC, id ASC', [boardId]);
	return db.query('SELECT * FROM tags ORDER BY created_at ASC, id ASC');
}

async function get(id) {
	const rows = await db.query('SELECT * FROM tags WHERE id = ?', [id]);
	return rows[0] || null;
}

async function create({ name, description, color, board_id }) {
	const result = await db.query('INSERT INTO tags (name, description, color, board_id) VALUES (?,?,?,?)', [name, description || null, color || null, board_id || null]);
	return get(result.insertId);
}

async function update(id, { name, description, color }) {
	await db.query('UPDATE tags SET name = ?, description = ?, color = ? WHERE id = ?', [name, description || null, color || null, id]);
	return get(id);
}

async function remove(id) {
	await db.query('DELETE FROM tags WHERE id = ?', [id]);
}

module.exports = { list, get, create, update, remove };
