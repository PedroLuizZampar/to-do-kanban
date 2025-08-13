const Modal = (() => {
	const backdrop = document.getElementById('modal-backdrop');
	const modal = document.getElementById('modal');
	const stack = [];

	function render(content) {
		modal.innerHTML = '';
		if (content) {
			const wrap = document.createElement('div');
			wrap.className = 'modal-content';
			wrap.append(content);
			modal.append(wrap);
		}
	}

	function open(content, opts = {}) {
		const { replace = false } = opts;
		const isVisible = !modal.classList.contains('hidden');
		if (isVisible && !replace) {
			const current = modal.firstElementChild;
			if (current) stack.push(current);
		}
		render(content);
		backdrop.classList.remove('hidden');
		modal.classList.remove('hidden');
	}

	function close() {
		if (stack.length > 0) {
			const prev = stack.pop();
			render(prev);
			// notifica que o modal anterior foi retomado (bubbling p/ filhos)
			try { prev.dispatchEvent(new CustomEvent('modal:resumed', { bubbles: true })); } catch {}
			// mantém backdrop visível
			return;
		}
		backdrop.classList.add('hidden');
		modal.classList.add('hidden');
		// dispara cleanup para que modais removam listeners globais
		try {
			const current = modal.firstElementChild;
			if (current) current.dispatchEvent(new CustomEvent('modal:cleanup', { bubbles: true }));
		} catch {}
		modal.innerHTML = '';
	}

	backdrop.addEventListener('click', close);
	// Fecha com ESC
	document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape' && !modal.classList.contains('hidden')) close();
	});
	return { open, close };
})();

	// Toast simples
	const Toast = (() => {
		const el = document.getElementById('toast');
		let t;
		function show(message, opts = {}) {
			clearTimeout(t);
			el.textContent = message;
			el.classList.remove('hidden');
			el.classList.remove('toast-error');
			if (opts.type === 'error') el.classList.add('toast-error');
			t = setTimeout(hide, opts.duration || 2500);
		}
		function hide() { el.classList.add('hidden'); }
		return { show, hide };
	})();

	// Confirm customizado (botão confirmar fica danger quando é exclusão; cancelar é neutro)
	async function confirmModal({ title = 'Confirmar', message = 'Tem certeza?', confirmText = 'Confirmar', cancelText = 'Cancelar' } = {}) {
		return new Promise((resolve) => {
			const okIsDelete = /^\s*(excluir|redefinir)/i.test(confirmText);
			const ok = el('button', { class: okIsDelete ? 'btn-danger' : '' }, confirmText);
			const cancel = el('button', {}, cancelText);
			ok.addEventListener('click', () => { Modal.close(); resolve(true); });
			cancel.addEventListener('click', () => { Modal.close(); resolve(false); });
			const content = el('div', {}, [
				el('h3', {}, title),
				el('p', {}, message),
				el('footer', {}, [cancel, ok])
			]);
			Modal.open(content, { replace: true });
		});
	}

		// Alert customizado
		async function alertModal({ title = 'Atenção', message = '', okText = 'OK' } = {}) {
			return new Promise((resolve) => {
				const ok = el('button', {}, okText);
				ok.addEventListener('click', () => { Modal.close(); resolve(true); });
				const content = el('div', {}, [
					el('h3', {}, title),
					el('p', {}, message),
					el('footer', {}, [ok])
				]);
				Modal.open(content, { replace: true });
			});
		}

function colorPickerRow(labelText, initialColor) {
	const input = el('input', { type: 'color', value: initialColor || '#3b82f6', class: 'color-input' });
	const swatch = el('span', { class: 'color-swatch' });
	swatch.style.background = input.value;
	input.addEventListener('input', () => { swatch.style.background = input.value; });

	const palette = ['#fd5d5d','#6bb96a','#8f8f8f','#3b82f6','#f59e0b','#10b981','#8b5cf6','#ef4444','#14b8a6'];
	const quick = el('div', { class: 'color-quick' });
	palette.forEach(c => {
		const b = el('button', { class: 'color-dot', style: `--c:${c}` });
		b.addEventListener('click', (e) => { e.preventDefault(); input.value = c; input.dispatchEvent(new Event('input')); });
		quick.append(b);
	});

	const row = el('div', { class: 'row color-row' }, [
		el('label', {}, labelText),
		el('div', { class: 'color-field' }, [swatch, input, quick])
	]);
	return { row, input };
}

