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

	// Compartilhar quadro
	const btnShare = document.getElementById('btn-share');
	if (btnShare) btnShare.addEventListener('click', async () => {
		if (!ensureBoard()) return;
		const boardId = window.$utils.getBoardId();
		const root = el('div');
		root.append(el('h3', {}, 'Compartilhar quadro'));
		const list = el('div', { class: 'tag-list' });
		const selected = new Set();
		async function refreshUsers() {
			list.innerHTML = '';
			const users = await api.get(`/api/boards/${boardId}/invite/users`);
			if (!users.length) {
				list.append(el('p', { class: 'muted' }, 'Nenhum usuário disponível para convidar.'));
				return;
			}
			users.forEach(u => {
				const row = el('div', { class: 'tag-row' });
				const left = el('div', { class: 'tag-left' }, [
					u.avatar_url ? (function(){ const i = el('img', { src: u.avatar_url, alt: u.username, style: 'width:24px;height:24px;border-radius:999px;object-fit:cover;border:1px solid var(--border);' }); return i; })() : el('span', { class: 'tag', style: 'background:#e5e7eb;color:#111' }, u.username.charAt(0).toUpperCase()),
					el('strong', { style: 'margin-left:8px' }, u.username),
					el('small', { class: 'muted', style: 'margin-left:6px' }, `(${u.email})`),
				]);
				const checkbox = el('input', { type: 'checkbox' });
				checkbox.addEventListener('change', () => { checkbox.checked ? selected.add(u.id) : selected.delete(u.id); });
				const actions = el('div', { class: 'tag-actions' }, [checkbox]);
				row.append(left, actions);
				list.append(row);
			});
		}
		await refreshUsers();
		root.append(list);
		root.append(el('footer', {}, [
			el('button', { class: 'btn-ghost', onclick: Modal.close }, 'Cancelar'),
			el('button', { onclick: async () => {
				if (!selected.size) { await $modals.alert({ title: 'Selecione', message: 'Escolha pelo menos um usuário.' }); return; }
				await fetch(`/api/boards/${boardId}/invite`, { method: 'POST', headers: api.getHeaders(), body: JSON.stringify({ userIds: Array.from(selected) }) });
				Modal.close();
				$modals.toast.show('Convites enviados');
			}}, 'Convidar')
		]));
		Modal.open(root);
	});

	// Inbox de convites
	const btnInbox = document.getElementById('btn-inbox');
	const badge = document.getElementById('inbox-badge');
	async function loadInboxCount() {
		try {
			const items = await api.get('/api/boards/inbox');
			if (badge) {
				badge.textContent = String(items.length);
				badge.style.display = items.length ? 'inline-block' : 'none';
			}
			return items;
		} catch { if (badge) badge.style.display = 'none'; return []; }
	}
	if (btnInbox) btnInbox.addEventListener('click', async () => {
		const items = await loadInboxCount();
		const root = el('div');
		root.append(el('h3', {}, 'Convites pendentes'));
		if (!items.length) {
			root.append(el('p', { class: 'muted' }, 'Sem convites no momento.'));
			return Modal.open(root);
		}
		items.forEach(inv => {
			const row = el('div', { class: 'tag-row' });
			const left = el('div', { class: 'tag-left' }, [
				el('span', { class: 'tag', style: 'background:#e0f2fe;color:#0c4a6e' }, inv.board_name),
				el('small', { class: 'muted', style: 'margin-left:6px' }, `Convidado por ${inv.invited_by_name}`),
			]);
			const actions = el('div', { class: 'tag-actions' }, [
				el('button', { class: 'btn-success', onclick: async () => { await api.post(`/api/boards/invite/${inv.id}/respond`, { accept: true }); Modal.close(); await loadInboxCount(); $modals.toast.show('Convite aceito'); document.dispatchEvent(new CustomEvent('refreshBoard')); } }, 'Aceitar'),
				el('button', { class: 'btn-danger', onclick: async () => { await api.post(`/api/boards/invite/${inv.id}/respond`, { accept: false }); Modal.close(); await loadInboxCount(); $modals.toast.show('Convite recusado'); } }, 'Recusar'),
			]);
			row.append(left, actions);
			root.append(row);
		});
		root.append(el('footer', {}, [el('button', { class: 'btn-ghost', onclick: Modal.close }, 'Fechar')]));
		Modal.open(root);
	});
	loadInboxCount();

	// Atalhos (sem Alt+P)
	document.addEventListener('keydown', async (e) => {
		if (!e.altKey) return;
		const k = (e.key || '').toLowerCase();
		if (k === 'n') { e.preventDefault(); if (!ensureBoard()) return; const cats = await api.get('/api/categories'); if (!cats.length) { $modals.toast.show('Crie uma coluna primeiro.'); return; } Modal.open(await taskForm()); }
		if (k === 'c') { e.preventDefault(); if (!ensureBoard()) return; Modal.open(categoryForm()); }
		if (k === 't') { e.preventDefault(); if (!ensureBoard()) return; $modals.tagManager(); }
		if (k === 'h') { e.preventDefault(); $modals.openHelp(); }
		if (k === 'q') { e.preventDefault(); Modal.open($modals.boardForm()); }
	if (k === 's') { e.preventDefault(); if (!ensureBoard()) return; btnShare?.click(); }
	});
	document.addEventListener('refreshBoard', () => { renderBoards(); $board.load(); });
	(async () => { await renderBoards(); $board.load(); })();
});
