const express = require('express');
const router = express.Router({ mergeParams: true });
const multer = require('multer');
const { auth } = require('../middleware/auth');
const attachmentController = require('../controllers/attachmentController');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(auth);

// Lista anexos
router.get('/', attachmentController.list);
// Upload de imagem
router.post('/', upload.single('file'), attachmentController.upload);
// Download/visualização inline
router.get('/:attachmentId', attachmentController.download);
// Remover
router.delete('/:attachmentId', attachmentController.remove);

module.exports = router;