function categoryForm(initial = {}) {
	const name = el('input', { value: initial.name || '', placeholder: 'Nome da coluna' });
	const description = el('textarea', { placeholder: 'Descrição' }, initial.description || '');
	const { row: colorRow, input: color } = colorPickerRow('Cor', initial.color || '#3b82f6');
	const content = el('div', {}, [
		el('h3', {}, initial.id ? 'Editar coluna' : 'Nova coluna'),
		el('div', { class: 'row' }, [el('label', {}, 'Nome'), name]),
		el('div', { class: 'row' }, [el('label', {}, 'Descrição'), description]),
		colorRow,
		el('footer', {}, [
					el('button', { class: 'btn-danger', onclick: Modal.close }, 'Cancelar'),
					el('button', { onclick: async () => {
						if (!name.value.trim()) { await alertModal({ title: 'Campo obrigatório', message: 'Nome é obrigatório.' }); return; }
				const payload = { name: name.value.trim(), description: description.value.trim(), color: color.value, board_id: window.$utils.getBoardId() };
				try {
					if (initial.id) await api.put(`/api/categories/${initial.id}`, payload);
					else await api.post('/api/categories', payload);
					Modal.close();
					document.dispatchEvent(new CustomEvent('refreshBoard'));
				} catch (e) {
					let msg = 'Não foi possível salvar a coluna.';
					try { const j = JSON.parse(e.message); if (j.error) msg = j.error; } catch {}
					await alertModal({ title: 'Erro', message: msg });
				}
			} }, 'Salvar'),
		]),
	]);
	return content;
}

function tagForm(initial = {}) {
	const name = el('input', { value: initial.name || '', placeholder: 'Nome da tag' });
	const description = el('textarea', { placeholder: 'Descrição' }, initial.description || '');
	const { row: colorRow, input: color } = colorPickerRow('Cor', initial.color || '#172554');
	const content = el('div', {}, [
		el('h3', {}, initial.id ? 'Editar tag' : 'Nova tag'),
		el('div', { class: 'row' }, [el('label', {}, 'Nome'), name]),
		el('div', { class: 'row' }, [el('label', {}, 'Descrição'), description]),
		colorRow,
		el('footer', {}, [
					el('button', { class: 'btn-danger', onclick: Modal.close }, 'Cancelar'),
					el('button', { onclick: async () => {
						if (!name.value.trim()) { await alertModal({ title: 'Campo obrigatório', message: 'Nome é obrigatório.' }); return; }
				const payload = { name: name.value.trim(), description: description.value.trim(), color: color.value, board_id: window.$utils.getBoardId() };
				try {
					if (initial.id) await api.put(`/api/tags/${initial.id}`, payload);
					else await api.post('/api/tags', payload);
				// Dispara evento global para qualquer modal (taskForm, tagManager) atualizar tags imediatamente
				document.dispatchEvent(new CustomEvent('tagsChanged'));
					Modal.close();
					document.dispatchEvent(new CustomEvent('refreshBoard'));
				} catch (e) {
					let msg = 'Não foi possível salvar a tag.';
					try { const j = JSON.parse(e.message); if (j.error) msg = j.error; } catch {}
					await alertModal({ title: 'Erro', message: msg });
				}
			} }, 'Salvar'),
		]),
	]);
	return content;
}

