const Modal = (() => {
	const backdrop = document.getElementById('modal-backdrop');
	const modal = document.getElementById('modal');
	const stack = [];

	function applyWideFlagFrom(node) {
		let wide = false;
		if (node && node.dataset && (node.dataset.modalWide === 'true' || node.dataset.wide === 'true')) wide = true;
		// Se for um wrapper existente
		if (!wide && node && node.classList && node.classList.contains('modal-content')) {
			if (node.dataset && (node.dataset.modalWide === 'true' || node.dataset.wide === 'true')) wide = true;
		}
		modal.classList.toggle('modal-wide', !!wide);
	}

	function render(content) {
		modal.innerHTML = '';
		if (content) {
			// Se o conteúdo já é um wrapper de modal, reutiliza
			if (content.classList && content.classList.contains('modal-content')) {
				modal.append(content);
				applyWideFlagFrom(content);
			} else {
				const wrap = document.createElement('div');
				wrap.className = 'modal-content';
				// propaga flag de largura se definida no conteúdo
				if (content.dataset && content.dataset.modalWide) wrap.dataset.modalWide = content.dataset.modalWide;
				wrap.append(content);
				modal.append(wrap);
				applyWideFlagFrom(wrap);
			}
		}
	}

	function open(content, opts = {}) {
		const { replace = false, wide = false } = opts;
		const isVisible = !modal.classList.contains('hidden');
		if (isVisible && !replace) {
			const current = modal.firstElementChild;
			if (current) stack.push(current);
		}
		// marca flag wide no conteúdo para que render() saiba aplicar
		try { if (wide) content.dataset.modalWide = 'true'; } catch {}
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
		modal.classList.remove('modal-wide');
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
			// Abre empilhado para não fechar o modal atual (ex.: modal do cartão)
			Modal.open(content, { replace: false });
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
				// Abre empilhado para não fechar o modal atual (ex.: modal do cartão)
				Modal.open(content, { replace: false });
			});
		}

