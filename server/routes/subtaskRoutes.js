const express = require('express');
const ctrl = require('../controllers/subtaskController');
const router = express.Router({ mergeParams: true });

// /api/tasks/:taskId/subtasks
router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.post('/reorder', ctrl.reorder);

// /api/subtasks/:id
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
