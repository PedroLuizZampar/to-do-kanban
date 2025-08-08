const Subtask = require('../models/Subtask');

module.exports = {
  async list(req, res, next) {
    try {
  const taskId = Number(req.params.taskId);
  if (!Number.isFinite(taskId)) return res.status(400).json({ error: 'taskId inválido' });
      const data = await Subtask.list(taskId);
      res.json(data);
    } catch (e) { next(e); }
  },
  async create(req, res, next) {
    try {
  const taskId = Number(req.params.taskId);
  if (!Number.isFinite(taskId)) return res.status(400).json({ error: 'taskId inválido' });
      const { title } = req.body;
      if (!title || !title.trim()) return res.status(400).json({ error: 'title é obrigatório' });
      const data = await Subtask.create(taskId, title.trim());
      res.status(201).json(data);
    } catch (e) { next(e); }
  },
  async update(req, res, next) {
    try {
      const id = Number(req.params.id);
      const { title, done } = req.body;
      const data = await Subtask.update(id, { title, done });
      if (!data) return res.status(404).json({ error: 'Subtarefa não encontrada' });
      res.json(data);
    } catch (e) { next(e); }
  },
  async remove(req, res, next) {
    try {
      const id = Number(req.params.id);
      await Subtask.remove(id);
      res.status(204).end();
    } catch (e) { next(e); }
  },
  async reorder(req, res, next) {
    try {
  const taskId = Number(req.params.taskId);
  if (!Number.isFinite(taskId)) return res.status(400).json({ error: 'taskId inválido' });
      const { order } = req.body;
      if (!Array.isArray(order)) return res.status(400).json({ error: 'order deve ser um array de IDs' });
      const data = await Subtask.reorder(taskId, order.map(Number));
      res.json(data);
    } catch (e) { next(e); }
  }
};