async function taskForm(initial = {}) {
	const cats = await api.get('/api/categories');
	const tags = await api.get('/api/tags');
	// carrega membros do quadro atual para atribuição
	let members = [];
	try { members = await api.get(`/api/boards/${window.$utils.getBoardId()}/invite/users?mode=members`); } catch {}
	const title = el('input', { value: initial.title || '', placeholder: 'Título' });
	const description = el('textarea', { placeholder: 'Descrição' }, initial.description || '');

	// Checklist (subtarefas)
	const subtasks = (initial.subtasks || []).map(s => ({ ...s }));
	const checklistWrap = el('div', { class: 'checklist' });
	const inputNew = el('input', { type: 'text', placeholder: 'Nova subtarefa' });
	const btnAddSub = el('button', {}, 'Adicionar');
	btnAddSub.addEventListener('click', async (e) => {
		e.preventDefault();
		const text = inputNew.value.trim();
		if (!text) return;
		if (initial.id) {
			const s = await api.post(`/api/tasks/${initial.id}/subtasks`, { title: text });
			subtasks.push(s);
		} else {
			// Novo task ainda não salvo: adiciona localmente
			subtasks.push({ id: Date.now(), title: text, done: 0, _temp: true });
		}
		inputNew.value = '';
		renderChecklist();
	});

	function renderChecklist() {
		checklistWrap.innerHTML = '';
		subtasks.sort((a,b) => (a.position || 0) - (b.position || 0) || (a.id - b.id));
		subtasks.forEach((s, idx) => {
			const cb = el('input', { type: 'checkbox' });
			cb.checked = !!s.done;
			cb.addEventListener('change', async () => {
				s.done = cb.checked ? 1 : 0;
				if (initial.id && !s._temp) await api.put(`/api/subtasks/${s.id}`, { done: !!cb.checked });
			});
			const txt = el('input', { type: 'text', value: s.title });
			txt.addEventListener('change', async () => {
				s.title = txt.value;
				if (initial.id && !s._temp) await api.put(`/api/subtasks/${s.id}`, { title: s.title });
			});
			const btnDel = el('button', { class: 'btn-ghost btn-danger', title: 'Remover' }, [el('span', { class: 'material-symbols-outlined', 'aria-hidden': 'true' }, 'delete')]);
			btnDel.addEventListener('click', async (e) => {
				e.preventDefault();
				if (initial.id && !s._temp) await api.del(`/api/subtasks/${s.id}`);
				subtasks.splice(idx, 1);
				renderChecklist();
			});
			const row = el('div', { class: 'checklist-item' }, [cb, txt, btnDel]);
			checklistWrap.append(row);
		});
	}
	renderChecklist();

	// Dropdown custom para coluna (categoria)
	let chosenCatId = initial.category_id ? Number(initial.category_id) : (cats[0]?.id || null);
	const catDropdown = (() => {
		const btn = el('button', { class: 'dropdown-toggle', type: 'button' });
		const labelSpan = el('span', { class: 'dropdown-label' }, cats.find(c => c.id === chosenCatId)?.name || 'Selecionar coluna');
		const icon = el('span', { class: 'material-symbols-outlined', 'aria-hidden': 'true' }, 'expand_more');
		btn.append(labelSpan, icon);
		const menu = el('div', { class: 'dropdown-menu hidden' });
		cats.forEach(c => {
			const item = el('button', { class: 'dropdown-item', type: 'button' }, c.name);
			item.addEventListener('click', () => {
				chosenCatId = c.id;
				labelSpan.textContent = c.name;
				menu.classList.add('hidden');
			});
			menu.append(item);
		});
		btn.addEventListener('click', () => menu.classList.toggle('hidden'));
		const wrap = el('div', { class: 'dropdown' }, [btn, menu]);
		return wrap;
	})();


	// UI de tags com dois lados (disponíveis e adicionadas)
	const selectedTags = new Set((initial.tags || []).map(t => t.id));
	const availableWrap = el('div', { class: 'tag-bucket' });
	const selectedWrap = el('div', { class: 'tag-bucket' });
	function makeTagPill(t, selected) {
		const p = pill(t.name, t.color);
		p.classList.add('tag-toggle');
		p.addEventListener('click', () => {
			if (selectedTags.has(t.id)) selectedTags.delete(t.id); else selectedTags.add(t.id);
			renderBuckets();
		});
		return p;
	}
	function renderBuckets() {
		availableWrap.innerHTML = '';
		selectedWrap.innerHTML = '';
		tags.forEach(t => {
			const isSel = selectedTags.has(t.id);
			(isSel ? selectedWrap : availableWrap).append(makeTagPill(t, isSel));
		});
	}
	renderBuckets();

	// Atribuídos (UI semelhante às tags, com avatar nas pílulas)
	const selectedAssignees = new Set((initial.assignees || []).map(a => a.id));
	const assigneesAvailable = el('div', { class: 'tag-bucket' });
	const assigneesSelected = el('div', { class: 'tag-bucket' });
	function userPill(u) {
		const p = el('span', { class: 'tag user-pill' });
		const avatar = u.avatar_url ? el('img', { src: u.avatar_url, alt: u.username }) : el('span', { class: 'avatar-fallback' }, u.username.charAt(0).toUpperCase());
		const name = el('span', { class: 'user-name' }, u.username);
		p.append(avatar, name);
		p.addEventListener('click', () => {
			if (selectedAssignees.has(u.id)) selectedAssignees.delete(u.id); else selectedAssignees.add(u.id);
			renderAssigneeBuckets();
		});
		return p;
	}
	function renderAssigneeBuckets() {
		assigneesAvailable.innerHTML = '';
		assigneesSelected.innerHTML = '';
		members.forEach(u => {
			const isSel = selectedAssignees.has(u.id);
			(isSel ? assigneesSelected : assigneesAvailable).append(userPill(u));
		});
	}
	renderAssigneeBuckets();

	const content = el('div', {}, [
		el('h3', {}, initial.id ? 'Editar tarefa' : 'Nova tarefa'),
		el('div', { class: 'row' }, [el('h5', {}, 'Título'), title]),
		el('div', { class: 'row' }, [el('h5', {}, 'Descrição'), description]),
		el('div', { class: 'row' }, [el('h5', {}, 'Coluna'), cats.length ? catDropdown : el('div', { class: 'muted' }, 'Nenhuma coluna disponível')]),
		el('div', { class: 'row' }, [
			el('h5', {}, 'Checklist'),
			el('div', {}, [
				checklistWrap,
				el('div', { class: 'checklist-actions' }, [inputNew, btnAddSub])
			])
		]),
		el('div', { class: 'row' }, [
			el('h5', {}, 'Responsáveis'),
			el('div', { class: 'tag-dual' }, [
				el('div', { class: 'tag-bucket-wrap' }, [el('small', { class: 'muted' }, 'Disponíveis'), assigneesAvailable]),
				el('div', { class: 'tag-bucket-wrap' }, [el('small', { class: 'muted' }, 'Atribuídos'), assigneesSelected]),
			])
		]),
		el('div', { class: 'row' }, [
			el('h5', {}, 'Tags'),
			el('div', { class: 'tag-dual' }, [
				el('div', { class: 'tag-bucket-wrap' }, [el('small', { class: 'muted' }, 'Disponíveis'), availableWrap]),
				el('div', { class: 'tag-bucket-wrap' }, [el('small', { class: 'muted' }, 'Adicionadas'), selectedWrap]),
			])
		]),
		el('footer', {}, [
					el('button', { class: 'btn-danger', onclick: Modal.close }, 'Cancelar'),
					el('button', { onclick: async () => {
						if (!title.value.trim()) { await alertModal({ title: 'Campo obrigatório', message: 'Título é obrigatório.' }); return; }
						if (!chosenCatId || !cats.length) { await alertModal({ title: 'Seleção necessária', message: 'Crie uma coluna antes de adicionar tarefas.' }); return; }
				const payload = { title: title.value.trim(), description: description.value.trim(), category_id: Number(chosenCatId) };
				try {
					let saved;
					if (initial.id) saved = await api.put(`/api/tasks/${initial.id}`, payload);
					else saved = await api.post('/api/tasks', payload);
					const tagsArr = Array.from(selectedTags);
					await api.post(`/api/tasks/${saved.id}/tags`, { tags: tagsArr });
				// salvar responsáveis
				const assigneesArr = Array.from(selectedAssignees);
				await api.post(`/api/tasks/${saved.id}/assignees`, { userIds: assigneesArr });
				// salva subtarefas criadas no modo temporário
				for (const s of subtasks) {
					if (s._temp) await api.post(`/api/tasks/${saved.id}/subtasks`, { title: s.title });
				}
					Modal.close();
					document.dispatchEvent(new CustomEvent('refreshBoard'));
				} catch (e) {
					let msg = 'Não foi possível salvar a tarefa.';
					try { const j = JSON.parse(e.message); if (j.error) msg = j.error; } catch {}
					await alertModal({ title: 'Erro', message: msg });
				}
			} }, 'Salvar'),
		]),
	]);
	// ao retomar este modal (após fechar o de nova tag), recarrega tags e re-renderiza buckets
	content.addEventListener('modal:resumed', async () => {
		try {
			const fresh = await api.get('/api/tags');
			tags.length = 0; fresh.forEach(t => tags.push(t));
			renderBuckets();
		} catch {}
	});
	// Atualiza buckets se uma tag foi criada/alterada em outro modal sem empilhar (evento global)
	const onTagsChanged = async () => {
		try {
			const fresh = await api.get('/api/tags');
			tags.length = 0; fresh.forEach(t => tags.push(t));
			renderBuckets();
		} catch {}
	};
	document.addEventListener('tagsChanged', onTagsChanged);
	// Remove listener ao fechar (quando modal substituído ou fechado totalmente)
	content.addEventListener('modal:cleanup', () => { document.removeEventListener('tagsChanged', onTagsChanged); });
	return content;
}

