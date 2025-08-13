'use strict';

const User = require('../models/User');
const fs = require('fs');
const path = require('path');

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
      const newRelPath = '/uploads/' + req.file.filename;

      // Guarda caminho antigo para limpar após atualizar no banco
      const currentUser = await User.get(userId);
      const oldRel = currentUser?.avatar_url;

      let updated;
      try {
        updated = await User.setAvatar(userId, newRelPath);
      } catch (e) {
        // Falhou atualizar no banco: remove arquivo novo para evitar lixo
        const newAbs = path.join(__dirname, '..', '..', newRelPath.replace(/^\//, ''));
        try { if (fs.existsSync(newAbs)) fs.unlinkSync(newAbs); } catch {}
        throw e;
      }

      // Se havia avatar antigo, apaga arquivo físico
      if (oldRel && oldRel !== newRelPath) {
        const oldAbs = path.join(__dirname, '..', '..', oldRel.replace(/^\//, ''));
        try { if (fs.existsSync(oldAbs)) fs.unlinkSync(oldAbs); } catch {}
      }

      res.json({ avatar_url: updated.avatar_url });
    } catch (e) { next(e); }
  },

  async deleteAvatar(req, res, next) {
    try {
      const userId = req.userId;
      const user = await User.get(userId);
      const current = user?.avatar_url;

      // Apaga arquivo físico se existir e for caminho interno de uploads
      if (current && typeof current === 'string') {
        const rel = current.replace(/^\//, ''); // remove leading '/'
        const abs = path.join(__dirname, '..', '..', rel);
        try {
          if (fs.existsSync(abs)) fs.unlinkSync(abs);
        } catch (_) { /* ignora falhas ao deletar arquivo */ }
      }

      // Limpa no banco
      await User.setAvatar(userId, null);
      res.json({ avatar_url: null });
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
