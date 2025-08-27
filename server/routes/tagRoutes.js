const express = require('express');
const ctrl = require('../controllers/tagController');
const router = express.Router();

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.post('/reorder', ctrl.reorder);

module.exports = router;
