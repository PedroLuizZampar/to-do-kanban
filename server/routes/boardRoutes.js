const express = require('express');
const ctrl = require('../controllers/boardController');
const router = express.Router();

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.post('/reorder', ctrl.reorder);

// Compartilhamento
router.get('/:id/invite/users', ctrl.listUsersToInvite);
router.post('/:id/invite', ctrl.invite);
router.get('/inbox', ctrl.inbox);
router.post('/invite/:inviteId/respond', ctrl.respondInvite);

module.exports = router;
