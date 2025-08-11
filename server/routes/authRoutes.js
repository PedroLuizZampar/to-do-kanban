const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { auth } = require('../middleware/auth');

// Registro de novos usuários
router.post('/register', authController.register);

// Login
router.post('/login', authController.login);

// Obter perfil do usuário autenticado
router.get('/profile', auth, authController.getProfile);

module.exports = router;
