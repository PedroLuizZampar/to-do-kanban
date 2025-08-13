const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { auth } = require('../middleware/auth');
const profileController = require('../controllers/profileController');

// Configuração de upload
const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `avatar_${req.userId}_${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

// Todas as rotas exigem autenticação
router.use(auth);

// Atualizar perfil (username/email/senha)
router.put('/', profileController.updateProfile);

// Upload de avatar
router.post('/avatar', upload.single('avatar'), profileController.uploadAvatar);

// Remover avatar
router.delete('/avatar', profileController.deleteAvatar);

// Excluir conta
router.delete('/', profileController.deleteAccount);

module.exports = router;
