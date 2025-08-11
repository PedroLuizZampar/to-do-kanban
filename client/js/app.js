document.addEventListener('DOMContentLoaded', () => {
	const boardsList = document.getElementById('boards-list');
	const btnNewBoard = document.getElementById('btn-new-board');

	async function renderBoards() {
		const boards = await api.get('/api/boards');
		boardsList.innerHTML = '';
		const current = window.$utils.getBoardId();
		const exists = boards.some(b => b.id === current);
		if (!current || !exists) window.$utils.setBoardId(boards[0]?.id || null);
		boards.forEach(b => {
			const item = document.createElement('div');
			item.className = 'board-item' + (Number(window.$utils.getBoardId()) === b.id ? ' active' : '');
			item.setAttribute('draggable', 'true');
			if (b.color) item.style.setProperty('--board-color', b.color);
			item.innerHTML = `
				<div class="title" style="${b.color ? `color:${b.color}` : ''}"><span class="material-symbols-outlined" aria-hidden="true">space_dashboard</span>${b.name}</div>
				<div class="board-actions">
					<button class="btn-ghost btn-edit" title="Renomear"><span class="material-symbols-outlined">edit</span></button>
					<button class="btn-ghost btn-danger btn-del" title="Excluir"><span class="material-symbols-outlined">delete</span></button>
				</div>`;
			item.addEventListener('click', (e) => {
				if ((e.target.closest && e.target.closest('.board-actions'))) return; // ignora clique em ações
				window.$utils.setBoardId(b.id);
				renderBoards();
				$board.load();
			});
			item.querySelector('.btn-edit').addEventListener('click', (e) => { e.stopPropagation(); Modal.open($modals.boardForm ? $modals.boardForm(b) : (function(){})()); });
			item.querySelector('.btn-del').addEventListener('click', async (e) => {
				e.stopPropagation();
				const ok = await $modals.confirm({ title: 'Excluir quadro', message: `Excluir "${b.name}"? Isso removerá tudo neste quadro.`, confirmText: 'Excluir' });
				if (!ok) return;
				await api.del(`/api/boards/${b.id}`);
				if (window.$utils.getBoardId() === b.id) window.$utils.setBoardId(null);
				await renderBoards();
				$board.load();
				$modals.toast.show('Quadro excluído');
			});

			// Drag events para reordenar
			item.addEventListener('dragstart', (e) => {
				item.classList.add('dragging');
				e.dataTransfer.setData('text/plain', String(b.id));
			});
			item.addEventListener('dragend', async () => {
				item.classList.remove('dragging');
				const order = [...boardsList.querySelectorAll('.board-item')]
					.map(el => Number(el.dataset.boardId))
					.filter(Boolean);
				await api.post('/api/boards/reorder', { order });
				await renderBoards();
			});
			item.addEventListener('dragenter', () => item.classList.add('drag-over'));
			item.addEventListener('dragleave', () => item.classList.remove('drag-over'));
			item.dataset.boardId = b.id;
			boardsList.append(item);
		});

		// handler único no container para posicionamento visual
		boardsList.addEventListener('dragover', (e) => {
			e.preventDefault();
			const after = getBoardAfter(e.clientY);
			const dragging = boardsList.querySelector('.board-item.dragging');
			if (!dragging) return;
			if (!after) boardsList.append(dragging);
			else boardsList.insertBefore(dragging, after);
		});
	}

	function getBoardAfter(mouseY) {
		const els = [...boardsList.querySelectorAll('.board-item:not(.dragging)')];
		let closest = null; let closestOffset = Number.NEGATIVE_INFINITY;
		for (const el of els) {
			const box = el.getBoundingClientRect();
			const offset = mouseY - box.top - box.height / 2;
			if (offset < 0 && offset > closestOffset) { closestOffset = offset; closest = el; }
		}
		return closest;
	}

	btnNewBoard.addEventListener('click', () => Modal.open($modals.boardForm ? $modals.boardForm() : (function(){})()));

	function ensureBoard(action) {
		if (!window.$utils.getBoardId()) {
			$modals.toast.show('Crie um quadro primeiro.');
			return false;
		}
		return true;
	}

	document.getElementById('btn-new-task').addEventListener('click', async () => {
		if (!ensureBoard()) return;
		// verifica se há colunas antes de abrir
		const cats = await api.get('/api/categories');
		if (!cats.length) { $modals.toast.show('Crie uma coluna primeiro.'); return; }
		Modal.open(await taskForm());
	});
	document.getElementById('btn-new-category').addEventListener('click', () => { if (!ensureBoard()) return; Modal.open(categoryForm()); });
	document.getElementById('btn-new-tag').addEventListener('click', () => { if (!ensureBoard()) return; $modals.tagManager(); });
	document.getElementById('btn-help').addEventListener('click', () => $modals.openHelp());

	// Atalhos (Alt + key)
	document.addEventListener('keydown', async (e) => {
		if (!e.altKey) return;
		const k = e.key.toLowerCase();
		if (k === 'n') { e.preventDefault(); if (ensureBoard()) { const cats = await api.get('/api/categories'); if (!cats.length) { $modals.toast.show('Crie uma coluna primeiro.'); return; } Modal.open(await taskForm()); } }
		if (k === 'c') { e.preventDefault(); if (ensureBoard()) Modal.open(categoryForm()); }
		if (k === 't') { e.preventDefault(); if (ensureBoard()) $modals.tagManager(); }
		if (k === 'h') { e.preventDefault(); $modals.openHelp(); }
		if (k === 'q') { e.preventDefault(); Modal.open($modals.boardForm()); }
	});
	document.addEventListener('refreshBoard', () => { renderBoards(); $board.load(); });
	(async () => { await renderBoards(); $board.load(); })();
});
