const db = require('./database');

async function list(boardId) {
	if (boardId) return db.query('SELECT * FROM tags WHERE board_id = ? ORDER BY position ASC, id ASC', [boardId]);
	return db.query('SELECT * FROM tags ORDER BY position ASC, id ASC');
}

async function get(id) {
	const rows = await db.query('SELECT * FROM tags WHERE id = ?', [id]);
	return rows[0] || null;
}

async function create({ name, description, color, board_id }) {
	// Define position como último dentro do board
	let pos = 1;
	if (board_id) {
		const rows = await db.query('SELECT COALESCE(MAX(position),0) AS maxp FROM tags WHERE board_id = ?', [board_id]);
		pos = (rows[0]?.maxp || 0) + 1;
	}
	const result = await db.query('INSERT INTO tags (name, description, color, board_id, position) VALUES (?,?,?,?,?)', [name, description || null, color || null, board_id || null, pos]);
	return get(result.insertId);
}

async function update(id, { name, description, color }) {
	await db.query('UPDATE tags SET name = ?, description = ?, color = ? WHERE id = ?', [name, description || null, color || null, id]);
	return get(id);
}

async function remove(id) {
	await db.query('DELETE FROM tags WHERE id = ?', [id]);
}
async function reorder(boardId, orderIds) {
	// Compacta e aplica posições apenas para IDs desse board
	const existing = await db.query('SELECT id FROM tags WHERE board_id = ? ORDER BY position ASC, id ASC', [boardId]);
	const set = new Set(existing.map(r => r.id));
	let pos = 1;
	for (const id of orderIds) {
		if (set.has(id)) await db.query('UPDATE tags SET position = ? WHERE id = ?', [pos++, id]);
	}
	// compact leftovers
	const leftovers = await db.query('SELECT id FROM tags WHERE board_id = ? ORDER BY position ASC, id ASC', [boardId]);
	pos = 1;
	for (const r of leftovers) await db.query('UPDATE tags SET position = ? WHERE id = ?', [pos++, r.id]);
	return list(boardId);
}

module.exports = { list, get, create, update, remove, reorder };
