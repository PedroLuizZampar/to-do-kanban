const Templates = require('../models/Template');

module.exports = {
  async list(req, res) {
    try {
      const boardId = Number(req.query.boardId || req.params.boardId || req.body.boardId);
      if (!boardId) return res.status(400).json({ error: 'boardId é obrigatório' });
      const rows = await Templates.list(boardId);
      res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message || 'Erro ao listar templates' }); }
  },
  async get(req, res) {
    try {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'id inválido' });
  const row = await Templates.get(id);
      if (!row) return res.status(404).json({ error: 'Não encontrado' });
      res.json(row);
    } catch (e) { res.status(500).json({ error: e.message || 'Erro ao obter template' }); }
  },
  async create(req, res) {
    try {
      const boardId = Number(req.body.board_id || req.body.boardId);
      const name = String(req.body.name || '').trim();
      const content = req.body.content || {};
      const isDefault = !!req.body.is_default;
      if (!boardId || !name) return res.status(400).json({ error: 'board_id e name são obrigatórios' });
      const row = await Templates.create({ board_id: boardId, name, content, is_default: isDefault });
      res.json(row);
    } catch (e) { res.status(500).json({ error: e.message || 'Erro ao criar template' }); }
  },
  async update(req, res) {
    try {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'id inválido' });
      const name = req.body.name;
      const content = req.body.content;
      const isDefault = req.body.is_default;
      const row = await Templates.update(id, { name, content, is_default: isDefault });
      res.json(row);
    } catch (e) { res.status(500).json({ error: e.message || 'Erro ao atualizar template' }); }
  },
  async remove(req, res) {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ error: 'id inválido' });
      await Templates.remove(id); res.json({ ok: true });
    }
    catch (e) { res.status(500).json({ error: e.message || 'Erro ao excluir template' }); }
  },
  async setDefault(req, res) {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ error: 'id inválido' });
      const tpl = await Templates.get(id);
      if (!tpl) return res.status(404).json({ error: 'Não encontrado' });
      const row = await Templates.setDefault(tpl.board_id, id);
      res.json(row);
    } catch (e) { res.status(500).json({ error: e.message || 'Erro ao definir padrão' }); }
  }
};

module.exports.clearDefault = async (req, res) => {
  try {
    const boardId = Number(req.query.boardId || req.body.boardId);
    if (!boardId) return res.status(400).json({ error: 'boardId é obrigatório' });
    await Templates.clearDefault(boardId);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message || 'Erro ao remover padrão' }); }
};

module.exports.reorder = async (req, res) => {
  try {
    const boardId = Number(req.body.boardId || req.query.boardId);
    const order = req.body.order;
    if (!boardId || !Array.isArray(order)) return res.status(400).json({ error: 'boardId e order[] são obrigatórios' });
    const rows = await Templates.reorder(boardId, order.map(Number));
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message || 'Erro ao reordenar templates' }); }
};
