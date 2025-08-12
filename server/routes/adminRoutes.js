const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { auth, requireAdmin } = require('../middleware/auth');

// Todas as rotas de admin exigem autenticação + admin
router.use(auth, requireAdmin);

router.get('/users', adminController.listUsers);
router.post('/users/:id/reset-password', adminController.resetPassword);
router.delete('/users/:id', adminController.removeUser);

module.exports = router;
