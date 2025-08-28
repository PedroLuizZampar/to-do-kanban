const Board = (() => {
	const board = document.getElementById('board');
	const tplColumn = document.getElementById('tpl-column');
	const tplCard = document.getElementById('tpl-card');
	// Tipo de arrasto atual: 'card' | 'column' | null
	let DND_KIND = null;

	// Bloqueio global: evita que o browser insira texto (ex.: 'null') em qualquer área
	try {
		const preventOnly = (e) => { e.preventDefault(); };
		document.addEventListener('dragenter', preventOnly, true);
		document.addEventListener('dragover', preventOnly, true);
		document.addEventListener('drop', preventOnly, true);
	} catch {}

	// Evita que o navegador insira texto ('null' etc.) ao soltar fora do board; dentro do board permitimos DnD
	try {
		const allowInside = (e) => { e.stopPropagation(); e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'; };
		board.addEventListener('dragover', allowInside);
		board.addEventListener('drop', allowInside);
	} catch {}

	let state = { categories: [], tasks: [], tags: [] };

	function findCategory(id) { return state.categories.find(c => c.id === id); }
	function tasksByCategory(id) { return state.tasks.filter(t => t.category_id === id).sort(sortByPosition); }

	function render() {
		board.innerHTML = '';
		// Se não há board selecionado, mostra mensagem e sai
		if (!window.$utils.getBoardId()) {
			board.append(el('div', { class: 'empty-board' }, 'Nenhum quadro selecionado. Crie um quadro para começar.'));
			return;
		}
		state.categories.sort(sortByPosition).forEach(cat => {
			const $col = tplColumn.content.firstElementChild.cloneNode(true);
			$col.dataset.categoryId = cat.id;
			$col.querySelector('.column-title').textContent = cat.name;
			if (cat.color) $col.style.setProperty('--col', cat.color);
			const cards = $col.querySelector('.cards');
			cards.addEventListener('dragover', (e) => { e.stopPropagation(); e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'; cards.classList.add('drag-over'); });
			cards.addEventListener('dragleave', () => cards.classList.remove('drag-over'));
			cards.addEventListener('drop', async (e) => {
				e.stopPropagation(); e.preventDefault();
				cards.classList.remove('drag-over');
				const taskId = Number(e.dataTransfer.getData('text/plain'));
				const afterId = getCardAfter(cards, e.clientY);
				const toPosition = afterId ? positionAfter(cards, afterId) : tasksByCategory(cat.id).length + 1;
				await api.post(`/api/tasks/${taskId}/move`, { toCategoryId: cat.id, toPosition });
				await load();
			});
			// Permitir soltar em qualquer área da coluna (fora de .cards): move para o final
			$col.addEventListener('dragover', (e) => { e.stopPropagation(); e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'; });
			$col.addEventListener('drop', async (e) => {
				e.stopPropagation(); e.preventDefault();
				// Se o alvo já for .cards, deixa o handler de .cards cuidar
				if (e.target && e.target.closest && e.target.closest('.cards')) return;
				const taskId = Number(e.dataTransfer.getData('text/plain'));
				if (!taskId) return;
				const toPosition = tasksByCategory(cat.id).length + 1;
				await api.post(`/api/tasks/${taskId}/move`, { toCategoryId: cat.id, toPosition });
				await load();
			});
			$col.querySelector('.btn-edit').addEventListener('click', () => Modal.open(categoryForm(cat)));
			$col.querySelector('.btn-delete').addEventListener('click', async () => {
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

			// Ajusta cor do texto do botão com base na cor da coluna
			const btnAdd = $col.querySelector('.btn-add-card');
			const colColor = cat.color || getComputedStyle($col).getPropertyValue('--col');
			if (colColor) {
				const txtColor = window.$utils.getContrastTextColor(String(colColor).trim());
				btnAdd.style.color = txtColor;
			}
			// Evita inserção de texto ao soltar sobre o botão e trata como soltar ao final da coluna
			btnAdd.addEventListener('dragover', (e) => { e.stopPropagation(); e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'; });
			btnAdd.addEventListener('drop', async (e) => {
				e.stopPropagation(); e.preventDefault();
				const taskId = Number(e.dataTransfer.getData('text/plain'));
				if (!taskId) return;
				const toPosition = tasksByCategory(cat.id).length + 1;
				await api.post(`/api/tasks/${taskId}/move`, { toCategoryId: cat.id, toPosition });
				await load();
			});

			tasksByCategory(cat.id).forEach(t => cards.append(renderCard(t)));
			board.append($col);
		});
		// Tile de nova coluna ao final
		const addTile =	el('button', { class: 'btn-add-column', onclick: () => Modal.open(categoryForm()) }, [
				el('span', { class: 'material-symbols-outlined', 'aria-hidden': 'true' }, 'add'),
				'Nova coluna'
			]);
		// Evitar qualquer drop sobre o tile de nova coluna
	addTile.addEventListener('dragover', (e) => { e.stopPropagation(); e.preventDefault(); });
	addTile.addEventListener('drop', (e) => { e.stopPropagation(); e.preventDefault(); });
		board.append(addTile);

		enableColumnDrag();
	}

	function renderCard(task) {
		const $card = tplCard.content.firstElementChild.cloneNode(true);
		$card.dataset.taskId = task.id;
		$card.querySelector('.card-title').textContent = task.title;
		// Badge de prazo
		if (task.due_at) {
			const due = new Date(task.due_at);
			const now = new Date();
			const badge = document.createElement('div');
			badge.className = 'card-due';
			const icon = document.createElement('span');
			icon.className = 'material-symbols-outlined';
			icon.textContent = 'schedule';
			const time = document.createElement('span');
			time.className = 'card-due-text';
			const fmt = (d) => {
				try { return d.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }); } catch { return d.toISOString(); }
			};
			time.textContent = fmt(due);
			badge.append(icon, time);
			// status
			let cls = 'on-time';
			const dueMs = due.getTime();
			const nowMs = now.getTime();
			if (nowMs >= dueMs) {
				cls = 'overdue';
			} else {
				// usa created_at como início do intervalo
				const startDate = task.created_at ? new Date(task.created_at) : null;
				if (startDate) {
					const startMs = startDate.getTime();
					if (isFinite(startMs) && startMs < dueMs) {
						const threshold = startMs + 0.6 * (dueMs - startMs);
						if (nowMs >= threshold) cls = 'due-soon';
					}
				}
			}
			badge.classList.add(cls);
			$card.insertBefore(badge, $card.querySelector('.card-tags'));
		}
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
		// Mantém ordem de vínculo (já vem do backend por tt.position)
		(task.tags || []).forEach(t => tagsWrap.append(pill(t.name, t.color)));
		// Avatares dos responsáveis
		const avatarsWrap = document.createElement('div');
		avatarsWrap.className = 'card-assignees';
		(task.assignees || []).slice(0,4).forEach((u, idx) => {
			const a = document.createElement('div');
			a.className = 'avatar-mini';
			// tooltip simples após 1s de hover
			let hoverTimer; let tip;
			a.addEventListener('mouseenter', () => { hoverTimer = setTimeout(() => {
				if (tip) return; tip = document.createElement('span'); tip.className = 'avatar-tip'; tip.textContent = u.username; a.appendChild(tip);
			}, 1000); });
			a.addEventListener('mouseleave', () => { clearTimeout(hoverTimer); if (tip) { tip.remove(); tip = null; } });
			if (u.avatar_url) {
				const img = document.createElement('img'); img.src = u.avatar_url; img.alt = u.username; a.append(img);
			} else {
				a.textContent = (u.username || '?').charAt(0).toUpperCase();
			}
			avatarsWrap.append(a);
		});
		if ((task.assignees || []).length > 4) {
			const more = document.createElement('div');
			more.className = 'avatar-mini more';
			more.textContent = `+${(task.assignees.length - 4)}`;
			avatarsWrap.append(more);
		}
		$card.insertBefore(avatarsWrap, $card.querySelector('.card-actions'));
		$card.addEventListener('dragstart', (e) => { DND_KIND = 'card'; e.dataTransfer.setData('text/plain', String(task.id)); });
		$card.addEventListener('dragend', () => { DND_KIND = null; });
		$card.querySelector('.btn-edit').addEventListener('click', async () => {
			const fresh = state.tasks.find(x => x.id === task.id);
			Modal.open(await taskForm(fresh));
		});
		$card.querySelector('.btn-delete').addEventListener('click', async () => {
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
			header.addEventListener('dragstart', () => { DND_KIND = 'column'; dragSrc = col; col.classList.add('dragging'); });
			// Quando arrastando cartão sobre o cabeçalho, impedir texto e permitir soltar (vai ao final da coluna)
			header.addEventListener('dragover', (e) => {
				if (DND_KIND === 'card') { e.stopPropagation(); e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'; }
			});
			header.addEventListener('drop', async (e) => {
				if (DND_KIND === 'card') {
					e.stopPropagation(); e.preventDefault();
					const taskId = Number(e.dataTransfer.getData('text/plain'));
					if (taskId) {
						const catId = Number(col.dataset.categoryId);
						const toPosition = tasksByCategory(catId).length + 1;
						await api.post(`/api/tasks/${taskId}/move`, { toCategoryId: catId, toPosition });
						await load();
					}
				} else {
					// Durante DnD de colunas, evita inserção de texto no header
					e.preventDefault();
				}
			});
			header.addEventListener('dragend', async () => {
				col.classList.remove('dragging');
				DND_KIND = null;
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
