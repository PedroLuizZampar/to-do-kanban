const db = require('./database');
const bcrypt = require('bcryptjs');

// Lista todos os usuários (apenas para admin)
async function list() {
  const rows = await db.query('SELECT id, username, email, is_admin, avatar_url, created_at FROM users ORDER BY id ASC');
  return rows;
}

// Busca usuário por ID
async function get(id) {
  const rows = await db.query('SELECT id, username, email, is_admin, avatar_url, password, created_at FROM users WHERE id = ?', [id]);
  return rows[0] || null;
}

// Busca usuário por email ou username (para login)
async function findByCredentials(usernameOrEmail) {
  const rows = await db.query(
    'SELECT * FROM users WHERE username = ? OR email = ?',
    [usernameOrEmail, usernameOrEmail]
  );
  return rows[0] || null;
}

async function findByUsername(username) {
  const rows = await db.query('SELECT * FROM users WHERE username = ? LIMIT 1', [username]);
  return rows[0] || null;
}

// Cria novo usuário
async function create({ username, email, password }) {
  // Gera hash seguro
  const hashedPassword = await bcrypt.hash(password, 12);
  
  const result = await db.query(
    'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
    [username, email, hashedPassword]
  );
  
  return get(result.insertId);
}

// Verifica credenciais
async function verifyPassword(user, password) {
  return bcrypt.compare(password, user.password);
}

// Atualiza perfil (username, email, password opcional)
async function updateProfile(id, { username, email, password }) {
  const fields = [];
  const values = [];
  if (username != null) { fields.push('username = ?'); values.push(username); }
  if (email != null) { fields.push('email = ?'); values.push(email); }
  if (password != null && password !== '') {
    const hashed = await bcrypt.hash(password, 12);
    fields.push('password = ?');
    values.push(hashed);
  }
  if (fields.length === 0) return get(id);
  values.push(id);
  await db.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
  return get(id);
}

// Atualiza avatar (aceita null para remover)
async function setAvatar(id, avatarUrl) {
  await db.query('UPDATE users SET avatar_url = ? WHERE id = ?', [avatarUrl, id]);
  return get(id);
}

// Salva avatar como blob no banco e atualiza URL para endpoint
async function setAvatarBlob(id, buffer, mime, endpointUrl) {
  const url = endpointUrl || `/api/users/${id}/avatar`;
  await db.query('UPDATE users SET avatar_blob = ?, avatar_mime = ?, avatar_url = ? WHERE id = ?', [buffer, mime, url, id]);
  return get(id);
}

async function clearAvatar(id) {
  await db.query('UPDATE users SET avatar_blob = NULL, avatar_mime = NULL, avatar_url = NULL WHERE id = ?', [id]);
  return get(id);
}

async function getAvatarBlob(id) {
  const rows = await db.query('SELECT avatar_blob, avatar_mime FROM users WHERE id = ?', [id]);
  return rows[0] || null;
}

// Admin: redefinir senha para 'mudar123'
async function adminResetPassword(targetUserId) {
  const hashed = await bcrypt.hash('mudar123', 12);
  await db.query('UPDATE users SET password = ? WHERE id = ?', [hashed, targetUserId]);
  return get(targetUserId);
}

// Admin: remover usuário (cascata via FK)
async function adminRemoveUser(targetUserId) {
  await db.query('DELETE FROM users WHERE id = ?', [targetUserId]);
  return true;
}

module.exports = { 
  list,
  get,
  findByCredentials,
  findByUsername,
  create,
  verifyPassword,
  updateProfile,
  setAvatar,
  setAvatarBlob,
  clearAvatar,
  getAvatarBlob,
  adminResetPassword,
  adminRemoveUser
};
