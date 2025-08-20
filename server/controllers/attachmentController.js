'use strict';

const Attachment = require('../models/Attachment');
const Task = require('../models/Task');

module.exports = {
  async list(req, res, next) {
    try {
      const taskId = Number(req.params.taskId);
      if (!Number.isInteger(taskId)) return res.status(400).json({ error: 'taskId inválido' });
      // valida acesso à task pelo board da categoria
      const task = await Task.get(taskId);
      if (!task) return res.status(404).json({ error: 'Tarefa não encontrada' });
      // TODO: validar acesso do req.userId ao board se necessário
  const items = await Attachment.list(taskId);
  // incluir URL pública para exibição direta
  const withUrls = items.map(i => ({ ...i, url: `/api/attachments/${i.id}` }));
  res.json(withUrls);
    } catch (e) { next(e); }
  },

  async upload(req, res, next) {
    try {
      const taskId = Number(req.params.taskId);
      if (!Number.isInteger(taskId)) return res.status(400).json({ error: 'taskId inválido' });
      if (!req.file) return res.status(400).json({ error: 'Arquivo não enviado' });
      const mime = req.file.mimetype || '';
      if (!/^image\//.test(mime)) return res.status(400).json({ error: 'Apenas imagens são permitidas' });
  const created = await Attachment.create(taskId, req.file);
  res.status(201).json({ ...created, url: `/api/attachments/${created.id}` });
    } catch (e) { next(e); }
  },

  async download(req, res, next) {
    try {
      const id = Number(req.params.attachmentId);
      if (!Number.isInteger(id)) return res.status(400).json({ error: 'id inválido' });
      const data = await Attachment.getBlob(id);
      if (!data) return res.status(404).end();
      const buf = Buffer.isBuffer(data.data) ? data.data : Buffer.from(data.data);
      res.setHeader('Content-Type', data.mime || 'application/octet-stream');
      res.setHeader('Content-Length', buf.length);
      res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(data.filename || 'imagem')}`);
      res.setHeader('Cache-Control', 'private, max-age=300');
      return res.end(buf);
    } catch (e) { next(e); }
  },

  async remove(req, res, next) {
    try {
      const id = Number(req.params.attachmentId);
      if (!Number.isInteger(id)) return res.status(400).json({ error: 'id inválido' });
      await Attachment.remove(id);
      res.status(204).end();
    } catch (e) { next(e); }
  },
};
