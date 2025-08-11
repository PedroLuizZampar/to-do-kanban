const db = require('./database');
const bcrypt = require('bcryptjs');

// Lista todos os usuários (apenas para admin, não usado na UI principal)
async function list() {
  const rows = await db.query('SELECT id, username, email, created_at FROM users');
  return rows;
}

// Busca usuário por ID
async function get(id) {
  const rows = await db.query('SELECT id, username, email, created_at FROM users WHERE id = ?', [id]);
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

module.exports = { 
  list,
  get,
  findByCredentials,
  create,
  verifyPassword
};
