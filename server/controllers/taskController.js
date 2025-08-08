const Task = require('../models/Task');

module.exports = {
	async list(req, res, next) {
		try {
				const boardId = req.query.boardId ? Number(req.query.boardId) : undefined;
				const data = await Task.list(boardId);
			res.json(data);
		} catch (e) { next(e); }
	},
		async create(req, res, next) {
		try {
			const { title, description, category_id } = req.body;
				if (!title) return res.status(400).json({ error: 'title é obrigatório' });
				if (!category_id) return res.status(400).json({ error: 'category_id é obrigatório' });
			// check duplicate title within the category
			const existing = await Task.listByCategory(Number(category_id));
			if (existing.find(t => t.title.toLowerCase() === title.toLowerCase())) return res.status(409).json({ error: 'Já existe uma tarefa com esse título nesta coluna' });
			const data = await Task.create({ title, description, category_id });
			res.status(201).json(data);
		} catch (e) { next(e); }
	},
		async update(req, res, next) {
		try {
			const id = Number(req.params.id);
			const { title, description, category_id } = req.body;
				if (!title) return res.status(400).json({ error: 'title é obrigatório' });
				if (!category_id) return res.status(400).json({ error: 'category_id é obrigatório' });
			const existing = await Task.listByCategory(Number(category_id));
			if (existing.find(t => t.id !== id && t.title.toLowerCase() === title.toLowerCase())) return res.status(409).json({ error: 'Já existe uma tarefa com esse título nesta coluna' });
			const data = await Task.update(id, { title, description, category_id });
			res.json(data);
		} catch (e) { next(e); }
	},
	async remove(req, res, next) {
		try {
			const id = Number(req.params.id);
			await Task.remove(id);
			res.status(204).end();
		} catch (e) { next(e); }
	},
	async move(req, res, next) {
		try {
			const id = Number(req.params.id);
			const { toCategoryId, toPosition } = req.body;
			const data = await Task.move(id, Number(toCategoryId), Number(toPosition || 1));
			res.json(data);
		} catch (e) { next(e); }
	},
	async reorder(req, res, next) {
		try {
			const categoryId = Number(req.params.categoryId);
			const { order } = req.body; // [taskId...]
			if (!Array.isArray(order)) return res.status(400).json({ error: 'order deve ser um array de IDs' });
			const data = await Task.reorder(categoryId, order.map(Number));
			res.json(data);
		} catch (e) { next(e); }
	},
	async setTags(req, res, next) {
		try {
			const id = Number(req.params.id);
			const { tags } = req.body; // [tagId]
			if (!Array.isArray(tags)) return res.status(400).json({ error: 'tags deve ser um array de IDs' });
			const data = await Task.setTags(id, tags.map(Number));
			res.json(data);
		} catch (e) { next(e); }
	},
};
