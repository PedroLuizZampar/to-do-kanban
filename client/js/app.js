document.addEventListener('DOMContentLoaded', () => {
	const boardsList = document.getElementById('boards-list');
	const btnNewBoard = document.getElementById('btn-new-board');
	const sidebar = document.getElementById('sidebar');
	const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
	const sidebarResizer = document.getElementById('sidebar-resizer');

	// Sidebar: largura e colapso com persistência
	(function initSidebarPrefs() {
		const root = document.documentElement;
		const storedW = localStorage.getItem('sidebar:w');
		const storedCollapsed = localStorage.getItem('sidebar:collapsed') === '1';
		if (storedW) root.style.setProperty('--sidebar-w', storedW);
		if (storedCollapsed) {
			sidebar.classList.add('collapsed');
			const collapsedW = getComputedStyle(root).getPropertyValue('--sidebar-collapsed-w').trim() || '56px';
			root.style.setProperty('--sidebar-w', collapsedW);
		}
		updateToggleIcon();
	})();

	function updateToggleIcon() {
		const icon = btnToggleSidebar?.querySelector('.material-symbols-outlined');
		if (!icon) return;
		icon.textContent = sidebar.classList.contains('collapsed') ? 'chevron_right' : 'chevron_left';
		btnToggleSidebar?.setAttribute('title', sidebar.classList.contains('collapsed') ? 'Expandir sidebar' : 'Recolher sidebar');
		btnToggleSidebar?.setAttribute('aria-label', sidebar.classList.contains('collapsed') ? 'Expandir sidebar' : 'Recolher sidebar');
	}

	btnToggleSidebar?.addEventListener('click', () => {
		const root = document.documentElement;
		const collapsed = sidebar.classList.toggle('collapsed');
		localStorage.setItem('sidebar:collapsed', collapsed ? '1' : '0');
		if (collapsed) {
			// guardar última largura expandida
			const current = getComputedStyle(root).getPropertyValue('--sidebar-w').trim();
			if (current) localStorage.setItem('sidebar:lastW', current);
			root.style.setProperty('--sidebar-w', getComputedStyle(root).getPropertyValue('--sidebar-collapsed-w').trim() || '56px');
		} else {
			const last = localStorage.getItem('sidebar:lastW') || localStorage.getItem('sidebar:w') || '260px';
			root.style.setProperty('--sidebar-w', last);
		}
		updateToggleIcon();
	});

	// Redimensionamento com limites
	(function setupResizer() {
		if (!sidebarResizer) return;
		const root = document.documentElement;
		const min = 180; // px
		const max = 420; // px
		let startX = 0; let startW = 0; let active = false;
		function onDown(e) {
			if (sidebar.classList.contains('collapsed')) return;
			active = true;
			startX = e.clientX || (e.touches?.[0]?.clientX ?? 0);
			// computar largura atual da coluna via getComputedStyle
			const current = parseInt(getComputedStyle(document.querySelector('.app')).gridTemplateColumns.split(' ')[0], 10);
			startW = isNaN(current) ? sidebar.offsetWidth : current;
			document.body.style.userSelect = 'none';
			document.addEventListener('mousemove', onMove);
			document.addEventListener('mouseup', onUp);
			document.addEventListener('touchmove', onMove, { passive: false });
			document.addEventListener('touchend', onUp);
		}
		function onMove(e) {
			if (!active) return;
			e.preventDefault?.();
			const x = e.clientX || (e.touches?.[0]?.clientX ?? 0);
			let w = startW + (x - startX);
			w = Math.max(min, Math.min(max, w));
			root.style.setProperty('--sidebar-w', `${w}px`);
		}
		function onUp() {
			if (!active) return;
			active = false;
			document.body.style.userSelect = '';
			const w = getComputedStyle(root).getPropertyValue('--sidebar-w')?.trim();
			if (w) localStorage.setItem('sidebar:w', w);
			document.removeEventListener('mousemove', onMove);
			document.removeEventListener('mouseup', onUp);
			document.removeEventListener('touchmove', onMove);
			document.removeEventListener('touchend', onUp);
		}
		sidebarResizer.addEventListener('mousedown', onDown);
		sidebarResizer.addEventListener('touchstart', onDown, { passive: true });
	})();

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
				<div class="title" style="${b.color ? `color:${b.color}` : ''}"><span class="material-symbols-outlined" aria-hidden="true">space_dashboard</span><span class="board-name">${b.name}</span></div>
				<div class="board-actions">
					<button class="btn-ghost btn-edit" title="Renomear"><span class="material-symbols-outlined">edit</span></button>
					<button class="btn-ghost btn-delete" title="Excluir"><span class="material-symbols-outlined">delete</span></button>
				</div>`;
			item.addEventListener('click', (e) => {
				if ((e.target.closest && e.target.closest('.board-actions'))) return; // ignora clique em ações
				window.$utils.setBoardId(b.id);
				renderBoards();
				$board.load();
				// Atualiza miniaturas de membros ao trocar de quadro
				loadBoardMembersMini();
			});
			item.querySelector('.btn-edit').addEventListener('click', (e) => { e.stopPropagation(); Modal.open($modals.boardForm ? $modals.boardForm(b) : (function(){})()); });
			item.querySelector('.btn-delete').addEventListener('click', async (e) => {
				e.stopPropagation();
				const ok = await $modals.confirm({ title: 'Excluir quadro', message: `Excluir "${b.name}"? Isso removerá tudo neste quadro.`, confirmText: 'Excluir' });
				if (!ok) return;
				await api.del(`/api/boards/${b.id}`);
				if (window.$utils.getBoardId() === b.id) window.$utils.setBoardId(null);
				await renderBoards();
				$board.load();
				await loadBoardMembersMini();
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

		// Atualiza miniaturas após re-render de boards
		loadBoardMembersMini();
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
		document.getElementById('btn-templates').addEventListener('click', async () => {
			if (!ensureBoard()) return;
			const boardId = window.$utils.getBoardId();
			const root = el('div');
			root.append(el('h3', {}, 'Templates'));
			const listEl = el('div', { class: 'tag-list' });
			async function refresh() {
				listEl.innerHTML = '';
				let tpls = [];
				try { tpls = await api.get(`/api/templates?boardId=${encodeURIComponent(boardId)}`); } catch {}
				if (!tpls.length) listEl.append(el('p', { class: 'muted' }, 'Nenhum template.'));
				tpls.forEach(t => {
					const left = el('div', { class: 'tag-left' }, [
						el('span', { class: 'tag', style: 'background:#e5e7eb;color:#111' }, t.name),
						t.is_default ? el('small', { class: 'muted' }, ' — padrão') : ''
					]);
					const actions = el('div', { class: 'tag-actions' }, [
						el('button', { class: 'btn-ghost btn-favorite', title: t.is_default ? 'Remover padrão' : 'Definir como padrão', onclick: async () => {
							if (t.is_default) {
								await api.del(`/api/templates/default`);
							} else {
								await api.post(`/api/templates/${t.id}/default`, {});
							}
							await refresh();
						}}, [
							el('span', { class: 'material-symbols-outlined', 'aria-hidden': 'true', style: t.is_default ? 'color:#f59e0b' : '' }, 'star'),
							el('span', { class: 'sr-only' }, 'Definir padrão')
						]),
						el('button', { class: 'btn-ghost btn-edit', title: 'Editar template', onclick: async () => {
							const tpl = await api.get(`/api/templates/${t.id}`);
							Modal.open(await taskForm({ __templateMode: true, id: tpl.id, template_name: tpl.name, is_default: tpl.is_default, title: (tpl.content?.title || ''), description: (tpl.content?.description || ''), tags: (tpl.content?.tags || []).map(id => ({ id })), subtasks: (tpl.content?.subtasks || []) }));
						}}, [
							el('span', { class: 'material-symbols-outlined', 'aria-hidden': 'true' }, 'edit'),
							el('span', { class: 'sr-only' }, 'Editar')
						]),
						el('button', { class: 'btn-ghost btn-delete', title: 'Excluir template', onclick: async () => { const ok = await $modals.confirm({ title: 'Excluir template', message: `Excluir "${t.name}"?`, confirmText: 'Excluir' }); if (!ok) return; await api.del(`/api/templates/${t.id}`); await refresh(); } }, [
							el('span', { class: 'material-symbols-outlined', 'aria-hidden': 'true' }, 'delete'),
							el('span', { class: 'sr-only' }, 'Excluir')
						])
					]);
					const row = el('div', { class: 'tag-row' }, [left, actions]);
					listEl.append(row);
				});
			}
			await refresh();
			root.append(listEl);
			root.append(el('footer', {}, [
				el('button', { class: 'btn-danger', onclick: Modal.close }, 'Fechar'),
				el('button', { onclick: async () => { Modal.open(await taskForm({ __templateMode: true })); } }, 'Novo template')
			]));
			Modal.open(root);
			// atualizar ao retomar (quando fechar o modal filho)
			root.addEventListener('modal:resumed', async () => { await refresh(); });
			// ouvir eventos globais de mudanças
			const onTplChanged = async () => { await refresh(); };
			document.addEventListener('templatesChanged', onTplChanged);
			root.addEventListener('modal:cleanup', () => { document.removeEventListener('templatesChanged', onTplChanged); });
		});
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
			el('button', { class: 'btn-danger', onclick: Modal.close }, 'Cancelar'),
			el('button', { onclick: async () => {
				if (!selected.size) { await $modals.alert({ title: 'Selecione', message: 'Escolha pelo menos um usuário.' }); return; }
				await fetch(`/api/boards/${boardId}/invite`, { method: 'POST', headers: api.getHeaders(), body: JSON.stringify({ userIds: Array.from(selected) }) });
				Modal.close();
				$modals.toast.show('Convites enviados');
			}}, 'Convidar')
		]));
		Modal.open(root);
	});

	// Miniaturas dos participantes na topbar
	const membersMini = document.getElementById('board-members-mini');
	let membersMiniReq = 0; // token para evitar race conditions
	async function loadBoardMembersMini() {
		if (!membersMini) return;
		membersMini.innerHTML = '';
		const boardId = window.$utils.getBoardId();
		if (!boardId) return;
		const reqId = ++membersMiniReq;
		let members = [];
		try { members = await api.get(`/api/boards/${boardId}/invite/users?mode=members`); } catch {}
		// se outra chamada mais recente foi iniciada, descarta este resultado
		if (reqId !== membersMiniReq) return;
		if (!members.length) return;
		const currentUser = window.$auth?.getUser?.() || null;
		const membersNoSelf = currentUser ? members.filter(m => m.id !== currentUser.id) : members;
		if (!membersNoSelf.length) return;
		const openMembersModal = () => {
			const root = el('div');
			root.append(el('h3', {}, 'Participantes do quadro'));
			const list = el('div', { class: 'tag-list' });
			members.forEach(u => {
				const row = el('div', { class: 'tag-row' });
				const left = el('div', { class: 'tag-left' }, [
					u.avatar_url ? (function(){ const i = el('img', { src: u.avatar_url, alt: u.username, style: 'width:28px;height:28px;border-radius:999px;object-fit:cover;border:1px solid var(--border);' }); return i; })() : el('span', { class: 'tag', style: 'background:#e5e7eb;color:#111' }, (u.username||'?').charAt(0).toUpperCase()),
					el('strong', { style: 'margin-left:8px; display:flex; align-items:center; gap:6px' }, [
						u.username,
						(u.role === 'owner' ? el('span', { class: 'material-symbols-outlined', style: 'font-size:16px;color:#f59e0b', title: 'Criador do quadro' }, 'workspace_premium') : ''),
					]),
					el('small', { class: 'muted', style: 'margin-left:6px' }, `(${u.email})`),
				]);
				row.append(left);
				list.append(row);
			});
			root.append(list);
			root.append(el('footer', {}, [el('button', { class: 'btn-ghost', onclick: Modal.close }, 'Fechar')]));
			Modal.open(root);
		};
		membersNoSelf.slice(0,3).forEach(u => {
			const a = document.createElement('div');
			a.className = 'avatar-mini';
			a.setAttribute('title', `${u.username} (${u.email})`);
			a.addEventListener('click', openMembersModal);
			if (u.avatar_url) {
				const img = document.createElement('img');
				img.src = u.avatar_url; img.alt = u.username; a.append(img);
			} else {
				a.textContent = (u.username||'?').charAt(0).toUpperCase();
			}
			membersMini.append(a);
		});
		if (membersNoSelf.length > 3) {
			const more = document.createElement('div');
			more.className = 'avatar-mini more';
			more.textContent = `+${membersNoSelf.length - 3}`;
			more.setAttribute('role', 'button');
			more.setAttribute('tabindex', '0');
			more.setAttribute('aria-label', `Ver mais ${membersNoSelf.length - 3} participantes`);
			more.addEventListener('click', openMembersModal);
			more.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openMembersModal(); } });
			membersMini.append(more);
		}
	}

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
	(async () => { await renderBoards(); $board.load(); await loadBoardMembersMini(); })();
	// Recarrega miniaturas ao trocar de quadro
	document.addEventListener('refreshBoard', () => { loadBoardMembersMini(); });
});
