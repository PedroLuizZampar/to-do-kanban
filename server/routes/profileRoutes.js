const express = require('express');
const router = express.Router();
const multer = require('multer');
const { auth } = require('../middleware/auth');
const profileController = require('../controllers/profileController');

// Upload em memória para salvar no banco como blob
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Todas as rotas exigem autenticação
router.use(auth);

// Atualizar perfil (username/email/senha)
router.put('/', profileController.updateProfile);

// Upload de avatar
router.post('/avatar', upload.single('avatar'), profileController.uploadAvatar);

// Remover avatar
router.delete('/avatar', profileController.deleteAvatar);

// Obter avatar atual do usuário autenticado (stream do banco)
router.get('/avatar', profileController.getOwnAvatar);

// Excluir conta
router.delete('/', profileController.deleteAccount);

module.exports = router;
