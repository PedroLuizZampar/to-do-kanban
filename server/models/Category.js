const db = require('./database');

async function list(boardId) {
	if (boardId) return db.query('SELECT * FROM categories WHERE board_id = ? ORDER BY position ASC, id ASC', [boardId]);
	return db.query('SELECT * FROM categories ORDER BY position ASC, id ASC');
}

async function get(id) {
	const rows = await db.query('SELECT * FROM categories WHERE id = ?', [id]);
	return rows[0] || null;
}

async function create({ name, description, color, board_id }) {
	const params = [];
	let where = '';
	if (board_id) { where = ' WHERE board_id = ?'; params.push(board_id); }
	const max = await db.query(`SELECT COALESCE(MAX(position),0) AS maxp FROM categories${where}`, params);
	const position = (max[0]?.maxp || 0) + 1;
	const result = await db.query('INSERT INTO categories (name, description, color, board_id, position) VALUES (?,?,?,?,?)', [name, description || null, color || null, board_id || null, position]);
	return get(result.insertId);
}

async function update(id, { name, description, color }) {
	await db.query('UPDATE categories SET name = ?, description = ?, color = ? WHERE id = ?', [name, description || null, color || null, id]);
	return get(id);
}

async function remove(id) {
	// Remove tarefas da categoria para garantir comportamento consistente
	await db.query('DELETE FROM tasks WHERE category_id = ?', [id]);
	await db.query('DELETE FROM categories WHERE id = ?', [id]);
}

async function reorder(orderIds, boardId) {
	// orderIds: [categoryId...] in desired order
	let pos = 1;
	for (const cid of orderIds) {
		// ignore invalids silently
		if (boardId) {
			await db.query('UPDATE categories SET position = ? WHERE id = ? AND board_id = ?', [pos++, cid, boardId]);
		} else {
			await db.query('UPDATE categories SET position = ? WHERE id = ?', [pos++, cid]);
		}
	}
	return list(boardId);
}

module.exports = { list, get, create, update, remove, reorder };