window.$modals = { Modal, categoryForm, tagForm, taskForm };
window.$modals.confirm = confirmModal;
window.$modals.alert = alertModal;
// Expor toast como função (compatível com window.$modals.toast('msg')) e também com .show/.hide
window.$modals.toast = (message, opts) => Toast.show(message, opts);
window.$modals.toast.show = (message, opts) => Toast.show(message, opts);
window.$modals.toast.hide = () => Toast.hide();

async function tagManager() {
	const root = el('div', {});
	const listEl = el('div', { class: 'tag-list' });
	async function refresh() {
		listEl.innerHTML = '';
		const tags = await api.get('/api/tags');
		if (!tags.length) { listEl.append(el('p', { class: 'muted' }, 'Nenhuma tag.')); return; }
		tags.forEach(t => {
			const left = el('div', { class: 'tag-left' }, [pill(t.name, t.color), t.description ? el('small', { class: 'muted' }, ` — ${t.description}`) : '']);
            const actions = el('div', { class: 'tag-actions' }, [
                el('button', { class: 'btn-ghost btn-edit', title: 'Editar tag', onclick: async () => { Modal.open(tagForm(t)); } }, [
                    el('span', { class: 'material-symbols-outlined', 'aria-hidden': 'true' }, 'edit'),
                    el('span', { class: 'sr-only' }, 'Editar')
                ]),
                el('button', { class: 'btn-ghost btn-delete', title: 'Excluir tag', onclick: async () => {
                    const ok = await confirmModal({ title: 'Excluir tag', message: `Excluir a tag "${t.name}"?`, confirmText: 'Excluir' });
                    if (!ok) return;
                    await api.del(`/api/tags/${t.id}`);
                    Modal.close();
                    tagManager(); // Reabre o gerenciador após excluir
					Toast.show('Tag excluída');
                }}, [
                    el('span', { class: 'material-symbols-outlined', 'aria-hidden': 'true' }, 'delete'),
                    el('span', { class: 'sr-only' }, 'Excluir')
                ])
            ]);
			const row = el('div', { class: 'tag-row' }, [left, actions]);
			listEl.append(row);
		});
	}
	await refresh();
	root.append(
		el('h3', {}, 'Tags'),
		listEl,
		el('footer', {}, [
			el('button', { class: 'btn-danger', onclick: Modal.close }, 'Fechar'),
			el('button', { onclick: () => Modal.open(tagForm()) }, 'Nova tag'),
		])
	);
	// ao retomar este modal (após fechar o filho), atualiza a lista
	root.addEventListener('modal:resumed', async () => {
		await refresh();
		// também dispara refresh geral do board
		document.dispatchEvent(new CustomEvent('refreshBoard'));
	});
	// Atualiza se houver changes sem empilhar (evento global)
	const onTagsChanged = async () => { await refresh(); };
	document.addEventListener('tagsChanged', onTagsChanged);
	root.addEventListener('modal:cleanup', () => { document.removeEventListener('tagsChanged', onTagsChanged); });
	Modal.open(root);
}

