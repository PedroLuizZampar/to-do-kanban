'use strict';

const User = require('../models/User');

module.exports = {
  async updateProfile(req, res, next) {
    try {
      const userId = req.userId;
      const { username, email, password } = req.body;
      // Se username mudou, garantir que não existe outro igual
      if (username && username !== req.user.username) {
        const existing = await User.findByUsername(username);
        if (existing && existing.id !== userId) return res.status(409).json({ error: 'Este username já está em uso' });
      }
      const updated = await User.updateProfile(userId, { username, email, password });
      res.json({
        user: {
          id: updated.id,
          username: updated.username,
          email: updated.email,
          is_admin: updated.is_admin === 1 || updated.is_admin === true,
          avatar_url: updated.avatar_url || null
        }
      });
    } catch (e) { next(e); }
  },

  async uploadAvatar(req, res, next) {
    try {
      if (!req.file) return res.status(400).json({ error: 'Arquivo não enviado' });
      const userId = req.userId;
      const relPath = '/uploads/' + req.file.filename;
      const updated = await User.setAvatar(userId, relPath);
      res.json({ avatar_url: updated.avatar_url });
    } catch (e) { next(e); }
  },

  async deleteAccount(req, res, next) {
    try {
      const userId = req.userId;
      await User.adminRemoveUser(userId);
      res.status(204).end();
    } catch (e) { next(e); }
  }
};
