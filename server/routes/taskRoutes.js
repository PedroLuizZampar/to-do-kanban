const express = require('express');
const ctrl = require('../controllers/taskController');
const router = express.Router();

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

router.post('/:id/move', ctrl.move);
router.post('/reorder/:categoryId', ctrl.reorder);
router.post('/:id/tags', ctrl.setTags);
router.post('/:id/assignees', ctrl.setAssignees);

module.exports = router;
