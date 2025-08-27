const Tag = require('../models/Tag');

module.exports = {
	async list(req, res, next) {
		try {
				const boardId = req.query.boardId ? Number(req.query.boardId) : undefined;
				const data = await Tag.list(boardId);
			res.json(data);
		} catch (e) { next(e); }
	},
	async create(req, res, next) {
		try {
			let { name, description, color, board_id } = req.body;
			if (!board_id && req.query.boardId) board_id = Number(req.query.boardId);
			if (!name) return res.status(400).json({ error: 'name é obrigatório' });
			const all = await Tag.list(board_id);
			if (all.find(t => t.name.toLowerCase() === name.toLowerCase())) return res.status(409).json({ error: 'Já existe uma tag com esse nome neste quadro' });
			const data = await Tag.create({ name, description, color, board_id });
			res.status(201).json(data);
		} catch (e) { next(e); }
	},
	async update(req, res, next) {
		try {
			const id = Number(req.params.id);
			const { name, description, color } = req.body;
			if (!name) return res.status(400).json({ error: 'name é obrigatório' });
			const current = await Tag.get(id);
			const all = await Tag.list(current?.board_id);
			if (all.find(t => t.id !== id && t.name.toLowerCase() === name.toLowerCase())) return res.status(409).json({ error: 'Já existe uma tag com esse nome neste quadro' });
			const data = await Tag.update(id, { name, description, color });
			res.json(data);
		} catch (e) { next(e); }
	},
	async remove(req, res, next) {
		try {
			const id = Number(req.params.id);
			await Tag.remove(id);
			res.status(204).end();
		} catch (e) { next(e); }
	},
	async reorder(req, res, next) {
		try {
			const boardId = Number(req.body.boardId || req.query.boardId);
			const order = req.body.order;
			if (!boardId || !Array.isArray(order)) return res.status(400).json({ error: 'boardId e order[] são obrigatórios' });
			const rows = await Tag.reorder(boardId, order.map(Number));
			res.json(rows);
		} catch (e) { next(e); }
	},
};
