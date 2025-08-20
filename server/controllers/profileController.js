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
      const buffer = req.file.buffer;
      const mime = req.file.mimetype || 'application/octet-stream';

  // Salva blob e mimetype; avatar_url passa a apontar para endpoint público por usuário
  const endpointUrl = `/api/users/${userId}/avatar`;
  const updated = await User.setAvatarBlob(userId, buffer, mime, endpointUrl);
      res.json({ avatar_url: updated.avatar_url });
    } catch (e) { next(e); }
  },

  async deleteAvatar(req, res, next) {
    try {
      const userId = req.userId;
      await User.clearAvatar(userId);
      res.json({ avatar_url: null });
    } catch (e) { next(e); }
  },

  async getOwnAvatar(req, res, next) {
    try {
      const userId = req.userId;
  const data = await User.getAvatarBlob(userId);
  if (!data || !data.avatar_blob) return res.status(404).end();
  const buf = Buffer.isBuffer(data.avatar_blob) ? data.avatar_blob : Buffer.from(data.avatar_blob);
  res.setHeader('Content-Type', data.avatar_mime || 'application/octet-stream');
  res.setHeader('Content-Length', buf.length);
      // cache curto para evitar piscar, invalidado quando cliente atualiza o perfil
      res.setHeader('Cache-Control', 'private, max-age=60');
  return res.end(buf);
    } catch (e) { next(e); }
  },

  async getAvatarByUserId(req, res, next) {
    try {
      const userId = Number(req.params.id);
      if (!Number.isInteger(userId)) return res.status(400).json({ error: 'id inválido' });
  const data = await User.getAvatarBlob(userId);
  if (!data || !data.avatar_blob) return res.status(404).end();
  const buf = Buffer.isBuffer(data.avatar_blob) ? data.avatar_blob : Buffer.from(data.avatar_blob);
  res.setHeader('Content-Type', data.avatar_mime || 'application/octet-stream');
  res.setHeader('Content-Length', buf.length);
  res.setHeader('Cache-Control', 'public, max-age=300');
  return res.end(buf);
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
