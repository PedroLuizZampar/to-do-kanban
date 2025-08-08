const Board = require('../models/Board');

module.exports = {
  async list(req, res, next) {
    try { res.json(await Board.list()); } catch (e) { next(e); }
  },
  async create(req, res, next) {
    try {
      const { name, description, color } = req.body;
      if (!name) return res.status(400).json({ error: 'name é obrigatório' });
  // checa duplicidade
  const existing = (await Board.list()).find(b => b.name.toLowerCase() === name.toLowerCase());
  if (existing) return res.status(409).json({ error: 'Já existe um quadro com esse nome' });
  const data = await Board.create({ name, description, color });
      res.status(201).json(data);
    } catch (e) { next(e); }
  },
  async update(req, res, next) {
    try {
      const id = Number(req.params.id);
      const { name, description, color } = req.body;
      if (!name) return res.status(400).json({ error: 'name é obrigatório' });
  const others = (await Board.list()).filter(b => b.id !== id);
  if (others.find(b => b.name.toLowerCase() === name.toLowerCase())) return res.status(409).json({ error: 'Já existe um quadro com esse nome' });
      res.json(await Board.update(id, { name, description, color }));
    } catch (e) { next(e); }
  },
  async remove(req, res, next) {
    try {
      const id = Number(req.params.id);
      await Board.remove(id);
      res.status(204).end();
    } catch (e) { next(e); }
  },
  async reorder(req, res, next) {
    try {
      const { order } = req.body; // [boardId]
      if (!Array.isArray(order)) return res.status(400).json({ error: 'order deve ser um array de IDs' });
      const data = await Board.reorder(order.map(Number));
      res.json(data);
    } catch (e) { next(e); }
  },
};
