const db = require('./database');

async function list(boardId) {
	let tasks;
	if (boardId) {
		tasks = await db.query(
			'SELECT t.* FROM tasks t INNER JOIN categories c ON c.id = t.category_id WHERE c.board_id = ? ORDER BY t.position ASC, t.id ASC',
			[boardId]
		);
	} else {
		tasks = await db.query('SELECT * FROM tasks ORDER BY position ASC, id ASC');
	}
	for (const t of tasks) {
		t.tags = await db.query(
			'SELECT tg.* FROM tags tg INNER JOIN task_tags tt ON tt.tag_id = tg.id WHERE tt.task_id = ? ORDER BY tg.name ASC',
			[t.id]
		);
		// subtarefas
		t.subtasks = await db.query(
			'SELECT * FROM subtasks WHERE task_id = ? ORDER BY position ASC, id ASC',
			[t.id]
		);
		// assignees
		t.assignees = await db.query(
			`SELECT u.id, u.username, u.email, u.avatar_url
			 FROM task_assignees ta JOIN users u ON u.id = ta.user_id WHERE ta.task_id = ? ORDER BY u.username ASC`,
			[t.id]
		);
	}
	return tasks;
}

async function listByCategory(categoryId) {
	const tasks = await db.query('SELECT * FROM tasks WHERE category_id = ? ORDER BY position ASC, id ASC', [categoryId]);
	for (const t of tasks) {
		t.tags = await db.query(
			'SELECT tg.* FROM tags tg INNER JOIN task_tags tt ON tt.tag_id = tg.id WHERE tt.task_id = ? ORDER BY tg.name ASC',
			[t.id]
		);
	}
	return tasks;
}

async function get(id) {
	const rows = await db.query('SELECT * FROM tasks WHERE id = ?', [id]);
	if (!rows[0]) return null;
	const task = rows[0];
	task.tags = await db.query(
		'SELECT tg.* FROM tags tg INNER JOIN task_tags tt ON tt.tag_id = tg.id WHERE tt.task_id = ? ORDER BY tg.name ASC',
		[id]
	);
	// subtarefas
	task.subtasks = await db.query('SELECT * FROM subtasks WHERE task_id = ? ORDER BY position ASC, id ASC', [id]);
	// assignees
	task.assignees = await db.query(
		`SELECT u.id, u.username, u.email, u.avatar_url
		 FROM task_assignees ta JOIN users u ON u.id = ta.user_id WHERE ta.task_id = ? ORDER BY u.username ASC`,
		[id]
	);
	return task;
}

async function create({ title, description, category_id }) {
	let position = 1;
	if (category_id) {
		const max = await db.query('SELECT COALESCE(MAX(position),0) AS maxp FROM tasks WHERE category_id = ?', [category_id]);
		position = (max[0]?.maxp || 0) + 1;
	}
	const result = await db.query('INSERT INTO tasks (title, description, category_id, position) VALUES (?,?,?,?)', [title, description || null, category_id, position]);
	return get(result.insertId);
}

async function update(id, { title, description, category_id }) {
	await db.query('UPDATE tasks SET title = ?, description = ?, category_id = ? WHERE id = ?', [title, description || null, category_id, id]);
	return get(id);
}

async function remove(id) {
	await db.query('DELETE FROM tasks WHERE id = ?', [id]);
}

async function move(id, toCategoryId, toPosition) {
	// Reposiciona task na nova categoria e reorganiza posições
	const task = await get(id);
	if (!task) return null;

	// compacta posições na categoria antiga
	if (task.category_id) {
		const others = await db.query('SELECT id FROM tasks WHERE category_id = ? AND id <> ? ORDER BY position ASC', [task.category_id, id]);
		let p = 1;
		for (const o of others) await db.query('UPDATE tasks SET position = ? WHERE id = ?', [p++, o.id]);
	}

	// define posição na categoria destino
	const dest = await db.query('SELECT id FROM tasks WHERE category_id = ? ORDER BY position ASC', [toCategoryId]);
	let p = 1;
	const clamped = Math.max(1, Math.min(toPosition || dest.length + 1, dest.length + 1));
	for (let i = 0; i < dest.length + 1; i++) {
		if (i + 1 === clamped) {
			await db.query('UPDATE tasks SET category_id = ?, position = ? WHERE id = ?', [toCategoryId, p++, id]);
		}
		if (i < dest.length) {
			await db.query('UPDATE tasks SET position = ? WHERE id = ?', [p++, dest[i].id]);
		}
	}
	return get(id);
}

async function reorder(categoryId, orderIds) {
	const existing = await db.query('SELECT id FROM tasks WHERE category_id = ? ORDER BY position ASC', [categoryId]);
	const map = new Set(existing.map((r) => r.id));
	let pos = 1;
	for (const tid of orderIds) {
		if (map.has(tid)) await db.query('UPDATE tasks SET position = ? WHERE id = ?', [pos++, tid]);
	}
	// compact for any leftovers
	const leftovers = await db.query('SELECT id FROM tasks WHERE category_id = ? ORDER BY position ASC', [categoryId]);
	pos = 1;
	for (const r of leftovers) await db.query('UPDATE tasks SET position = ? WHERE id = ?', [pos++, r.id]);
	return listByCategory(categoryId);
}

async function setTags(taskId, tagIds) {
	await db.query('DELETE FROM task_tags WHERE task_id = ?', [taskId]);
	for (const tid of tagIds || []) {
		await db.query('INSERT INTO task_tags (task_id, tag_id) VALUES (?,?) ON CONFLICT (task_id, tag_id) DO NOTHING', [taskId, tid]);
	}
	return get(taskId);
}

async function setAssignees(taskId, userIds) {
	await db.query('DELETE FROM task_assignees WHERE task_id = ?', [taskId]);
	for (const uid of userIds || []) {
		await db.query('INSERT INTO task_assignees (task_id, user_id) VALUES (?,?) ON CONFLICT (task_id, user_id) DO NOTHING', [taskId, uid]);
	}
	// Criar notificações para os usuários atribuídos
	const task = await get(taskId);
	// Descobrir board_id a partir da categoria
	const boardRow = await db.query('SELECT c.board_id FROM tasks t JOIN categories c ON c.id = t.category_id WHERE t.id = ?', [taskId]);
	const boardId = boardRow[0]?.board_id || null;
	for (const uid of userIds || []) {
		await db.query('INSERT INTO user_notifications (user_id, type, message, board_id, task_id) VALUES (?,?,?,?,?)', [uid, 'assignment', `Você foi atribuído à tarefa "${task.title}".`, boardId, taskId]);
	}
	return get(taskId);
}

module.exports = { list, listByCategory, get, create, update, remove, move, reorder, setTags, setAssignees };