window.$modals.tagManager = tagManager;

// Modal de ajuda/atalhos
function helpContent() {
	const items = [
		['Alt + N', 'Nova tarefa'],
		['Alt + C', 'Nova coluna'],
		['Alt + T', 'Abrir gerenciador de tags'],
		['Alt + S', 'Compartilhar quadro'],
		['Alt + Q', 'Novo quadro'],
		['Alt + H', 'Abrir ajuda'],
		['Esc', 'Fechar modais']
	];
	const list = el('ul', { class: 'help-list' }, items.map(([k, d]) => el('li', {}, [el('code', {}, k), ' — ', d])));
	// Removido botão de gerenciar quadros aqui; gestão fica na sidebar
	return el('div', {}, [
		el('h3', {}, 'Atalhos do teclado'),
		el('p', { class: 'muted' }, 'Use Alt + tecla nas combinações abaixo:'),
		list,
		el('footer', {}, [el('button', { onclick: Modal.close }, 'Fechar')])
	]);
}

window.$modals.openHelp = () => Modal.open(helpContent());

// Board Manager simples
async function boardManager() {
	const listEl = el('div', { class: 'tag-list' });
	async function refresh() {
		listEl.innerHTML = '';
		const boards = await api.get('/api/boards');
		boards.forEach(b => {
			const left = el('div', { class: 'tag-left' }, [pill(b.name, b.color || '#3b82f6'), b.description ? el('small', { class: 'muted' }, ` — ${b.description}`) : '']);
			const actions = el('div', { class: 'tag-actions' }, [
				el('button', { onclick: async () => { Modal.open(boardForm(b)); } }, 'Editar'),
				el('button', { class: 'btn-danger', onclick: async () => {
					const ok = await confirmModal({ title: 'Excluir quadro', message: `Excluir o quadro "${b.name}"? Isso removerá colunas, tarefas e tags.`, confirmText: 'Excluir' });
					if (!ok) return;
					await api.del(`/api/boards/${b.id}`);
					await refresh();
					document.dispatchEvent(new CustomEvent('refreshBoard'));
					Toast.show('Quadro excluído');
				} }, 'Excluir'),
			]);
			const row = el('div', { class: 'tag-row' }, [left, actions]);
			listEl.append(row);
		});
	}
	await refresh();
	const content = el('div', {}, [
		el('h3', {}, 'Quadros'),
		listEl,
		el('footer', {}, [
			el('button', { onclick: () => Modal.open(boardForm()) }, 'Novo quadro'),
			el('button', { class: 'btn-ghost', onclick: Modal.close }, 'Fechar'),
		])
	]);
	Modal.open(content);
}

