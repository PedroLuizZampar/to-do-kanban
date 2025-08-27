const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const ctrl = require('../controllers/templateController');

// Rotas com caminhos fixos devem vir antes dos parâmetros dinâmicos
router.get('/', auth, ctrl.list);
router.delete('/default', auth, ctrl.clearDefault);
router.post('/:id/default', auth, ctrl.setDefault);
router.post('/reorder', auth, ctrl.reorder);

router.get('/:id', auth, ctrl.get);
router.post('/', auth, ctrl.create);
router.put('/:id', auth, ctrl.update);
router.delete('/:id', auth, ctrl.remove);

module.exports = router;
