const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Secret para JWT
const JWT_SECRET = process.env.JWT_SECRET || 'kanban-app-secret-key-default';

// Middleware de autenticação
const auth = async (req, res, next) => {
  try {
    // Verifica token no header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Autenticação necessária' });
    }

    const token = authHeader.split(' ')[1];
    
    // Verifica token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Busca usuário
    const user = await User.get(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }
    
    // Adiciona usuário ao request
    req.user = user;
    req.userId = user.id;
    
    next();
  } catch (e) {
    if (e.name === 'JsonWebTokenError' || e.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token inválido ou expirado' });
    }
    res.status(500).json({ error: 'Erro interno de servidor' });
  }
};

module.exports = { auth };