function colorPickerRow(labelText, initialColor) {
	const input = el('input', { type: 'color', value: initialColor || '#3b82f6', class: 'color-input' });
	const swatch = el('span', { class: 'color-swatch' });
	swatch.style.background = input.value;
	input.addEventListener('input', () => { swatch.style.background = input.value; });

	// Paleta reduzida e mais distinta
	const palette = [
		'#ef4444', // red
		'#f97316', // orange
		'#f59e0b', // amber
		'#fff130', // yellow
		'#22c55e', // green
		'#14b8a6', // teal
		'#0ea5e9', // sky
		'#3b82f6', // blue
		'#ff80ff', // pink
		'#8b5cf6', // violet
		'#64748b',  // slate (neutro)
		'#333333'  // dark gray
	];
	const quick = el('div', { class: 'color-quick' });
	palette.forEach(c => {
		const b = el('button', { class: 'color-dot', style: `--c:${c}`, title: c });
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
	// Tarefas do board atual para montar opções de posição
	let allTasks = [];
	try {
		const bid = window.$utils.getBoardId();
		if (bid) allTasks = await api.get(`/api/tasks?boardId=${encodeURIComponent(bid)}`);
	} catch {}
	// carrega membros do quadro atual para atribuição
	let members = [];
	try { members = await api.get(`/api/boards/${window.$utils.getBoardId()}/invite/users?mode=members`); } catch {}
	const title = el('input', { value: initial.title || '', placeholder: 'Título' });

	// Editor Markdown leve apenas para a descrição de cards
	function escapeHtml(str) {
		return (str || '').replace(/[&<>"']/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[ch]));
	}
	function mdToHtml(md) {
		if (!md) return '';
		let s = escapeHtml(md);
		// code blocks (```) multiline
		s = s.replace(/```([\s\S]*?)```/g, (m, p1) => `<pre><code>${p1.replace(/\n/g,'<br>')}</code></pre>`);
		// inline code `code`
		s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
		// headings
		s = s.replace(/^######\s+(.*)$/gm, '<h6>$1</h6>');
		s = s.replace(/^#####\s+(.*)$/gm, '<h5>$1</h5>');
		s = s.replace(/^####\s+(.*)$/gm, '<h4>$1</h4>');
		s = s.replace(/^###\s+(.*)$/gm, '<h3>$1</h3>');
		s = s.replace(/^##\s+(.*)$/gm, '<h2>$1</h2>');
		s = s.replace(/^#\s+(.*)$/gm, '<h1>$1</h1>');
		// bold **text**
		s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
		// italic *text* or _text_
		s = s.replace(/(^|\W)\*([^*]+)\*(?=\W|$)/g, '$1<em>$2</em>');
		s = s.replace(/(^|\W)_([^_]+)_(?=\W|$)/g, '$1<em>$2</em>');
		// underline ++text++ (custom)
		s = s.replace(/\+\+([^+]+)\+\+/g, '<u>$1</u>');
		// strikethrough ~~text~~
		s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');
		// links [text](url)
		s = s.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1<\/a>');
		// unordered lists
		s = s.replace(/(^|\n)(?:-\s+.+(?:\n|$))+?/g, (block) => {
			const items = block.trim().split(/\n/).map(l => l.replace(/^[-*]\s+/, '').trim()).filter(Boolean);
			if (items.length <= 1) return block; return '\n<ul>' + items.map(i => `<li>${i}</li>`).join('') + '</ul>\n';
		});
		// ordered lists
		s = s.replace(/(^|\n)(?:\d+\.\s+.+(?:\n|$))+?/g, (block) => {
			const items = block.trim().split(/\n/).map(l => l.replace(/^\d+\.\s+/, '').trim()).filter(Boolean);
			if (items.length <= 1) return block; return '\n<ol>' + items.map(i => `<li>${i}</li>`).join('') + '</ol>\n';
		});
		// line breaks
		s = s.replace(/\n/g, '<br>');
		// remove <br> imediatamente após headings (h1..h6)
		s = s.replace(/<\/h([1-6])><br>/g, '</h$1>');
		return s;
	}
	function createMdToolbar(textarea, preview) {
		function wrapSelection(start, end = start) {
			const ta = textarea;
			const { selectionStart, selectionEnd, value } = ta;
			const before = value.slice(0, selectionStart);
			const sel = value.slice(selectionStart, selectionEnd) || 'texto';
			const after = value.slice(selectionEnd);
			ta.value = before + start + sel + end + after;
			ta.focus();
			const pos = (before + start + sel + end).length;
			ta.setSelectionRange(pos, pos);
			ta.dispatchEvent(new Event('input'));
		}
		function prefixLines(prefix) {
			const ta = textarea;
			const { selectionStart, selectionEnd, value } = ta;
			const startLine = value.lastIndexOf('\n', selectionStart - 1) + 1;
			const endLine = value.indexOf('\n', selectionEnd);
			const endPos = endLine === -1 ? value.length : endLine;
			const block = value.slice(startLine, endPos);
			const out = block.split('\n').map(l => l ? (prefix + ' ' + l) : l).join('\n');
			ta.value = value.slice(0, startLine) + out + value.slice(endPos);
			ta.focus();
			ta.setSelectionRange(startLine, startLine + out.length);
			ta.dispatchEvent(new Event('input'));
		}
		const tb = el('div', { class: 'md-toolbar' }, [
			el('button', { title: 'Negrito (Ctrl+B)', onclick: (e) => { e.preventDefault(); wrapSelection('**', '**'); } }, 'B'),
			el('button', { title: 'Itálico (Ctrl+I)', onclick: (e) => { e.preventDefault(); wrapSelection('*', '*'); } }, 'I'),
			el('button', { title: 'Sublinhado', onclick: (e) => { e.preventDefault(); wrapSelection('++', '++'); } }, 'U'),
			el('span', { class: 'md-sep' }, '|'),
			el('button', { title: 'Código inline', onclick: (e) => { e.preventDefault(); wrapSelection('`', '`'); } }, '</>'),
			el('button', { title: 'Lista', onclick: (e) => { e.preventDefault(); prefixLines('-'); } }, '•'),
			el('button', { title: 'Lista numerada', onclick: (e) => { e.preventDefault(); prefixLines('1.'); } }, '1.'),
			el('button', { title: 'Link', onclick: (e) => { e.preventDefault(); wrapSelection('[', '](https://)'); } }, '🔗')
		]);
		// atalhos simples
		textarea.addEventListener('keydown', (e) => {
			if (e.ctrlKey && (e.key === 'b' || e.key === 'B')) { e.preventDefault(); wrapSelection('**', '**'); }
			if (e.ctrlKey && (e.key === 'i' || e.key === 'I')) { e.preventDefault(); wrapSelection('*', '*'); }
		});
		return tb;
	}
	function createMarkdownEditor(initialText = '') {
		const placeholderText = 'Digite aqui a descrição...';
		const ta = el('textarea', { placeholder: placeholderText }, initialText || '');
		const preview = el('div', { class: 'markdown-preview' });
		const toolbar = createMdToolbar(ta, preview);
		const root = el('div', { class: 'md-editor' }, [toolbar, el('div', { class: 'md-panels' }, [el('div', { class: 'md-input' }, ta), preview])]);
		const render = () => {
			const val = ta.value || '';
			if (!val.trim()) {
				preview.classList.add('empty');
				preview.textContent = placeholderText;
				return;
			}
			preview.classList.remove('empty');
			preview.innerHTML = mdToHtml(val);
		};
		const setEditing = (on) => { root.classList.toggle('editing', !!on); };
		// Render inicial e estado não editando
		render();
		setEditing(false);
		// Permitir seleção/cópia no preview sem alternar modo ao clicar
		preview.setAttribute('tabindex', '0');
		preview.addEventListener('mousedown', (e) => {
			// Não alterar modo ao clicar/selecionar
			e.stopPropagation();
		});
		// Ao clicar no preview quando não estiver editando, entrar em edição
		preview.addEventListener('click', (e) => {
			const a = e.target && e.target.closest ? e.target.closest('a') : null;
			if (a) return; // permite abrir links normalmente
			if (!root.classList.contains('editing')) {
				setEditing(true);
				setTimeout(() => ta.focus(), 0);
			}
		});
		// Manter preview atualizado
		ta.addEventListener('input', render);
		// Alterna classe de edição baseado no foco dentro do editor
		let blurTimer;
		root.addEventListener('focusin', (e) => {
			if (blurTimer) clearTimeout(blurTimer);
			const t = e.target;
			// Só ativa edição quando o foco entrar na textarea (md-input) ou toolbar
			if (t && (t.closest && (t.closest('.md-input') || t.closest('.md-toolbar')))) {
				setEditing(true);
			}
		});
		root.addEventListener('focusout', () => {
			blurTimer = setTimeout(() => {
				if (!root.contains(document.activeElement)) setEditing(false);
			}, 80);
		});
		return { root, getValue: () => ta.value, setValue: (v) => { ta.value = v || ''; render(); } };
	}
	const descEditor = createMarkdownEditor(initial.description || '');

	// Checklist (subtarefas)
	const subtasks = (initial.subtasks || []).map(s => ({ ...s }));
	const checklistWrap = el('div', { class: 'checklist' });
	const inputNew = el('input', { type: 'text', placeholder: 'Nova subtarefa' });
	const btnAddSub = el('button', {}, 'Adicionar');
	btnAddSub.addEventListener('click', async (e) => {
		e.preventDefault();
		const text = inputNew.value.trim();
		if (!text) return;
		// valida duplicidade local (case-insensitive)
		const existsLocal = subtasks.some(s => (s.title || '').trim().toLowerCase() === text.toLowerCase());
		if (existsLocal) { await alertModal({ title: 'Duplicado', message: 'Já existe uma subtarefa com esse título neste cartão.' }); return; }
		if (initial.id) {
			try {
				const s = await api.post(`/api/tasks/${initial.id}/subtasks`, { title: text });
			subtasks.push(s);
			} catch (e) {
				let msg = 'Não foi possível adicionar a subtarefa.';
				try { const j = JSON.parse(e.message); if (j.error) msg = j.error; } catch {}
				await alertModal({ title: 'Erro', message: msg });
				return;
			}
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
			const btnDel = el('button', { class: 'btn-ghost btn-delete', title: 'Remover' }, [el('span', { class: 'material-symbols-outlined', 'aria-hidden': 'true' }, 'delete')]);
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

	// Anexos (imagens)
	const attachments = Array.isArray(initial.attachments) ? [...initial.attachments] : [];
	const pendingFiles = [];
	const thumbsWrap = el('div', { class: 'attach-thumbs' });
	function renderAttachments() {
			thumbsWrap.innerHTML = '';
			const haveReal = attachments.length > 0;
			const havePending = pendingFiles.length > 0;
			if (!haveReal && !havePending) {
				thumbsWrap.append(el('div', { class: 'muted' }, 'Nenhuma imagem anexada.'));
				return;
			}
			// anexos já enviados (com URLs públicas)
				attachments.forEach(a => {
					const item = el('div', { class: 'attach-thumb' });
					const delBtn = el('button', { class: 'btn-ghost btn-delete', title: 'Excluir imagem' }, [el('span', { class: 'material-symbols-outlined', 'aria-hidden': 'true' }, 'delete')]);
					delBtn.addEventListener('click', async (e) => {
						e.preventDefault(); e.stopPropagation();
						const ok = await confirmModal({ title: 'Excluir imagem', message: `Remover "${a.filename || 'imagem'}"?`, confirmText: 'Excluir' });
						if (!ok) return;
						try {
							await api.del(`/api/tasks/${initial.id}/attachments/${a.id}`);
							const idx = attachments.findIndex(x => x.id === a.id);
							if (idx >= 0) attachments.splice(idx, 1);
							renderAttachments();
						} catch (err) {
							await alertModal({ title: 'Erro', message: 'Não foi possível excluir a imagem.' });
						}
					});
					const img = el('img', { src: a.url, alt: a.filename || 'anexo' });
			img.addEventListener('click', () => {
						const viewer = el('div', { class: 'image-viewer', 'data-modal-wide': 'true' }, [
					el('h3', {}, a.filename || 'Imagem'),
					el('div', { class: 'image-viewer-body' }, [el('img', { src: a.url, alt: a.filename || 'imagem' })]),
					el('footer', {}, [el('button', { onclick: Modal.close }, 'Fechar')])
				]);
						Modal.open(viewer, { wide: true });
			});
					item.append(img, delBtn);
			thumbsWrap.append(item);
		});
			// previews locais de arquivos pendentes (nova tarefa ainda não salva)
			if (havePending) {
						pendingFiles.forEach((f, idx) => {
					try {
						const url = URL.createObjectURL(f);
								const item = el('div', { class: 'attach-thumb pending' });
						const badge = el('span', { class: 'pending-badge' }, 'pendente');
								const delBtn = el('button', { class: 'btn-ghost btn-delete', title: 'Remover imagem' }, [el('span', { class: 'material-symbols-outlined', 'aria-hidden': 'true' }, 'delete')]);
								delBtn.addEventListener('click', async (e) => {
									e.preventDefault(); e.stopPropagation();
									const ok = await confirmModal({ title: 'Remover imagem', message: `Remover imagem pendente "${f.name || 'imagem'}"?`, confirmText: 'Excluir' });
									if (!ok) return;
									const i = pendingFiles.indexOf(f);
									if (i >= 0) pendingFiles.splice(i, 1);
									try { URL.revokeObjectURL(url); } catch {}
									renderAttachments();
								});
						const img = el('img', { src: url, alt: f.name || 'pendente' });
						img.addEventListener('load', () => { try { URL.revokeObjectURL(url); } catch {} });
						img.addEventListener('click', () => {
									const viewer = el('div', { class: 'image-viewer', 'data-modal-wide': 'true' }, [
								el('h3', {}, f.name || 'Imagem'),
								el('div', { class: 'image-viewer-body' }, [el('img', { src: url, alt: f.name || 'imagem' })]),
								el('footer', {}, [el('button', { onclick: Modal.close }, 'Fechar')])
							]);
									Modal.open(viewer, { wide: true });
						});
								item.append(img, badge, delBtn);
						thumbsWrap.append(item);
					} catch {}
				});
			}
	}
	function isImage(file) { return file && file.type && file.type.startsWith('image/'); }
	async function uploadFileToTask(taskId, file) {
		const fd = new FormData();
		fd.append('file', file);
		const r = await fetch(`/api/tasks/${taskId}/attachments`, { method: 'POST', headers: { 'Authorization': 'Bearer ' + (window.$auth?.getToken() || localStorage.getItem('token') || '') }, body: fd });
		if (!r.ok) { try { const j = await r.json(); throw new Error(j.error || 'Falha no upload'); } catch (e) { throw new Error(e.message || 'Falha no upload'); } }
		return r.json();
	}

	const fileInput = el('input', { type: 'file', accept: 'image/*', class: 'file-input' });
	fileInput.addEventListener('change', async () => {
		const files = Array.from(fileInput.files || []);
		if (!files.length) return;
		const images = files.filter(isImage);
		if (images.length !== files.length) await alertModal({ title: 'Arquivos ignorados', message: 'Apenas imagens são permitidas.' });
		if (initial.id) {
			for (const f of images) {
				try { const created = await uploadFileToTask(initial.id, f); attachments.push(created); } catch (e) { await alertModal({ title: 'Erro ao enviar', message: e.message || 'Falha ao enviar' }); }
			}
			renderAttachments();
		} else {
				pendingFiles.push(...images);
				renderAttachments();
		}
		fileInput.value = '';
	});

	const dropzone = el('div', { class: 'dropzone' }, [
		el('span', { class: 'material-symbols-outlined', 'aria-hidden': 'true' }, 'cloud_upload'),
		el('span', {}, 'Arraste e solte imagens aqui ou '),
		el('label', { class: 'file-label', for: 'attach-input' }, [el('span', { class: 'material-symbols-outlined' }, 'photo_camera'), ' Escolher imagens'])
	]);
	fileInput.id = 'attach-input';
	dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('drag-over'); });
	dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
	dropzone.addEventListener('drop', async (e) => {
		e.preventDefault(); dropzone.classList.remove('drag-over');
		const files = Array.from(e.dataTransfer.files || []);
		const images = files.filter(isImage);
		if (!images.length) { await alertModal({ title: 'Atenção', message: 'Solte apenas arquivos de imagem.' }); return; }
		if (initial.id) {
			for (const f of images) {
				try { const created = await uploadFileToTask(initial.id, f); attachments.push(created); } catch (e) { await alertModal({ title: 'Erro ao enviar', message: e.message || 'Falha ao enviar' }); }
			}
			renderAttachments();
		} else {
				pendingFiles.push(...images);
				renderAttachments();
		}
	});

	function attachmentsSection() {
		const wrap = el('div', { class: 'attachments-section' }, [
			el('h5', {}, 'Uploads'),
			el('div', { class: 'file-upload' }, [fileInput, dropzone]),
			thumbsWrap
		]);
		return wrap;
	}

	renderAttachments();

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

	// Campo de Posição (dropdown custom, não suspenso)
	function tasksCountIn(catId) { return (allTasks || []).filter(t => t.category_id === Number(catId)).length; }
	let chosenPos = 1;
	const posLabel = el('h5', {}, 'Posição');
	let posLabelSpan; let posMenu;
	const posDropdown = (() => {
		const btn = el('button', { class: 'dropdown-toggle', type: 'button' });
		posLabelSpan = el('span', { class: 'dropdown-label' }, '');
		const icon = el('span', { class: 'material-symbols-outlined', 'aria-hidden': 'true' }, 'expand_more');
		btn.append(posLabelSpan, icon);
		posMenu = el('div', { class: 'dropdown-menu pos-menu hidden' });
		btn.addEventListener('click', () => posMenu.classList.toggle('hidden'));
		return el('div', { class: 'dropdown' }, [btn, posMenu]);
	})()
	function updatePositionOptions() {
		posMenu.innerHTML = '';
			const count = tasksCountIn(chosenCatId);
			const editingSameCategory = !!initial.id && Number(initial.category_id) === Number(chosenCatId);
			const max = editingSameCategory ? count : (count + 1);
			if (editingSameCategory && initial.position) {
				chosenPos = Math.max(1, Math.min(initial.position, max));
			} else {
				chosenPos = max;
			}
			for (let i = 1; i <= max; i++) {
			const item = el('button', { class: 'dropdown-item', type: 'button' }, String(i));
			item.addEventListener('click', () => {
				chosenPos = i;
				posLabelSpan.textContent = String(i);
				posMenu.classList.add('hidden');
			});
			posMenu.append(item);
		}
		posLabelSpan.textContent = String(chosenPos);
	}
	updatePositionOptions();
	// atualizar ao trocar a coluna
	(function hookCatChange() {
		const btn = catDropdown.querySelector('.dropdown-toggle');
		const menu = catDropdown.querySelector('.dropdown-menu');
		if (!menu) return;
		menu.querySelectorAll('.dropdown-item').forEach((it, idx) => {
			it.addEventListener('click', () => {
				setTimeout(() => updatePositionOptions(), 0);
			});
		});
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
		el('div', { class: 'row' }, [el('h5', {}, 'Descrição'), descEditor.root]),
		el('div', { class: 'row' }, [attachmentsSection()]),
		// Linha com Coluna (80%) e Posição (20%) lado a lado
		el('div', { class: 'row', style: 'display:flex; gap:8px; align-items:flex-start;' }, [
			el('div', { style: 'flex: 0 0 80%; max-width: 80%;' }, [el('h5', {}, 'Coluna'), cats.length ? catDropdown : el('div', { class: 'muted' }, 'Nenhuma coluna disponível')]),
			el('div', { style: 'flex: 0 0 20%; max-width: 20%; padding-left: 8px;' }, [posLabel, posDropdown])
		]),
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
				const payload = { title: title.value.trim(), description: descEditor.getValue().trim(), category_id: Number(chosenCatId) };
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
				// valida duplicidade antes de enviar
				{
					const seen = new Set();
					for (const s of subtasks) {
						const key = (s.title || '').trim().toLowerCase();
						if (!key) continue;
						if (seen.has(key)) { await alertModal({ title: 'Duplicado', message: 'Existem subtarefas repetidas com o mesmo título.' }); return; }
						seen.add(key);
					}
				}
				for (const s of subtasks) {
					if (s._temp) await api.post(`/api/tasks/${saved.id}/subtasks`, { title: s.title, done: !!s.done });
				}
					// Upload de anexos pendentes (quando criar nova tarefa)
					if (!initial.id && pendingFiles.length) {
						for (const f of pendingFiles) {
							try { await uploadFileToTask(saved.id, f); } catch {}
						}
					}
					// Após salvar, mover para a posição selecionada
					try { await api.post(`/api/tasks/${saved.id}/move`, { toCategoryId: Number(chosenCatId), toPosition: Number(chosenPos || 1) }); } catch {}
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