function boardForm(initial = {}) {
	const name = el('input', { value: initial.name || '', placeholder: 'Nome do quadro' });
	const description = el('textarea', { placeholder: 'Descrição' }, initial.description || '');
	const { row: colorRow, input: color } = colorPickerRow('Cor', initial.color || '#3b82f6');
	const content = el('div', {}, [
		el('h3', {}, initial.id ? 'Editar quadro' : 'Novo quadro'),
		el('div', { class: 'row' }, [el('label', {}, 'Nome'), name]),
		el('div', { class: 'row' }, [el('label', {}, 'Descrição'), description]),
		colorRow,
		el('footer', {}, [
			el('button', { class: 'btn-danger', onclick: Modal.close }, 'Cancelar'),
			el('button', { onclick: async () => {
				if (!name.value.trim()) { await alertModal({ title: 'Campo obrigatório', message: 'Nome é obrigatório.' }); return; }
				try {
					let saved;
					if (initial.id) saved = await api.put(`/api/boards/${initial.id}`, { name: name.value.trim(), description: description.value.trim(), color: color.value });
					else saved = await api.post(`/api/boards`, { name: name.value.trim(), description: description.value.trim(), color: color.value });
					// Se criou novo quadro, torna-o atual
					if (!initial.id) {
						window.$utils.setBoardId(saved.id);
					}
					Modal.close();
					document.dispatchEvent(new CustomEvent('refreshBoard'));
				} catch (e) {
					let msg = 'Não foi possível salvar o quadro.';
					try { const j = JSON.parse(e.message); if (j.error) msg = j.error; } catch {}
					await alertModal({ title: 'Erro', message: msg });
				}
			} }, 'Salvar'),
		])
	]);
	return content;
}

window.$modals.boardForm = boardForm;
