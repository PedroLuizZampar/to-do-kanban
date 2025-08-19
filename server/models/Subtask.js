const db = require('./database');

async function list(taskId) {
    return db.query('SELECT * FROM subtasks WHERE task_id = ? ORDER BY position ASC, id ASC', [taskId]);
}

async function create(taskId, title) {
    const max = await db.query('SELECT COALESCE(MAX(position),0) AS maxp FROM subtasks WHERE task_id = ?', [taskId]);
    const position = (max[0]?.maxp || 0) + 1;
    const r = await db.query('INSERT INTO subtasks (task_id, title, done, position) VALUES (?,?,FALSE,?)', [taskId, title, position]);
    return get(r.insertId);
}

async function get(id) {
    const rows = await db.query('SELECT * FROM subtasks WHERE id = ?', [id]);
    return rows[0] || null;
}

async function update(id, { title, done }) {
    // Allow partial updates
    const cur = await get(id);
    if (!cur) return null;
    const newTitle = typeof title === 'string' ? title : cur.title;
    const newDone = typeof done === 'boolean' ? (done ? true : false) : cur.done;
    await db.query('UPDATE subtasks SET title = ?, done = ? WHERE id = ?', [newTitle, newDone, id]);
    return get(id);
}

async function remove(id) {
    await db.query('DELETE FROM subtasks WHERE id = ?', [id]);
}

async function reorder(taskId, orderIds) {
    const existing = await db.query('SELECT id FROM subtasks WHERE task_id = ? ORDER BY position ASC, id ASC', [taskId]);
    const set = new Set(existing.map(r => r.id));
    let pos = 1;
    for (const sid of orderIds) {
        if (set.has(sid)) await db.query('UPDATE subtasks SET position = ? WHERE id = ?', [pos++, sid]);
    }
    // Compact leftovers
    const leftovers = await db.query('SELECT id FROM subtasks WHERE task_id = ? ORDER BY position ASC, id ASC', [taskId]);
    pos = 1;
    for (const r of leftovers) await db.query('UPDATE subtasks SET position = ? WHERE id = ?', [pos++, r.id]);
    return list(taskId);
}

module.exports = { list, create, get, update, remove, reorder };
