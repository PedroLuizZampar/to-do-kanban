const db = require('./database');

async function list(taskId) {
  return db.query('SELECT id, task_id, filename, mime, size_bytes, created_at FROM task_attachments WHERE task_id = ? ORDER BY id ASC', [taskId]);
}

async function create(taskId, file) {
  const { originalname, mimetype, size, buffer } = file;
  const res = await db.query('INSERT INTO task_attachments (task_id, filename, mime, size_bytes, data) VALUES (?,?,?,?,?)', [taskId, originalname || 'arquivo', mimetype || 'application/octet-stream', size || 0, buffer]);
  const id = res.insertId;
  const rows = await db.query('SELECT id, task_id, filename, mime, size_bytes, created_at FROM task_attachments WHERE id = ?', [id]);
  return rows[0];
}

async function getBlob(id) {
  const rows = await db.query('SELECT filename, mime, size_bytes, data FROM task_attachments WHERE id = ?', [id]);
  return rows[0] || null;
}

async function remove(id) {
  await db.query('DELETE FROM task_attachments WHERE id = ?', [id]);
  return true;
}

module.exports = { list, create, getBlob, remove };
