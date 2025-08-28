// Modal consistente
const Modal = (() => {
	const backdrop = document.getElementById('modal-backdrop');
	const modal = document.getElementById('modal');
	const stack = [];

	function applyWideFlagFrom(node) {
		let wide = false;
		if (node && node.dataset && (node.dataset.modalWide === 'true' || node.dataset.wide === 'true')) wide = true;
		if (!wide && node && node.classList && node.classList.contains('modal-content')) {
			if (node.dataset && (node.dataset.modalWide === 'true' || node.dataset.wide === 'true')) wide = true;
		}
		modal.classList.toggle('modal-wide', !!wide);
	}

	function render(content) {
		modal.innerHTML = '';
		if (!content) return;
		if (content.classList && content.classList.contains('modal-content')) {
			modal.append(content);
			applyWideFlagFrom(content);
		} else {
			const wrap = document.createElement('div');
			wrap.className = 'modal-content';
			if (content.dataset && content.dataset.modalWide) wrap.dataset.modalWide = content.dataset.modalWide;
			wrap.append(content);
			modal.append(wrap);
			applyWideFlagFrom(wrap);
		}
	}

	function open(content, opts) {
		opts = opts || {};
		const replace = !!opts.replace;
		const wide = !!opts.wide;
		const isVisible = !modal.classList.contains('hidden');
		if (isVisible && !replace) {
			const current = modal.firstElementChild;
			if (current) stack.push(current);
		}
		try { if (wide) content.dataset.modalWide = 'true'; } catch (e) {}
		render(content);
		backdrop.classList.remove('hidden');
		modal.classList.remove('hidden');
	}

	function close() {
		if (stack.length > 0) {
			const prev = stack.pop();
			render(prev);
			try { prev.dispatchEvent(new CustomEvent('modal:resumed', { bubbles: true })); } catch (e) {}
			return;
		}
		backdrop.classList.add('hidden');
		modal.classList.add('hidden');
		modal.classList.remove('modal-wide');
		try {
			const current = modal.firstElementChild;
			if (current) current.dispatchEvent(new CustomEvent('modal:cleanup', { bubbles: true }));
		} catch (e) {}
		modal.innerHTML = '';
	}

	if (backdrop) backdrop.addEventListener('click', close);
	document.addEventListener('keydown', (e) => {
		const mdl = document.getElementById('modal');
		if (e.key === 'Escape' && mdl && !mdl.classList.contains('hidden')) close();
	});

	return { open, close };
})();

// Diálogos utilitários básicos (alerta e confirmação) e Toast
function alertModal({ title = 'Aviso', message = '', okText = 'OK' } = {}) {
	return new Promise((resolve) => {
		const content = el('div', {}, [
			el('h3', { class: 'card-title' }, title),
			el('p', {}, message || ''),
			el('footer', {}, [
				el('button', { onclick: () => { Modal.close(); resolve(true); } }, okText)
			])
		]);
		Modal.open(content);
	});
}

function confirmModal({ title = 'Confirmar', message = '', confirmText = 'Confirmar', cancelText = 'Cancelar' } = {}) {
	return new Promise((resolve) => {
		const content = el('div', {}, [
			el('h3', { class: 'card-title' }, title),
			el('p', {}, message || ''),
			el('footer', {}, [
				el('button', { onclick: () => { Modal.close(); resolve(false); } }, cancelText),
				el('button', { class: 'btn-danger', onclick: () => { Modal.close(); resolve(true); } }, confirmText)
			])
		]);
		Modal.open(content);
	});
}

const Toast = (() => {
	let elToast;
	let hideTimer;
	function ensure() {
		if (!elToast) {
			elToast = document.createElement('div');
			elToast.className = 'toast hidden';
			document.body.appendChild(elToast);
		}
		return elToast;
	}
	function show(message, opts = {}) {
		const t = ensure();
		t.textContent = message || '';
		t.classList.remove('hidden');
		t.classList.toggle('toast-error', !!opts.error);
		if (hideTimer) clearTimeout(hideTimer);
		const dur = typeof opts.duration === 'number' ? opts.duration : 2200;
		hideTimer = setTimeout(() => hide(), dur);
	}
	function hide() {
		const t = ensure();
		t.classList.add('hidden');
	}
	return { show, hide };
})();

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
		el('h5', { class: 'separator' }, labelText),
		el('div', { class: 'color-field' }, [swatch, input, quick])
	]);
	return { row, input };
}

