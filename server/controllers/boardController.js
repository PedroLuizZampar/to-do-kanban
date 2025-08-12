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
      
      // Verifica se o board existe e se o usuário tem acesso
      const board = await Board.get(id, userId);
      if (!board) return res.status(404).json({ error: 'Quadro não encontrado' });

      // Checa duplicidade por usuário dono do board (evita conflito só dentro do mesmo dono)
      const all = await Board.list(board.user_id);
      if (all.filter(b => b.id !== id).find(b => b.name.toLowerCase() === name.toLowerCase()))
        return res.status(409).json({ error: 'Já existe um quadro com esse nome para o dono do quadro' });

      const updated = await Board.update(id, { name, description, color }, userId);
      if (!updated) return res.status(403).json({ error: 'Sem permissão para editar este quadro' });
      res.json(updated);
    } catch (e) { next(e); }
  },
  
  async remove(req, res, next) {
    try {
      const id = Number(req.params.id);
      const userId = req.userId; // Definido pelo middleware auth
      
  // Verifica se o board existe e se o usuário tem acesso
  const board = await Board.get(id, userId);
  if (!board) return res.status(404).json({ error: 'Quadro não encontrado' });

  const ok = await Board.remove(id, userId);
  if (!ok) return res.status(403).json({ error: 'Sem permissão para excluir este quadro' });
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
  // Compartilhamento: lista usuários disponíveis para convite
  async listUsersToInvite(req, res, next) {
    try {
      const boardId = Number(req.params.id);
      const userId = req.userId;
      // Se modo=members, retorna lista de membros do quadro
      if ((req.query.mode || '') === 'members') {
        const members = await Board.listMembers(boardId, userId);
        return res.json(members);
      }
      const users = await Board.listUsersToInvite(boardId, userId);
      res.json(users);
    } catch (e) { next(e); }
  },
  // Envia convites para usuários
  async invite(req, res, next) {
    try {
      const boardId = Number(req.params.id);
      const userId = req.userId;
      const { userIds } = req.body; // [ids]
      if (!Array.isArray(userIds) || !userIds.length) return res.status(400).json({ error: 'userIds é obrigatório' });
      await Board.inviteUsers(boardId, userIds.map(Number), userId);
      res.status(204).end();
    } catch (e) { next(e); }
  },
  // Inbox de convites do usuário atual
  async inbox(req, res, next) {
    try {
      const userId = req.userId;
      const items = await Board.listInbox(userId);
      res.json(items);
    } catch (e) { next(e); }
  },
  // Responder convite (aceitar/recusar)
  async respondInvite(req, res, next) {
    try {
      const userId = req.userId;
      const inviteId = Number(req.params.inviteId);
      const { accept } = req.body; // boolean
      await Board.respondInvite(inviteId, userId, !!accept);
      res.status(204).end();
    } catch (e) { next(e); }
  },
};
