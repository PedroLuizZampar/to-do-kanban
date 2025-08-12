const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Secret para JWT
const JWT_SECRET = process.env.JWT_SECRET || 'kanban-app-secret-key-default';

// Tempo de expiração do token
const JWT_EXPIRES_IN = '7d'; // 7 dias

module.exports = {
  async register(req, res, next) {
    try {
      const { username, email, password } = req.body;
      
      // Validação básica
      if (!username) return res.status(400).json({ error: 'Username é obrigatório' });
      if (!email) return res.status(400).json({ error: 'Email é obrigatório' });
      if (!password || password.length < 6) return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });
      
  // Permite e-mails duplicados. Ainda bloqueia username duplicado.
  const existingUser = await User.findByUsername(username);
  if (existingUser) return res.status(409).json({ error: 'Este username já está em uso' });
      
      // Cria usuário
      const user = await User.create({ username, email, password });
      
      // Gera token
      const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
      
      res.status(201).json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          is_admin: user.is_admin === 1 || user.is_admin === true,
          avatar_url: user.avatar_url || null
        },
        token
      });
    } catch (e) {
      next(e);
    }
  },
  
  async login(req, res, next) {
    try {
      const { username, password } = req.body;
      
      // Validação básica
      if (!username) return res.status(400).json({ error: 'Username ou email é obrigatório' });
      if (!password) return res.status(400).json({ error: 'Senha é obrigatória' });
      
      // Busca usuário
      const user = await User.findByCredentials(username);
      if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });
      
      // Verifica senha
      const isMatch = await User.verifyPassword(user, password);
      if (!isMatch) return res.status(401).json({ error: 'Credenciais inválidas' });
      
      // Gera token
      const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
      
      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          is_admin: user.is_admin === 1 || user.is_admin === true,
          avatar_url: user.avatar_url || null
        },
        token
      });
    } catch (e) {
      next(e);
    }
  },
  
  async getProfile(req, res) {
    // O middleware de auth já garante que o usuário existe
    res.json({
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        is_admin: req.user.is_admin === 1 || req.user.is_admin === true,
        avatar_url: req.user.avatar_url || null
      }
    });
  }
};
