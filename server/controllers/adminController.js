'use strict';

const User = require('../models/User');

module.exports = {
  async listUsers(req, res, next) {
    try {
      const users = await User.list();
      res.json(users);
    } catch (e) { next(e); }
  },

  async resetPassword(req, res, next) {
    try {
      const id = Number(req.params.id);
      if (!id) return res.status(400).json({ error: 'ID inválido' });
      // Permitimos resetar qualquer usuário
      const updated = await User.adminResetPassword(id);
      res.json({ id: updated.id, username: updated.username, email: updated.email });
    } catch (e) { next(e); }
  },

  async removeUser(req, res, next) {
    try {
      const id = Number(req.params.id);
      if (!id) return res.status(400).json({ error: 'ID inválido' });
      // Evita o admin remover a si mesmo
      if (id === req.userId) return res.status(400).json({ error: 'Não é possível remover a si mesmo' });
      await User.adminRemoveUser(id);
      res.status(204).end();
    } catch (e) { next(e); }
  }
};
