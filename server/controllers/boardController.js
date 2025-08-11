const Board = require('../models/Board');

module.exports = {
  async list(req, res, next) {
    try { 
      const userId = req.userId; // Definido pelo middleware auth
      res.json(await Board.list(userId)); 
    } catch (e) { next(e); }
  },
  
  async create(req, res, next) {
    try {
      const { name, description, color } = req.body;
      const userId = req.userId; // Definido pelo middleware auth
      
      if (!name) return res.status(400).json({ error: 'name é obrigatório' });
      
      // Checa duplicidade para este usuário
      const existing = (await Board.list(userId)).find(b => b.name.toLowerCase() === name.toLowerCase());
      if (existing) return res.status(409).json({ error: 'Já existe um quadro com esse nome' });
      
      const data = await Board.create({ name, description, color, user_id: userId });
      res.status(201).json(data);
    } catch (e) { next(e); }
  },
  
  async update(req, res, next) {
    try {
      const id = Number(req.params.id);
      const { name, description, color } = req.body;
      const userId = req.userId; // Definido pelo middleware auth
      
      if (!name) return res.status(400).json({ error: 'name é obrigatório' });
      
      // Verifica se o board existe e pertence ao usuário
      const board = await Board.get(id, userId);
      if (!board) return res.status(404).json({ error: 'Quadro não encontrado' });
      
      // Checa duplicidade para este usuário
      const others = (await Board.list(userId)).filter(b => b.id !== id);
      if (others.find(b => b.name.toLowerCase() === name.toLowerCase()))
        return res.status(409).json({ error: 'Já existe um quadro com esse nome' });
      
      res.json(await Board.update(id, { name, description, color }, userId));
    } catch (e) { next(e); }
  },
  
  async remove(req, res, next) {
    try {
      const id = Number(req.params.id);
      const userId = req.userId; // Definido pelo middleware auth
      
      // Verifica se o board existe e pertence ao usuário
      const board = await Board.get(id, userId);
      if (!board) return res.status(404).json({ error: 'Quadro não encontrado' });
      
      await Board.remove(id, userId);
      res.status(204).end();
    } catch (e) { next(e); }
  },
  
  async reorder(req, res, next) {
    try {
      const { order } = req.body; // [boardId]
      const userId = req.userId; // Definido pelo middleware auth
      
      if (!Array.isArray(order)) return res.status(400).json({ error: 'order deve ser um array de IDs' });
      const data = await Board.reorder(order.map(Number), userId);
      res.json(data);
    } catch (e) { next(e); }
  },
};
