const Category = require('../models/Category');

module.exports = {
	async list(req, res, next) {
		try {
			const boardId = req.query.boardId ? Number(req.query.boardId) : undefined;
			if (!boardId) return res.json([]);
			const data = await Category.list(boardId);
			res.json(data);
		} catch (e) { next(e); }
	},
		async create(req, res, next) {
		try {
				let { name, description, color, board_id } = req.body;
				if (!board_id && req.query.boardId) board_id = Number(req.query.boardId);
				if (!board_id) return res.status(400).json({ error: 'board_id é obrigatório' });
			if (!name) return res.status(400).json({ error: 'name é obrigatório' });
				// unicidade por board
				const all = await Category.list(board_id);
				if (all.find(c => c.name.toLowerCase() === name.toLowerCase())) return res.status(409).json({ error: 'Já existe uma categoria com esse nome neste quadro' });
				const data = await Category.create({ name, description, color, board_id });
			res.status(201).json(data);
		} catch (e) { next(e); }
	},
		async update(req, res, next) {
		try {
			const id = Number(req.params.id);
				const { name, description, color } = req.body;
			if (!name) return res.status(400).json({ error: 'name é obrigatório' });
				// precisa do board_id do registro atual
				const current = await Category.get(id);
				const all = await Category.list(current?.board_id);
				if (all.find(c => c.id !== id && c.name.toLowerCase() === name.toLowerCase())) return res.status(409).json({ error: 'Já existe uma categoria com esse nome neste quadro' });
				const data = await Category.update(id, { name, description, color });
			res.json(data);
		} catch (e) { next(e); }
	},
	async remove(req, res, next) {
		try {
			const id = Number(req.params.id);
			await Category.remove(id);
			res.status(204).end();
		} catch (e) { next(e); }
	},
	async reorder(req, res, next) {
		try {
			const { order } = req.body; // [id...]
			const boardId = req.query.boardId ? Number(req.query.boardId) : undefined;
			if (!Array.isArray(order)) return res.status(400).json({ error: 'order deve ser um array de IDs' });
			const data = await Category.reorder(order.map(Number), boardId);
			res.json(data);
		} catch (e) { next(e); }
	},
};