function categoryForm(initial = {}) {
	const name = el('input', { value: initial.name || '', placeholder: 'Nome da coluna' });
	const description = el('textarea', { placeholder: 'Descrição' }, initial.description || '');
	const { row: colorRow, input: color } = colorPickerRow('Cor', initial.color || '#3b82f6');
	const content = el('div', {}, [
		el('h3', { class: 'card-title' }, initial.id ? 'Editar coluna' : 'Nova coluna'),
		el('div', { class: 'row' }, [el('h5', { class: 'separator' }, 'Nome'), name]),
		el('div', { class: 'row' }, [el('h5', { class: 'separator' }, 'Descrição'), description]),
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
		el('h3', { class: 'card-title' }, initial.id ? 'Editar tag' : 'Nova tag'),
		el('div', { class: 'row' }, [el('h5', { class: 'separator' }, 'Nome'), name]),
		el('div', { class: 'row' }, [el('h5', { class: 'separator' }, 'Descrição'), description]),
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
	const isTemplateMode = !!initial.__templateMode;
	const cats = await api.get('/api/categories');
	const tags = await api.get(`/api/tags?boardId=${encodeURIComponent(window.$utils.getBoardId() || '')}`);
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

	// Campos de prazo (data e hora separados)
	function toLocalDatetimeValue(iso) {
		try {
			if (!iso) return '';
			const d = new Date(iso);
			const pad = (n) => String(n).padStart(2, '0');
			const yyyy = d.getFullYear();
			const mm = pad(d.getMonth() + 1);
			const dd = pad(d.getDate());
			const hh = pad(d.getHours());
			const mi = pad(d.getMinutes());
			return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
		} catch { return ''; }
	}
	function toLocalDateValue(iso) {
		try {
			if (!iso) return '';
			const d = new Date(iso);
			const pad = (n) => String(n).padStart(2, '0');
			return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
		} catch { return ''; }
	}
	function toLocalTimeValue(iso) {
		try {
			if (!iso) return '';
			const d = new Date(iso);
			const pad = (n) => String(n).padStart(2, '0');
			return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
		} catch { return ''; }
	}
	const dateInput = el('input', { type: 'date', value: toLocalDateValue(initial.due_at), style: 'flex: 0 0 auto;' });
	const timeInput = el('input', { type: 'time', value: toLocalTimeValue(initial.due_at), style: 'flex: 0 0 auto;' });
	const dueRow = el('div', { class: 'row' }, [
		el('h5', { class: 'separator' }, 'Prazo'),
		el('div', { style: 'display:flex; gap:16px; align-items:flex-start; flex-wrap:wrap;' }, [
			el('div', { style: 'width: 48.2%; display:flex; flex-direction:column; gap:4px; flex:0 0 auto;' }, [
				el('label', {}, 'Data'),
				dateInput,
			]),
			el('div', { style: 'width: 48.2%; display:flex; flex-direction:column; gap:4px; flex:0 0 auto;' }, [
				el('label', {}, 'Hora'),
				timeInput,
			]),
		])
	]);

		// Campos de prazo para Template: Dias + Horas:Minutos
		const tplDueDaysInput = el('input', { type: 'number', min: '0', step: '1', value: (initial.due_days ?? 0), style: 'flex: 0 0 auto;' });
		const tplDueTimeInput = el('input', { type: 'time', value: (initial.due_hm ?? '00:00'), style: 'flex: 0 0 auto;' });
		const tplDueRow = el('div', { class: 'row' }, [
			el('h5', { class: 'separator' }, 'Prazo'),
			el('div', { style: 'display:flex; gap:16px; align-items:flex-start; flex-wrap:wrap;' }, [
				el('div', { style: 'width: 48.2%; display:flex; flex-direction:column; gap:4px; flex:0 0 auto;' }, [
					el('label', {}, 'Dias'),
					tplDueDaysInput,
				]),
				el('div', { style: 'width: 48.2%; display:flex; flex-direction:column; gap:4px; flex:0 0 auto;' }, [
					el('label', {}, 'Horas e Minutos'),
					tplDueTimeInput,
				]),
			])
		]);

		function computeDueFromTemplate(days, hm) {
			const d = parseInt(days || 0, 10) || 0;
			let addMin = 0;
			if (typeof hm === 'string' && hm.includes(':')) {
				const [hStr, mStr] = hm.split(':');
				const h = parseInt(hStr || '0', 10) || 0;
				const m = parseInt(mStr || '0', 10) || 0;
				addMin = h * 60 + m;
			}
			const now = new Date();
			now.setDate(now.getDate() + d);
			now.setMinutes(now.getMinutes() + addMin);
			return toLocalDatetimeValue(now);
		}

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
			el('button', { title: 'Negrito (Ctrl+B)', onclick: (e) => { e.preventDefault(); wrapSelection('**', '**'); } }, [el('strong', {}, 'B')]),
			el('button', { title: 'Itálico (Ctrl+I)', onclick: (e) => { e.preventDefault(); wrapSelection('*', '*'); } }, [el('em', {}, 'I')]),
			el('button', { title: 'Sublinhado (Ctrl+U)', onclick: (e) => { e.preventDefault(); wrapSelection('++', '++'); } }, [el('u', {}, 'U')]),
			el('button', { title: 'Tachado (Ctrl+S)', onclick: (e) => { e.preventDefault(); wrapSelection('~~', '~~'); } }, [el('del', {}, 'S')]),
			el('span', { class: 'md-sep' }, '|'),
			el('button', { title: 'Código inline', onclick: (e) => { e.preventDefault(); wrapSelection('`', '`'); } }, ['</>']),
			el('button', { title: 'Lista', onclick: (e) => { e.preventDefault(); prefixLines('-'); } }, ['•']),
			el('button', { title: 'Lista numerada', onclick: (e) => { e.preventDefault(); prefixLines('1.'); } }, ['1.']),
			el('button', { title: 'Link', onclick: (e) => { e.preventDefault(); wrapSelection('[', '](https://)'); } }, ['🔗'])
		]);
		// atalhos simples
		textarea.addEventListener('keydown', (e) => {
			if (e.ctrlKey && (e.key === 'b' || e.key === 'B')) { e.preventDefault(); wrapSelection('**', '**'); }
			if (e.ctrlKey && (e.key === 'i' || e.key === 'I')) { e.preventDefault(); wrapSelection('*', '*'); }
			if (e.ctrlKey && (e.key === 'u' || e.key === 'U')) { e.preventDefault(); wrapSelection('++', '++'); }
			if (e.ctrlKey && (e.key === 's' || e.key === 'S')) { e.preventDefault(); wrapSelection('~~', '~~'); }
		});
		return tb;
	}
	function createMarkdownEditor(initialText = '') {
		const placeholderText = 'Digite aqui a descrição...';
		const ta = el('textarea', { placeholder: placeholderText }, initialText || '');
		const preview = el('div', { class: 'markdown-preview' });
		const toolbar = createMdToolbar(ta, preview);
		const root = el('div', { class: 'md-editor' }, [toolbar, el('div', { class: 'md-panels' }, [el('div', { class: 'md-input' }, ta), preview])]);
		function syncHeights() {
			try {
				const isEditing = root.classList.contains('editing');
				// Libera alturas para medir naturalmente
				ta.style.height = 'auto';
				preview.style.height = 'auto';
				if (isEditing) {
					// Em edição: igualar pela maior altura entre preview e textarea
					const taH = Math.max(ta.scrollHeight || 0, 0);
					const pvH = Math.max(preview.scrollHeight || 0, 0);
					const h = Math.max(140, taH, pvH);
					ta.style.height = h + 'px';
					preview.style.height = h + 'px';
				} else {
					// Fora de edição: deixa preview seguir o conteúdo naturalmente
					preview.style.height = 'auto';
				}
			} catch {}
		}
		// Garante sincronização após mudanças de layout (ex.: entrar no modo de edição)
		function syncAfterLayout() {
			try { requestAnimationFrame(() => requestAnimationFrame(syncHeights)); } catch { syncHeights(); }
		}
		const render = () => {
			const val = ta.value || '';
			if (!val.trim()) {
				preview.classList.add('empty');
				preview.textContent = placeholderText;
				syncHeights();
				return;
			}
			preview.classList.remove('empty');
			preview.innerHTML = mdToHtml(val);
			syncHeights();
		};
		const setEditing = (on) => {
			root.classList.toggle('editing', !!on);
			// ao alternar modo, o preview muda de largura/altura; sincroniza a textarea
			syncAfterLayout();
		};
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
				// foca e garante altura alinhada imediatamente ao abrir edição
				setTimeout(() => { ta.focus(); syncAfterLayout(); }, 0);
			}
		});
		// Manter preview atualizado
		ta.addEventListener('input', render);
		window.addEventListener('resize', () => syncHeights());
		// Alterna classe de edição baseado no foco dentro do editor
		let blurTimer;
		root.addEventListener('focusin', (e) => {
			if (blurTimer) clearTimeout(blurTimer);
			const t = e.target;
			// Só ativa edição quando o foco entrar na textarea (md-input) ou toolbar
			if (t && (t.closest && (t.closest('.md-input') || t.closest('.md-toolbar')))) {
				setEditing(true);
				syncAfterLayout();
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
					el('h3', { class: 'card-title' }, a.filename || 'Imagem'),
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
								el('h3', { class: 'card-title' }, f.name || 'Imagem'),
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
			el('h5', { class: 'separator' }, 'Uploads'),
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
		const menu = el('div', { class: 'dropdown-menu limited-menu hidden' });
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
	const posLabel = el('h5', { class: 'separator' }, 'Posição');
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
	// Mantém duas estruturas: ordem (array) e membership (Set)
	let selectedTagsOrder = Array.from(initial.tags || []).map(t => t.id);
	let selectedTagsSet = new Set(selectedTagsOrder);
	const availableWrap = el('div', { class: 'tag-bucket' });
	const selectedWrap = el('div', { class: 'tag-bucket' });
	function makeTagPill(t, selected) {
		const p = pill(t.name, t.color);
		p.classList.add('tag-toggle');
		p.addEventListener('click', () => {
			if (selectedTagsSet.has(t.id)) {
				selectedTagsSet.delete(t.id);
				selectedTagsOrder = selectedTagsOrder.filter(id => id !== t.id);
			} else {
				selectedTagsSet.add(t.id);
				selectedTagsOrder.push(t.id);
			}
			renderBuckets();
		});
		return p;
	}
	function renderBuckets() {
		availableWrap.innerHTML = '';
		selectedWrap.innerHTML = '';
		// Mapa de tags por id para lookup rápido
		const byId = new Map(tags.map(t => [t.id, t]));
		// Limpa ids que não existem mais
		selectedTagsOrder = selectedTagsOrder.filter(id => byId.has(id));
		selectedTagsSet = new Set(selectedTagsOrder);
		// Adicionadas: obedecem a ordem de adição no card
		for (const id of selectedTagsOrder) {
			const t = byId.get(id);
			if (t) selectedWrap.append(makeTagPill(t, true));
		}
		// Disponíveis: qualquer ordem estável (criação)
		const avail = tags
			.filter(t => !selectedTagsSet.has(t.id))
			.sort((a, b) => {
				const pa = (a.position ?? Number.MAX_SAFE_INTEGER);
				const pb = (b.position ?? Number.MAX_SAFE_INTEGER);
				if (pa !== pb) return pa - pb;
				return (a.id || 0) - (b.id || 0);
			});
		for (const t of avail) availableWrap.append(makeTagPill(t, false));
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

	// Seleção de template (cabeçalho do formulário normal)
	let templates = [];
	let templateSelectWrap = el('div');
	async function loadTemplatesForBoard() {
		try { templates = await api.get(`/api/templates?boardId=${encodeURIComponent(window.$utils.getBoardId())}`); }
		catch { templates = []; }
		templateSelectWrap.innerHTML = '';
		// Mostrar/aplicar templates somente na criação de tarefas (não em edição e não em modo template)
		if (!templates.length || isTemplateMode || initial.id) return;
		const label = el('h5', { class: 'separator' }, 'Usar template');
		const btn = el('button', { class: 'dropdown-toggle', type: 'button' });
		const lbl = el('span', { class: 'dropdown-label' }, 'Nenhum');
		const icon = el('span', { class: 'material-symbols-outlined', 'aria-hidden': 'true' }, 'expand_more');
		btn.append(lbl, icon);
		const menu = el('div', { class: 'dropdown-menu limited-menu hidden' });
		const wrap = el('div', { class: 'dropdown' }, [btn, menu]);
		btn.addEventListener('click', () => menu.classList.toggle('hidden'));
		const none = el('button', { class: 'dropdown-item', type: 'button' }, 'Nenhum');
		none.addEventListener('click', () => {
			lbl.textContent = 'Nenhum';
			menu.classList.add('hidden');
			// limpar todo conteúdo do formulário
			title.value = '';
			descEditor.setValue('');
			selectedTagsOrder = [];
			selectedTagsSet = new Set();
			renderBuckets();
			subtasks.length = 0; renderChecklist();
			// limpar prazo
			if (dateInput) dateInput.value = '';
			if (timeInput) timeInput.value = '';
		});
		menu.append(none);
			templates.forEach(t => {
			const item = el('button', { class: 'dropdown-item', type: 'button' }, t.name + (t.is_default ? ' (padrão)' : ''));
			item.addEventListener('click', () => {
				lbl.textContent = t.name;
				menu.classList.add('hidden');
				// aplica conteúdo do template
				try {
					const c = (typeof t.content === 'string') ? JSON.parse(t.content) : (t.content || {});
					if (c.title) title.value = c.title;
					if (c.description) descEditor.setValue(c.description);
					// tags
					if (Array.isArray(c.tags)) {
						selectedTagsOrder = c.tags.slice();
						selectedTagsSet = new Set(selectedTagsOrder);
						renderBuckets();
					}
					// subtasks
					if (Array.isArray(c.subtasks)) {
						subtasks.length = 0; c.subtasks.forEach(s => subtasks.push({ title: s.title || String(s), done: !!s.done }));
						renderChecklist();
					}
						// prazo a partir de dias + hh:mm do template
						try {
							const days = c.due_days ?? 0;
							const hm = c.due_hm ?? '00:00';
							const dt = computeDueFromTemplate(days, hm);
							if (dateInput && timeInput) {
								if (typeof dt === 'string' && dt.includes('T')) {
									const [d, t] = dt.split('T');
									dateInput.value = d;
									timeInput.value = t;
								}
							}
						} catch {}
				} catch {}
			});
			menu.append(item);
		});
		templateSelectWrap.append(label, wrap);
		// aplicar padrão automaticamente
		const def = templates.find(t => t.is_default);
		if (def) {
			lbl.textContent = def.name;
			try {
				const c = (typeof def.content === 'string') ? JSON.parse(def.content) : (def.content || {});
				title.value = c.title || '';
				descEditor.setValue(c.description || '');
				if (Array.isArray(c.tags)) { selectedTagsOrder = c.tags.slice(); selectedTagsSet = new Set(selectedTagsOrder); renderBuckets(); } else { selectedTagsOrder = []; selectedTagsSet = new Set(); renderBuckets(); }
				if (Array.isArray(c.subtasks)) { subtasks.length = 0; c.subtasks.forEach(s => subtasks.push({ title: s.title || String(s), done: !!s.done })); renderChecklist(); } else { subtasks.length = 0; renderChecklist(); }
				// prazo padrão com base nas definições do template padrão
				try {
					const days = c.due_days ?? 0;
					const hm = c.due_hm ?? '00:00';
					const dt = computeDueFromTemplate(days, hm);
					if (dateInput && timeInput) {
						if (typeof dt === 'string' && dt.includes('T')) {
							const [d, t] = dt.split('T');
							dateInput.value = d;
							timeInput.value = t;
						}
					}
				} catch {}
			} catch { /* ignora parse */ }
		}
	}

	// Evita acessar 'content' antes de inicialização
	const tplNameInput = el('input', { value: initial.template_name || '', placeholder: 'Ex.: Bug padrão' });
	const content = el('div', {}, [
		el('h3', { class: 'card-title' }, isTemplateMode ? (initial.id ? 'Editar template' : 'Novo template') : (initial.id ? 'Editar tarefa' : 'Nova tarefa')),
		isTemplateMode ? el('div', { class: 'row' }, [el('h5', { class: 'separator' }, 'Nome do template'), tplNameInput]) : (!initial.id ? templateSelectWrap : el('div', { class: 'row', style: 'display:none' })),
		el('div', { class: 'row' }, [el('h5', { class: 'separator' }, 'Título'), title]),
		el('div', { class: 'row' }, [el('h5', { class: 'separator' }, 'Descrição'), descEditor.root]),
		isTemplateMode ? tplDueRow : el('div', { class: 'row', style: 'display:none' }),
		isTemplateMode ? el('div', { class: 'row', style: 'display:none' }) : dueRow,
		isTemplateMode ? el('div', { class: 'row', style: 'display:none' }) : el('div', { class: 'row' }, [attachmentsSection()]),
		// Linha com Coluna (80%) e Posição (20%) lado a lado
		isTemplateMode ? el('div', { class: 'row', style: 'display:none' }) : el('div', { class: 'row', style: 'display:flex; gap:8px; align-items:flex-start;' }, [
			el('div', { style: 'flex: 0 0 80%; max-width: 80%;' }, [el('h5', { class: 'separator' }, 'Coluna'), cats.length ? catDropdown : el('div', { class: 'muted' }, 'Nenhuma coluna disponível')]),
			el('div', { style: 'flex: 0 0 20%; max-width: 20%; padding-left: 8px;' }, [posLabel, posDropdown])
		]),
		el('div', { class: 'row' }, [
			el('h5', { class: 'separator' }, 'Checklist'),
			el('div', {}, [
				checklistWrap,
				el('div', { class: 'checklist-actions' }, [inputNew, btnAddSub])
			])
		]),
		el('div', { class: 'row' }, [
			el('h5', { class: 'separator' }, 'Responsáveis'),
			isTemplateMode ? el('div', { class: 'muted' }, 'Não aplicável em template') : el('div', { class: 'tag-dual' }, [
				el('div', { class: 'tag-bucket-wrap' }, [el('small', { class: 'muted' }, 'Disponíveis'), assigneesAvailable]),
				el('div', { class: 'tag-bucket-wrap' }, [el('small', { class: 'muted' }, 'Atribuídos'), assigneesSelected]),
			])
		]),
		el('div', { class: 'row' }, [
			el('h5', { class: 'separator' }, 'Tags'),
			el('div', { class: 'tag-dual' }, [
				el('div', { class: 'tag-bucket-wrap' }, [el('small', { class: 'muted' }, 'Disponíveis'), availableWrap]),
				el('div', { class: 'tag-bucket-wrap' }, [el('small', { class: 'muted' }, 'Adicionadas'), selectedWrap]),
			])
		]),
		el('footer', {}, [
					el('button', { class: 'btn-danger', onclick: Modal.close }, 'Cancelar'),
					el('button', { onclick: async () => {
						if (!title.value.trim()) { await alertModal({ title: 'Campo obrigatório', message: 'Título é obrigatório.' }); return; }
						if (!isTemplateMode && (!chosenCatId || !cats.length)) { await alertModal({ title: 'Seleção necessária', message: 'Crie uma coluna antes de adicionar tarefas.' }); return; }
					// Monta due_at a partir de data e hora separados
					let due_at_iso = null;
					if (!isTemplateMode) {
						const d = (dateInput.value || '').trim();
						const t = (timeInput.value || '').trim();
						if (d && t) {
							const dtLocal = `${d}T${t}`; // interpretado como local
							try { due_at_iso = new Date(dtLocal).toISOString(); } catch {}
						}
					}
					const payload = { title: title.value.trim(), description: descEditor.getValue().trim(), category_id: isTemplateMode ? null : Number(chosenCatId), due_at: isTemplateMode ? null : due_at_iso };
				try {
						let saved;
			if (isTemplateMode) {
							// Salvar/atualizar template
							const tplContent = {
								title: payload.title,
								description: payload.description,
								tags: selectedTagsOrder.slice(),
				subtasks: subtasks.map(s => ({ title: s.title, done: !!s.done })),
				due_days: parseInt(tplDueDaysInput.value || '0', 10) || 0,
				due_hm: (tplDueTimeInput.value || '00:00')
							};
							const boardId = window.$utils.getBoardId();
							const nameInput = tplNameInput;
							const tplName = (nameInput?.value || initial.template_name || 'Template').trim();
							if (!tplName) { await alertModal({ title: 'Nome obrigatório', message: 'Informe um nome para o template.' }); return; }
							if (initial.id) saved = await api.put(`/api/templates/${initial.id}`, { name: tplName, content: tplContent, is_default: !!initial.is_default });
							else saved = await api.post('/api/templates', { board_id: boardId, name: tplName, content: tplContent, is_default: !!initial.is_default });
							// avisa gerenciadores para atualizarem
							try { document.dispatchEvent(new CustomEvent('templatesChanged')); } catch {}
						} else {
							if (initial.id) saved = await api.put(`/api/tasks/${initial.id}`, payload);
							else saved = await api.post('/api/tasks', payload);
							const tagsArr = selectedTagsOrder.slice();
							await api.post(`/api/tasks/${saved.id}/tags`, { tags: tagsArr });
						}
				// Operações somente para tarefas (não em modo template)
				if (!isTemplateMode) {
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
						// Em nova tarefa: cria todas as subtarefas (inclui as vindas de template)
						// Em edição: cria apenas as marcadas como temporárias
						if (!initial.id || s._temp) {
							await api.post(`/api/tasks/${saved.id}/subtasks`, { title: s.title, done: !!s.done });
						}
					}
					// Upload de anexos pendentes (quando criar nova tarefa)
					if (!initial.id && pendingFiles.length) {
						for (const f of pendingFiles) {
							try { await uploadFileToTask(saved.id, f); } catch {}
						}
					}
					// Após salvar, mover para a posição selecionada
					try { await api.post(`/api/tasks/${saved.id}/move`, { toCategoryId: Number(chosenCatId), toPosition: Number(chosenPos || 1) }); } catch {}
				}
					Modal.close();
						if (!isTemplateMode) document.dispatchEvent(new CustomEvent('refreshBoard'));
				} catch (e) {
					let msg = 'Não foi possível salvar a tarefa.';
					try { const j = JSON.parse(e.message); if (j.error) msg = j.error; } catch {}
					await alertModal({ title: 'Erro', message: msg });
				}
			} }, 'Salvar'),
		]),
	]);
		await loadTemplatesForBoard();
	// ao retomar este modal (após fechar o de nova tag), recarrega tags e re-renderiza buckets
	content.addEventListener('modal:resumed', async () => {
		try {
			const fresh = await api.get(`/api/tags?boardId=${encodeURIComponent(window.$utils.getBoardId() || '')}`);
			tags.length = 0; fresh.forEach(t => tags.push(t));
			renderBuckets();
		} catch {}
	});
	// Atualiza buckets se uma tag foi criada/alterada em outro modal sem empilhar (evento global)
	const onTagsChanged = async () => {
		try {
			const fresh = await api.get(`/api/tags?boardId=${encodeURIComponent(window.$utils.getBoardId() || '')}`);
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

	function enableDrag(container) {
		container.querySelectorAll('.tag-row').forEach((row) => {
			row.setAttribute('draggable', 'true');
			row.addEventListener('dragstart', () => row.classList.add('dragging'));
			row.addEventListener('dragend', async () => {
				row.classList.remove('dragging');
				// Persistir nova ordem
				const order = [...container.querySelectorAll('.tag-row')].map(r => Number(r.dataset.id)).filter(Boolean);
				try {
					const boardId = window.$utils.getBoardId();
					await api.post('/api/tags/reorder', { boardId, order });
					// Dispara refresh geral
					document.dispatchEvent(new CustomEvent('tagsChanged'));
				} catch {}
			});
		});
		container.addEventListener('dragover', (e) => {
			e.preventDefault();
			const after = (() => {
				const els = [...container.querySelectorAll('.tag-row:not(.dragging)')];
				let closest = null; let closestOffset = Number.NEGATIVE_INFINITY;
				for (const el of els) {
					const box = el.getBoundingClientRect();
					const offset = e.clientY - box.top - box.height / 2;
					if (offset < 0 && offset > closestOffset) { closestOffset = offset; closest = el; }
				}
				return closest;
			})();
			const dragging = container.querySelector('.tag-row.dragging');
			if (!dragging) return;
			if (!after) container.append(dragging); else container.insertBefore(dragging, after);
		});
	}
	async function refresh() {
		listEl.innerHTML = '';
		const boardId = window.$utils.getBoardId();
		const tags = await api.get(`/api/tags?boardId=${encodeURIComponent(boardId || '')}`);
		if (!tags.length) { listEl.append(el('p', { class: 'muted' }, 'Nenhuma tag.')); return; }
			tags.forEach(t => {
			const left = el('div', { class: 'tag-left' }, [
				el('span', { class: 'material-symbols-outlined drag-handle', title: 'Arraste para reordenar', 'aria-hidden': 'true' }, 'drag_indicator'),
				pill(t.name, t.color),
				t.description ? el('small', { class: 'muted' }, ` — ${t.description}`) : ''
			]);
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
			const row = el('div', { class: 'tag-row', 'data-id': String(t.id) }, [left, actions]);
			listEl.append(row);
		});
		enableDrag(listEl);
	}
	await refresh();
	root.append(
		el('h3', { class: 'card-title' }, 'Tags'),
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
		['Alt + E', 'Abrir gerenciador de tags'],
		['Alt + T', 'Abrir gerenciador de templates'],
		['Alt + M', 'Convites pendentes'],
		['Alt + S', 'Compartilhar quadro'],
		['Alt + Q', 'Novo quadro'],
		['Alt + H', 'Abrir ajuda'],
		['Esc', 'Fechar modais']
	];
	const list = el('ul', { class: 'help-list' }, items.map(([k, d]) => el('li', {}, [el('code', {}, k), ' — ', d])));
	// Removido botão de gerenciar quadros aqui; gestão fica na sidebar
	return el('div', {}, [
		el('h3', { class: 'card-title' }, 'Atalhos do teclado'),
		el('p', { class: 'muted' }, 'Use Alt + tecla nas combinações abaixo:'),
		list,
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
		el('h3', { class: 'card-title' }, 'Quadros'),
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
		el('h3', { class: 'card-title' }, initial.id ? 'Editar quadro' : 'Novo quadro'),
		el('div', { class: 'row' }, [el('h5', { class: 'separator' }, 'Nome'), name]),
		el('div', { class: 'row' }, [el('h5', { class: 'separator' }, 'Descrição'), description]),
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
