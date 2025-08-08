const Board = (() => {
	const board = document.getElementById('board');
	const tplColumn = document.getElementById('tpl-column');
	const tplCard = document.getElementById('tpl-card');

	let state = { categories: [], tasks: [], tags: [] };

	function findCategory(id) { return state.categories.find(c => c.id === id); }
	function tasksByCategory(id) { return state.tasks.filter(t => t.category_id === id).sort(sortByPosition); }

	function render() {
		board.innerHTML = '';
		state.categories.sort(sortByPosition).forEach(cat => {
			const $col = tplColumn.content.firstElementChild.cloneNode(true);
			$col.dataset.categoryId = cat.id;
			$col.querySelector('.column-title').textContent = cat.name;
			if (cat.color) $col.style.setProperty('--col', cat.color);
			const cards = $col.querySelector('.cards');
			cards.addEventListener('dragover', (e) => { e.preventDefault(); cards.classList.add('drag-over'); });
			cards.addEventListener('dragleave', () => cards.classList.remove('drag-over'));
			cards.addEventListener('drop', async (e) => {
				e.preventDefault();
				cards.classList.remove('drag-over');
				const taskId = Number(e.dataTransfer.getData('text/plain'));
				const afterId = getCardAfter(cards, e.clientY);
				const toPosition = afterId ? positionAfter(cards, afterId) : tasksByCategory(cat.id).length + 1;
				await api.post(`/api/tasks/${taskId}/move`, { toCategoryId: cat.id, toPosition });
				await load();
			});
			$col.querySelector('.btn-edit-column').addEventListener('click', () => Modal.open(categoryForm(cat)));
			$col.querySelector('.btn-delete-column').addEventListener('click', async () => {
				const ok = await $modals.confirm({
					title: 'Excluir coluna',
					message: 'Excluir esta coluna também excluirá todas as tarefas nela. Esta ação não pode ser desfeita.',
					confirmText: 'Excluir',
					cancelText: 'Cancelar'
				});
				if (!ok) return;
				await api.del(`/api/categories/${cat.id}`);
				$modals.toast.show('Coluna excluída');
				await load();
			});
			$col.querySelector('.btn-add-card').addEventListener('click', async () => {
				Modal.open(await taskForm({ category_id: cat.id }));
			});

			tasksByCategory(cat.id).forEach(t => cards.append(renderCard(t)));
			board.append($col);
		});
		// Tile de nova coluna ao final
		const addTile = el('section', { class: 'column column-add' }, [
			el('button', { class: 'btn-add-column', onclick: () => Modal.open(categoryForm()) }, [
				el('span', { class: 'material-symbols-outlined', 'aria-hidden': 'true' }, 'add'),
				'Nova coluna'
			])
		]);
		board.append(addTile);

		enableColumnDrag();
	}

	function renderCard(task) {
		const $card = tplCard.content.firstElementChild.cloneNode(true);
		$card.dataset.taskId = task.id;
		$card.querySelector('.card-title').textContent = task.title;
		// progresso de subtarefas
		const progress = $card.querySelector('.card-progress');
		const bar = $card.querySelector('.card-progress-bar');
		const txt = $card.querySelector('.card-progress-text');
		const total = (task.subtasks || []).length;
		const done = (task.subtasks || []).filter(s => s.done).length;
		if (total > 0) {
			const pct = Math.round((done / total) * 100);
			progress.classList.remove('hidden');
			const inner = document.createElement('div');
			inner.style.height = '100%';
			inner.style.width = pct + '%';
			inner.style.background = 'var(--accent)';
			inner.style.borderRadius = '999px';
			bar.innerHTML = '';
			bar.append(inner);
			txt.textContent = `${done}/${total}`;
		} else {
			progress.classList.add('hidden');
		}
		const tagsWrap = $card.querySelector('.card-tags');
		(task.tags || []).forEach(t => tagsWrap.append(pill(t.name, t.color)));
		$card.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/plain', String(task.id)));
		$card.querySelector('.btn-edit-card').addEventListener('click', async () => {
			const fresh = state.tasks.find(x => x.id === task.id);
			Modal.open(await taskForm(fresh));
		});
		$card.querySelector('.btn-delete-card').addEventListener('click', async () => {
			const ok = await $modals.confirm({ title: 'Excluir tarefa', message: 'Tem certeza que deseja excluir esta tarefa?', confirmText: 'Excluir' });
			if (!ok) return;
			await api.del(`/api/tasks/${task.id}`);
			$modals.toast.show('Tarefa excluída');
			await load();
		});
		return $card;
	}

	function getCardAfter(container, mouseY) {
		const els = [...container.querySelectorAll('.card')];
		let closest = null; let closestOffset = Number.NEGATIVE_INFINITY;
		for (const el of els) {
			const box = el.getBoundingClientRect();
			const offset = mouseY - box.top - box.height / 2;
			if (offset < 0 && offset > closestOffset) { closestOffset = offset; closest = el; }
		}
		return closest ? Number(closest.dataset.taskId) : null;
	}

	function positionAfter(container, afterId) {
		// compute position index if dropped before a specific card
		const ids = [...container.querySelectorAll('.card')].map(c => Number(c.dataset.taskId));
		const idx = ids.indexOf(afterId);
		return Math.max(1, idx + 1);
	}

	function enableColumnDrag() {
		let dragSrc = null;
		const columns = [...board.querySelectorAll('.column')];
		columns.forEach(col => {
			const header = col.querySelector('.column-header');
			if (!header) return; // ignora tiles sem header
			header.setAttribute('draggable', 'true');
			header.addEventListener('dragstart', () => { dragSrc = col; col.classList.add('dragging'); });
			header.addEventListener('dragend', async () => {
				col.classList.remove('dragging');
				const order = [...board.querySelectorAll('.column[data-category-id]')]
					.map(c => Number(c.dataset.categoryId))
					.filter(id => Number.isInteger(id) && id > 0);
				await api.post('/api/categories/reorder', { order });
				await load();
			});
			col.addEventListener('dragover', (e) => {
				e.preventDefault();
				const siblings = [...board.querySelectorAll('.column')];
				const after = getColumnAfter(e.clientX);
				if (!after) board.append(dragSrc);
				else board.insertBefore(dragSrc, after);
			});
		});
	}

	function getColumnAfter(mouseX) {
		const els = [...board.querySelectorAll('.column:not(.dragging)')];
		let closest = null; let closestOffset = Number.NEGATIVE_INFINITY;
		for (const el of els) {
			const box = el.getBoundingClientRect();
			const offset = mouseX - box.left - box.width / 2;
			if (offset < 0 && offset > closestOffset) { closestOffset = offset; closest = el; }
		}
		return closest;
	}

	async function load() {
		const [categories, tasks, tags] = await Promise.all([
			api.get('/api/categories'), api.get('/api/tasks'), api.get('/api/tags'),
		]);
		state = { categories, tasks, tags };
		render();
	}

	return { load };
})();

window.$board = Board;
