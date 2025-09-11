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
		// Inicia vazio ao criar novo template; mantém valores ao editar
		const tplDueDaysInput = el('input', { type: 'number', min: '0', step: '1', value: (initial.id ? (initial.due_days ?? '') : ''), placeholder: '0', style: 'flex: 0 0 auto;' });
		const tplDueTimeInput = el('input', { type: 'time', value: (initial.id ? (initial.due_hm ?? '') : ''), placeholder: '00:00', style: 'flex: 0 0 auto;' });
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

	// Editor de texto avançado com formatação rica
	function createAdvancedEditor(initialText = '') {
		// Criar o container principal
		const editorContainer = el('div', { class: 'advanced-editor-container' });
		
		// Criar toolbar
		const toolbar = el('div', { class: 'editor-toolbar' }, [
			// Grupo de Formatação
			el('div', { class: 'toolbar-group' }, [
				el('label', { class: 'toolbar-label' }, 'Formatação'),
				el('div', { class: 'button-group' }, [
					el('button', { 
						class: 'btn-editor', 
						type: 'button',
						title: 'Negrito (Ctrl+B)',
						onclick: (e) => { e.preventDefault(); formatText('bold'); }
					}, el('i', { class: 'fas fa-bold' })),
					el('button', { 
						class: 'btn-editor', 
						type: 'button',
						title: 'Itálico (Ctrl+I)',
						onclick: (e) => { e.preventDefault(); formatText('italic'); }
					}, el('i', { class: 'fas fa-italic' })),
					el('button', { 
						class: 'btn-editor', 
						type: 'button',
						title: 'Sublinhado (Ctrl+U)',
						onclick: (e) => { e.preventDefault(); formatText('underline'); }
					}, el('i', { class: 'fas fa-underline' })),
					el('button', { 
						class: 'btn-editor', 
						type: 'button',
						title: 'Riscado',
						onclick: (e) => { e.preventDefault(); formatText('strikeThrough'); }
					}, el('i', { class: 'fas fa-strikethrough' }))
				])
			]),
			
			// Grupo de Fonte
			el('div', { class: 'toolbar-group' }, [
				el('label', { class: 'toolbar-label' }, 'Fonte'),
				el('div', { class: 'select-group' }, [
					el('select', { 
						id: 'editorFontFamily',
						title: 'Família da Fonte',
						style: 'width: 160px',
						onchange: () => changeFontFamily()
					}, [
						el('option', { value: 'Inter' }, 'Inter'),
						el('option', { value: 'Arial' }, 'Arial'),
						el('option', { value: 'Times New Roman' }, 'Times New Roman'),
						el('option', { value: 'Helvetica' }, 'Helvetica'),
						el('option', { value: 'Georgia' }, 'Georgia'),
						el('option', { value: 'Verdana' }, 'Verdana'),
						el('option', { value: 'monospace' }, 'Monospace')
					]),
					el('select', { 
						id: 'editorFontSize',
						title: 'Tamanho da Fonte',
						style: 'width: 60px',
						onchange: () => changeFontSize()
					}, [
						el('option', { value: '12' }, '12px'),
						el('option', { value: '13' }, '13px'),
						el('option', { value: '14' }, '14px'),
						el('option', { value: '16', selected: true }, '16px'),
						el('option', { value: '18' }, '18px'),
						el('option', { value: '20' }, '20px'),
						el('option', { value: '24' }, '24px'),
						el('option', { value: '32' }, '32px'),
						el('option', { value: '48' }, '48px')
					])
				])
			]),
			
			// Grupo de Cores
			el('div', { class: 'toolbar-group' }, [
				el('label', { class: 'toolbar-label' }, 'Cores'),
				el('div', { class: 'color-group' }, [
					el('div', { class: 'color-picker-wrapper' }, [
						el('input', { 
							type: 'color', 
							id: 'editorTextColor', 
							value: '#000000',
							title: 'Cor do Texto',
							onchange: () => changeTextColor()
						}),
						el('button', { 
							type: 'button',
							id: 'textColorBtn',
							class: 'color-label',
							title: 'Cor do Texto',
							style: 'color: #000000',
							onclick: () => { saveCurrentSelection(); document.getElementById('editorTextColor').click(); }
						}, el('i', { class: 'fas fa-font' }))
					]),
					el('div', { class: 'color-picker-wrapper' }, [
						el('input', { 
							type: 'color', 
							id: 'editorBackgroundColor', 
							value: '#ffffff',
							title: 'Cor de Fundo',
							onchange: () => changeBackgroundColor()
						}),
						el('button', { 
							type: 'button',
							id: 'backgroundColorBtn',
							class: 'color-label',
							title: 'Cor de Fundo',
							style: 'background-color: #ffffff; color: #000',
							onclick: () => { saveCurrentSelection(); document.getElementById('editorBackgroundColor').click(); }
						}, el('i', { class: 'fas fa-highlighter' }))
					])
				])
			]),
			
			// Grupo de Alinhamento
			el('div', { class: 'toolbar-group' }, [
				el('label', { class: 'toolbar-label' }, 'Alinhamento'),
				el('div', { class: 'button-group' }, [
					el('button', { 
						class: 'btn-editor', 
						type: 'button',
						title: 'Alinhar à Esquerda',
						onclick: (e) => { e.preventDefault(); alignText('left'); }
					}, el('i', { class: 'fas fa-align-left' })),
					el('button', { 
						class: 'btn-editor', 
						type: 'button',
						title: 'Centralizar',
						onclick: (e) => { e.preventDefault(); alignText('center'); }
					}, el('i', { class: 'fas fa-align-center' })),
					el('button', { 
						class: 'btn-editor', 
						type: 'button',
						title: 'Alinhar à Direita',
						onclick: (e) => { e.preventDefault(); alignText('right'); }
					}, el('i', { class: 'fas fa-align-right' })),
					el('button', { 
						class: 'btn-editor', 
						type: 'button',
						title: 'Justificar',
						onclick: (e) => { e.preventDefault(); alignText('justify'); }
					}, el('i', { class: 'fas fa-align-justify' }))
				])
			]),
			
			// Grupo de Listas
			el('div', { class: 'toolbar-group' }, [
				el('label', { class: 'toolbar-label' }, 'Listas'),
				el('div', { class: 'button-group' }, [
					el('button', { 
						class: 'btn-editor', 
						type: 'button',
						title: 'Lista com Marcadores',
						onclick: (e) => { e.preventDefault(); formatText('insertUnorderedList'); }
					}, el('i', { class: 'fas fa-list-ul' })),
					el('button', { 
						class: 'btn-editor', 
						type: 'button',
						title: 'Lista Numerada',
						onclick: (e) => { e.preventDefault(); formatText('insertOrderedList'); }
					}, el('i', { class: 'fas fa-list-ol' }))
				])
			]),
			
			// Grupo de Estilos
			el('div', { class: 'toolbar-group' }, [
				el('label', { class: 'toolbar-label' }, 'Estilo'),
				el('div', { class: 'select-group' }, [
					el('select', { 
						id: 'editorFormatBlock',
						title: 'Estilo do Texto',
						onchange: () => changeFormatBlock()
					}, [
						el('option', { value: 'div' }, 'Normal'),
						el('option', { value: 'blockquote' }, 'Citação'),
						el('option', { value: 'pre' }, 'Código')
					])
				])
			]),
			
			// Grupo de Recuo
			el('div', { class: 'toolbar-group' }, [
				el('label', { class: 'toolbar-label' }, 'Recuo'),
				el('div', { class: 'button-group' }, [
					el('button', { 
						class: 'btn-editor', 
						type: 'button',
						title: 'Diminuir Recuo',
						onclick: (e) => { e.preventDefault(); formatText('outdent'); }
					}, el('i', { class: 'fas fa-outdent' })),
					el('button', { 
						class: 'btn-editor', 
						type: 'button',
						title: 'Aumentar Recuo',
						onclick: (e) => { e.preventDefault(); formatText('indent'); }
					}, el('i', { class: 'fas fa-indent' }))
				])
			]),
			
			// Grupo de Inserir
			el('div', { class: 'toolbar-group' }, [
				el('label', { class: 'toolbar-label' }, 'Inserir'),
				el('div', { class: 'button-group' }, [
					el('button', { 
						class: 'btn-editor', 
						type: 'button',
						title: 'Inserir Link',
						onclick: (e) => { e.preventDefault(); showLinkModal(); }
					}, el('i', { class: 'fas fa-link' })),
					el('button', { 
						class: 'btn-editor', 
						type: 'button',
						title: 'Inserir Tabela',
						onclick: (e) => { e.preventDefault(); showTableModal(); }
					}, el('i', { class: 'fas fa-table' }))
				])
			])
		]);
		
		// Criar o editor contenteditable
		const editor = el('div', {
			contenteditable: 'true',
			class: 'advanced-editor',
			placeholder: 'Digite aqui a descrição...',
			spellcheck: 'true'
		});
		
		// Definir conteúdo inicial
		if (initialText) {
			editor.innerHTML = initialText;
		}
		
		// Variáveis para funcionalidade do editor
		let savedSelection = null;
		let isApplyingToolbar = false;
		// Guarda últimas escolhas do usuário para não serem sobrescritas enquanto a seleção estiver colapsada
		const lastChosen = {
			fontFamily: null,
			fontSizePx: null,
			textColor: null,
			bgColor: null,
			align: null
		};

		// Utilitários para manter a seleção ao interagir com a toolbar
		function saveCurrentSelection() {
			try {
				const sel = window.getSelection();
				if (!sel || sel.rangeCount === 0) return;
				const rng = sel.getRangeAt(0);
				if (editor.contains(rng.startContainer) && editor.contains(rng.endContainer)) {
					savedSelection = rng.cloneRange();
				}
			} catch {}
		}

		function restoreSelection() {
			try {
				if (!savedSelection) return;
				const sel = window.getSelection();
				sel.removeAllRanges();
				sel.addRange(savedSelection);
			} catch {}
		}
		
		// Funções do editor
		function formatText(command, value = null) {
			restoreSelection();
			editor.focus();
			isApplyingToolbar = true;
			try {
				document.execCommand(command, false, value);
			} finally {
				isApplyingToolbar = false;
			}
			updateToolbarState();
		}
		
		function changeFontFamily() {
			const fontFamily = document.getElementById('editorFontFamily').value;
			restoreSelection();
			document.execCommand('styleWithCSS', false, true);
			formatText('fontName', fontFamily);
			document.execCommand('styleWithCSS', false, false);
			lastChosen.fontFamily = fontFamily;
			// Reforça visual imediatamente
			const sel = document.getElementById('editorFontFamily'); if (sel) sel.value = fontFamily;
		}
		
		function changeFontSize() {
			const fontSizePx = parseInt(document.getElementById('editorFontSize').value, 10) || 16;
			// Mapear px para 1..7 (tamanhos fixos execCommand)
			const htmlSizesPx = [10, 13, 16, 18, 24, 32, 48];
			let best = 3;
			let bestDiff = Infinity;
			htmlSizesPx.forEach((v,i)=>{ const d=Math.abs(v-fontSizePx); if(d<bestDiff){bestDiff=d; best=i+1;} });
			restoreSelection();
			document.execCommand('styleWithCSS', false, true);
			formatText('fontSize', String(best));
			document.execCommand('styleWithCSS', false, false);
			lastChosen.fontSizePx = fontSizePx;
			const sel = document.getElementById('editorFontSize'); if (sel) sel.value = String(fontSizePx);
		}
		
		function changeTextColor() {
			const color = document.getElementById('editorTextColor').value;
			const colorBtn = document.getElementById('textColorBtn');
			
			// Atualizar a cor do botão
			colorBtn.style.color = color;
			
			restoreSelection();
			editor.focus();
			document.execCommand('styleWithCSS', false, true);
			formatText('foreColor', color);
			document.execCommand('styleWithCSS', false, false);
			lastChosen.textColor = color;
		}
		
		function changeBackgroundColor() {
			const color = document.getElementById('editorBackgroundColor').value;
			const colorBtn = document.getElementById('backgroundColorBtn');
			
			// Atualizar a cor de fundo do botão
			colorBtn.style.backgroundColor = color;
			// Ajustar cor do texto para contraste
			const rgb = hexToRgb(color);
			const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
			colorBtn.style.color = brightness > 128 ? '#000' : '#fff';
			
			restoreSelection();
			editor.focus();
			document.execCommand('styleWithCSS', false, true);
			// Tenta primeiro hiliteColor, depois backColor
			if (!document.execCommand('hiliteColor', false, color)) {
				document.execCommand('backColor', false, color);
			}
			document.execCommand('styleWithCSS', false, false);
			lastChosen.bgColor = color;
		}

		// Aplica formatação escolhida caso o editor esteja vazio (para que a próxima digitação use o estilo da toolbar)
		function applyLastChosenIfEmpty() {
			if (isApplyingToolbar) return;
			// Considera vazio se não há texto ou apenas <br>/espacos
			const raw = editor.innerHTML.trim();
			const isEmpty = !editor.textContent.trim() && (raw === '' || raw.toLowerCase() === '<br>' || raw === '&nbsp;');
			if (!isEmpty) return;
			isApplyingToolbar = true;
			try {
				// Garante um ponto de inserção visível
				if (raw === '' || raw === '&nbsp;') {
					editor.innerHTML = '<br>';
				}
				// Coloca o cursor no começo
				const rng = document.createRange();
				rng.selectNodeContents(editor);
				rng.collapse(true);
				const sel = window.getSelection();
				sel.removeAllRanges();
				sel.addRange(rng);
				savedSelection = rng.cloneRange();
				document.execCommand('styleWithCSS', false, true);
				if (lastChosen.fontFamily) {
					document.execCommand('fontName', false, lastChosen.fontFamily);
				}
				if (lastChosen.fontSizePx) {
					const px = lastChosen.fontSizePx;
					const htmlSizesPx = [10, 13, 16, 18, 24, 32, 48];
					let best = 3; let bestDiff = Infinity;
					htmlSizesPx.forEach((v,i)=>{ const d=Math.abs(v-px); if(d<bestDiff){bestDiff=d; best=i+1;} });
					document.execCommand('fontSize', false, String(best));
				}
				if (lastChosen.textColor) {
					document.execCommand('foreColor', false, lastChosen.textColor);
				}
				if (lastChosen.bgColor) {
					if (!document.execCommand('hiliteColor', false, lastChosen.bgColor)) {
						document.execCommand('backColor', false, lastChosen.bgColor);
					}
				}
				document.execCommand('styleWithCSS', false, false);
			} catch {} finally {
				isApplyingToolbar = false;
				updateToolbarState();
			}
		}
		
		// Função auxiliar para converter hex para rgb
		function hexToRgb(hex) {
			const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
			return result ? {
				r: parseInt(result[1], 16),
				g: parseInt(result[2], 16),
				b: parseInt(result[3], 16)
			} : null;
		}
		
		function alignText(alignment) {
			const commands = {
				'left': 'justifyLeft',
				'center': 'justifyCenter',
				'right': 'justifyRight',
				'justify': 'justifyFull'
			};
			lastChosen.align = alignment;
			formatText(commands[alignment]);
			// Atualiza imediatamente estado visual dos botões de alinhamento
			['left','center','right','justify'].forEach(a => {
				const map = { left: 'Esquerda', center: 'Centralizar', right: 'Direita', justify: 'Justificar' };
				const btn = toolbar.querySelector(`button[title*="${map[a]}"]`);
				if (btn) btn.classList.toggle('active', a === alignment);
			});
		}
		
		function changeFormatBlock() {
			const format = document.getElementById('editorFormatBlock').value;
			formatText('formatBlock', format);
		}
		
		function showLinkModal() {
			const selection = window.getSelection();
			const selectedText = selection.toString();
			
			// Salvar seleção
			savedSelection = null;
			if (selection.rangeCount > 0) {
				savedSelection = selection.getRangeAt(0);
			}
			
			// Criar modal
			const linkModal = el('div', { class: 'link-modal-overlay' }, [
				el('div', { class: 'link-modal' }, [
					el('div', { class: 'link-modal-header' }, [
						el('h3', {}, 'Inserir Link'),
						el('button', {
							type: 'button',
							class: 'link-modal-close',
							onclick: () => closeLinkModal()
						}, '×')
					]),
					el('div', { class: 'link-modal-body' }, [
						el('div', { class: 'form-group' }, [
							el('label', { for: 'linkUrl' }, 'URL:'),
							el('input', {
								type: 'url',
								id: 'linkUrl',
								placeholder: 'https://exemplo.com',
								required: true
							})
						]),
						el('div', { class: 'form-group' }, [
							el('label', { for: 'linkText' }, 'Texto do Link:'),
							el('input', {
								type: 'text',
								id: 'linkText',
								placeholder: 'Digite o texto que aparecerá',
								value: selectedText || '',
								required: true
							})
						])
					]),
					el('div', { class: 'link-modal-footer' }, [
						el('button', {
							type: 'button',
							class: 'btn-cancel',
							onclick: () => closeLinkModal()
						}, 'Cancelar'),
						el('button', {
							type: 'button',
							class: 'btn-primary',
							onclick: () => insertLinkFromModal()
						}, 'Inserir Link')
					])
				])
			]);
			
			document.body.appendChild(linkModal);
			document.getElementById('linkUrl').focus();
			
			// Fechar com ESC
			const escHandler = (e) => {
				if (e.key === 'Escape') {
					closeLinkModal();
					document.removeEventListener('keydown', escHandler);
				}
			};
			document.addEventListener('keydown', escHandler);
			
			function closeLinkModal() {
				if (linkModal.parentNode) {
					linkModal.parentNode.removeChild(linkModal);
				}
			}
			
			function insertLinkFromModal() {
				const url = document.getElementById('linkUrl').value.trim();
				const text = document.getElementById('linkText').value.trim();
				
				if (!url || !text) {
					alert('Por favor, preencha a URL e o texto do link.');
					return;
				}
				
				// Restaurar seleção
				if (savedSelection) {
					const selection = window.getSelection();
					selection.removeAllRanges();
					selection.addRange(savedSelection);
				}
				
				editor.focus();
				
				// Sempre abrir em nova guia
				const linkHtml = `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`;
				
				if (selectedText && savedSelection) {
					// Substituir texto selecionado
					document.execCommand('insertHTML', false, linkHtml);
				} else {
					// Inserir novo link
					document.execCommand('insertHTML', false, linkHtml);
				}
				
				closeLinkModal();
				updateToolbarState();
			}
		}
		
		function showTableModal() {
			// Salvar seleção
			savedSelection = null;
			const selection = window.getSelection();
			if (selection.rangeCount > 0) {
				savedSelection = selection.getRangeAt(0);
			}
			
			// Criar modal
			const tableModal = el('div', { class: 'table-modal-overlay' }, [
				el('div', { class: 'table-modal' }, [
					el('div', { class: 'table-modal-header' }, [
						el('h3', {}, 'Inserir Tabela'),
						el('button', {
							type: 'button',
							class: 'table-modal-close',
							onclick: () => closeTableModal()
						}, '×')
					]),
					el('div', { class: 'table-modal-body' }, [
						el('div', { class: 'form-row' }, [
							el('div', { class: 'form-group' }, [
								el('label', { for: 'tableRows' }, 'Linhas:'),
								el('input', {
									type: 'number',
									id: 'tableRows',
									min: '1',
									max: '20',
									value: '3'
								})
							]),
							el('div', { class: 'form-group' }, [
								el('label', { for: 'tableCols' }, 'Colunas:'),
								el('input', {
									type: 'number',
									id: 'tableCols',
									min: '1',
									max: '10',
									value: '3'
								})
							])
						]),
						el('div', { class: 'form-group' }, [
							el('label', {}, [
								el('input', {
									type: 'checkbox',
									id: 'tableHeader',
									checked: true
								}),
								' Incluir cabeçalho'
							])
						]),
						el('div', { class: 'table-preview' }, [
							el('h4', {}, 'Visualização:'),
							el('div', { id: 'tablePreviewContainer' })
						])
					]),
					el('div', { class: 'table-modal-footer' }, [
						el('button', {
							type: 'button',
							class: 'btn-cancel',
							onclick: () => closeTableModal()
						}, 'Cancelar'),
						el('button', {
							type: 'button',
							class: 'btn-primary',
							onclick: () => insertTableFromModal()
						}, 'Inserir Tabela')
					])
				])
			]);
			
			document.body.appendChild(tableModal);
			
			// Atualizar preview inicial
			updateTablePreview();
			
			// Event listeners para atualizar preview
			document.getElementById('tableRows').addEventListener('input', updateTablePreview);
			document.getElementById('tableCols').addEventListener('input', updateTablePreview);
			document.getElementById('tableHeader').addEventListener('change', updateTablePreview);
			
			// Fechar com ESC
			const escHandler = (e) => {
				if (e.key === 'Escape') {
					closeTableModal();
					document.removeEventListener('keydown', escHandler);
				}
			};
			document.addEventListener('keydown', escHandler);
			
			function updateTablePreview() {
				const rows = parseInt(document.getElementById('tableRows').value) || 3;
				const cols = parseInt(document.getElementById('tableCols').value) || 3;
				const hasHeader = document.getElementById('tableHeader').checked;
				
				const previewContainer = document.getElementById('tablePreviewContainer');
				previewContainer.innerHTML = '';
				
				const table = el('table', { class: 'table-preview-table' });
				
				// Criar cabeçalho se necessário
				if (hasHeader) {
					const thead = el('thead');
					const headerRow = el('tr');
					for (let j = 0; j < cols; j++) {
						headerRow.appendChild(el('th', {}, `Coluna ${j + 1}`));
					}
					thead.appendChild(headerRow);
					table.appendChild(thead);
				}
				
				// Criar corpo da tabela
				const tbody = el('tbody');
				const startRow = hasHeader ? 1 : 0;
				for (let i = startRow; i < rows; i++) {
					const row = el('tr');
					for (let j = 0; j < cols; j++) {
						row.appendChild(el('td', {}, hasHeader ? `Célula ${i},${j + 1}` : `Célula ${i + 1},${j + 1}`));
					}
					tbody.appendChild(row);
				}
				table.appendChild(tbody);
				
				previewContainer.appendChild(table);
			}
			
			function closeTableModal() {
				if (tableModal.parentNode) {
					tableModal.parentNode.removeChild(tableModal);
				}
			}
			
			function insertTableFromModal() {
				const rows = parseInt(document.getElementById('tableRows').value) || 3;
				const cols = parseInt(document.getElementById('tableCols').value) || 3;
				const hasHeader = document.getElementById('tableHeader').checked;
				
				// Restaurar seleção
				if (savedSelection) {
					const selection = window.getSelection();
					selection.removeAllRanges();
					selection.addRange(savedSelection);
				}
				
				editor.focus();
				
				// Criar HTML da tabela
				let tableHtml = '<table class="editor-table" border="1" cellpadding="8" cellspacing="0">';
				
				// Cabeçalho
				if (hasHeader) {
					tableHtml += '<thead><tr>';
					for (let j = 0; j < cols; j++) {
						tableHtml += '<th>Cabeçalho</th>';
					}
					tableHtml += '</tr></thead>';
				}
				
				// Corpo
				tableHtml += '<tbody>';
				const startRow = hasHeader ? 1 : 0;
				for (let i = startRow; i < rows; i++) {
					tableHtml += '<tr>';
					for (let j = 0; j < cols; j++) {
						tableHtml += '<td>&nbsp;</td>';
					}
					tableHtml += '</tr>';
				}
				tableHtml += '</tbody></table><p>&nbsp;</p>';
				
				document.execCommand('insertHTML', false, tableHtml);
				
				closeTableModal();
				updateToolbarState();
			}
		}
		
		function updateToolbarState() {
			if (isApplyingToolbar) return;
			// Atualizar estado dos botões baseado na formatação atual
			const buttons = toolbar.querySelectorAll('.btn-editor');
			buttons.forEach(btn => btn.classList.remove('active'));
			
			// Verificar formatação ativa
			try {
				if (document.queryCommandState('bold')) {
					const boldBtn = toolbar.querySelector('button[title*="Negrito"]');
					if (boldBtn) boldBtn.classList.add('active');
				}
				if (document.queryCommandState('italic')) {
					const italicBtn = toolbar.querySelector('button[title*="Itálico"]');
					if (italicBtn) italicBtn.classList.add('active');
				}
				if (document.queryCommandState('underline')) {
					const underlineBtn = toolbar.querySelector('button[title*="Sublinhado"]');
					if (underlineBtn) underlineBtn.classList.add('active');
				}
				if (document.queryCommandState('strikeThrough')) {
					const strikeBtn = toolbar.querySelector('button[title*="Riscado"]');
					if (strikeBtn) strikeBtn.classList.add('active');
				}
				
				// Atualizar seletor de estilo baseado no elemento atual
				const selection = window.getSelection();
				const formatSelect = document.getElementById('editorFormatBlock');
				
				if (selection.rangeCount > 0 && formatSelect) {
					const range = selection.getRangeAt(0);
					let node = range.startContainer;
					
					if (node.nodeType === Node.TEXT_NODE) {
						node = node.parentNode;
					}
					
					// Procurar o elemento de bloco mais próximo
					let currentStyle = 'div'; // padrão
					let currentNode = node;
					
					while (currentNode && currentNode !== editor) {
						const tagName = currentNode.tagName;
						if (tagName === 'BLOCKQUOTE') {
							currentStyle = 'blockquote';
							break;
						} else if (tagName === 'PRE') {
							currentStyle = 'pre';
							break;
						} else if (tagName === 'H1') {
							currentStyle = 'h1';
							break;
						} else if (tagName === 'H2') {
							currentStyle = 'h2';
							break;
						} else if (tagName === 'H3') {
							currentStyle = 'h3';
							break;
						} else if (tagName === 'H4') {
							currentStyle = 'h4';
							break;
						} else if (tagName === 'P') {
							currentStyle = 'div'; // tratamos P como div/normal
							break;
						}
						currentNode = currentNode.parentNode;
					}
					
					// Atualizar o select
					formatSelect.value = currentStyle;
				}
				
				// Atualizar seletores de fonte e tamanho baseado no elemento atual
				if (selection.rangeCount > 0) {
					const range = selection.getRangeAt(0);
					let node = range.startContainer;
					if (node.nodeType === Node.TEXT_NODE) {
						node = node.parentNode;
					}

					const selectionCollapsed = range.collapsed;
					
					// Verificar fonte somente se a seleção não estiver colapsada; se colapsada mantemos última escolha
					const computedStyle = window.getComputedStyle(node);
					const fontFamily = selectionCollapsed && lastChosen.fontFamily ? lastChosen.fontFamily : computedStyle.fontFamily;
					const fontSize = selectionCollapsed && lastChosen.fontSizePx ? lastChosen.fontSizePx : parseInt(computedStyle.fontSize);
					
					// Atualizar seletores se possível
					const fontFamilySelect = document.getElementById('editorFontFamily');
					const fontSizeSelect = document.getElementById('editorFontSize');
					
					if (fontFamilySelect && fontFamily) {
						// Procurar match aproximado
						for (let option of fontFamilySelect.options) {
							if (fontFamily.toLowerCase().includes(option.value.toLowerCase())) {
								fontFamilySelect.value = option.value;
								break;
							}
						}
					}
					
					if (fontSizeSelect && fontSize) {
						const opt = Array.from(fontSizeSelect.options).find(o => parseInt(o.value) === fontSize);
						if (opt) fontSizeSelect.value = opt.value;
					}

					// Alinhamento: marcar botão ativo
					(function handleAlignButtons(){
						let n = node; let alignFound = null;
						while (n && n !== editor) {
							const cs = window.getComputedStyle(n);
							if (cs.textAlign && cs.textAlign !== 'start') { alignFound = cs.textAlign; break; }
							n = n.parentElement;
						}
						if (!alignFound) alignFound = 'left';
						lastChosen.align = alignFound;
						const map = { left: 'Esquerda', center: 'Centralizar', right: 'Direita', justify: 'Justificar' };
						['left','center','right','justify'].forEach(a => {
							const titleFrag = map[a];
							const btn = toolbar.querySelector(`button[title*="${titleFrag}"]`);
							if (btn) btn.classList.toggle('active', (a === 'justify' ? alignFound === 'justify' : alignFound === a));
						});
					})();
					
					// Atualizar cores dos botões baseado no estilo computado
					const textColorBtn = document.getElementById('textColorBtn');
					const backgroundColorBtn = document.getElementById('backgroundColorBtn');
					const textColorInput = document.getElementById('editorTextColor');
					const backgroundColorInput = document.getElementById('editorBackgroundColor');
					
					if (textColorBtn && textColorInput) {
						const textColor = computedStyle.color;
						const rgbMatch = textColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
						if (rgbMatch) {
							const hex = rgbToHex(parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3]));
							const finalHex = selectionCollapsed && lastChosen.textColor ? lastChosen.textColor : hex;
							textColorInput.value = finalHex;
							textColorBtn.style.color = finalHex;
						}
					}
					
					if (backgroundColorBtn && backgroundColorInput) {
						const bgColor = computedStyle.backgroundColor;
						if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
							const rgbMatch = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
							if (rgbMatch) {
								const hex = rgbToHex(parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3]));
								const finalHex = selectionCollapsed && lastChosen.bgColor ? lastChosen.bgColor : hex;
								backgroundColorInput.value = finalHex;
								backgroundColorBtn.style.backgroundColor = finalHex;
								// Ajustar cor do texto para contraste
								const rgb = hexToRgb(finalHex);
								const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
								backgroundColorBtn.style.color = brightness > 128 ? '#000' : '#fff';
							}
						}
					}
				}
			} catch (e) {
				// Ignore errors in queryCommandState
			}
		}
		
		// Função auxiliar para converter RGB para hex
		function rgbToHex(r, g, b) {
			return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
		}
		
		// Event listeners
		editor.addEventListener('keydown', (e) => {
			// Tratar Enter e Shift+Enter em blocos especiais
			if (e.key === 'Enter') {
				const selection = window.getSelection();
				if (selection.rangeCount > 0) {
					const range = selection.getRangeAt(0);
					let node = range.startContainer;
					
					// Se for um nó de texto, pegar o elemento pai
					if (node.nodeType === Node.TEXT_NODE) {
						node = node.parentNode;
					}
					
					// Verificar se estamos em um bloco especial
					let specialBlock = null;
					let blockElement = null;
					let currentNode = node;
					
					while (currentNode && currentNode !== editor) {
						if (currentNode.tagName === 'BLOCKQUOTE') {
							specialBlock = 'blockquote';
							blockElement = currentNode;
							break;
						} else if (currentNode.tagName === 'PRE') {
							specialBlock = 'pre';
							blockElement = currentNode;
							break;
						}
						currentNode = currentNode.parentNode;
					}
					
					if (specialBlock) {
						e.preventDefault();
						e.stopPropagation();
						
						if (e.shiftKey) {
							// Shift+Enter: Sair do bloco especial
							// Criar um novo parágrafo após o bloco
							const newP = document.createElement('div');
							newP.innerHTML = '<br>';
							
							// Inserir após o bloco atual
							if (blockElement.nextSibling) {
								blockElement.parentNode.insertBefore(newP, blockElement.nextSibling);
							} else {
								blockElement.parentNode.appendChild(newP);
							}
							
							// Posicionar cursor no novo elemento
							const newRange = document.createRange();
							newRange.setStart(newP, 0);
							newRange.collapse(true);
							selection.removeAllRanges();
							selection.addRange(newRange);
							
						} else {
							// Enter normal: Quebrar linha dentro do bloco
							if (specialBlock === 'pre') {
								// Para código, inserir quebra de linha simples sem criar novo bloco
								const textNode = document.createTextNode('\n');
								range.insertNode(textNode);
								range.setStartAfter(textNode);
								range.collapse(true);
								selection.removeAllRanges();
								selection.addRange(range);
								
							} else if (specialBlock === 'blockquote') {
								// Para citação, inserir <br> para quebrar linha
								const br = document.createElement('br');
								range.insertNode(br);
								range.setStartAfter(br);
								range.collapse(true);
								selection.removeAllRanges();
								selection.addRange(range);
							}
						}
						return false;
					}
				}
			}
			
			// Atalhos de teclado
			if (e.ctrlKey || e.metaKey) {
				switch(e.key.toLowerCase()) {
					case 'b':
						e.preventDefault();
						formatText('bold');
						break;
					case 'i':
						e.preventDefault();
						formatText('italic');
						break;
					case 'u':
						e.preventDefault();
						formatText('underline');
						break;
				}
			}
		});
		
		editor.addEventListener('keyup', (e) => { saveCurrentSelection(); applyLastChosenIfEmpty(); updateToolbarState(); });
		editor.addEventListener('mouseup', () => { saveCurrentSelection(); updateToolbarState(); });
		editor.addEventListener('click', () => { saveCurrentSelection(); updateToolbarState(); });
		// Atualiza seleção globalmente quando o foco está no editor
		document.addEventListener('selectionchange', () => {
			if (document.activeElement === editor) {
				saveCurrentSelection();
				updateToolbarState();
			}
		});
		
		// Garantir que links funcionem corretamente
		editor.addEventListener('click', (e) => {
			if (e.target.tagName === 'A') {
				e.preventDefault();
				const url = e.target.getAttribute('href');
				if (url) {
					window.open(url, '_blank', 'noopener,noreferrer');
				}
			}
		});
		
		// Event listener para input para capturar mudanças e evitar quebras indesejadas
		editor.addEventListener('input', (e) => {
			// Verificar se novos elementos PRE foram criados incorretamente
			const preElements = editor.querySelectorAll('pre');
			preElements.forEach(pre => {
				// Se um PRE contém apenas um <br> ou está vazio, pode ter sido criado por engano
				if (pre.innerHTML.trim() === '<br>' || pre.innerHTML.trim() === '') {
					// Verificar se há outro PRE anterior
					const prevPre = pre.previousElementSibling;
					if (prevPre && prevPre.tagName === 'PRE') {
						// Mover o cursor para o PRE anterior e remover o novo
						const range = document.createRange();
						range.setStart(prevPre, prevPre.childNodes.length);
						range.collapse(true);
						
						const selection = window.getSelection();
						selection.removeAllRanges();
						selection.addRange(range);
						
						// Remover o PRE vazio
						pre.remove();
					}
				}
			});
			
			// Verificar se novos elementos BLOCKQUOTE foram criados incorretamente
			const blockquoteElements = editor.querySelectorAll('blockquote');
			blockquoteElements.forEach(blockquote => {
				// Se um BLOCKQUOTE contém apenas um <br> ou está vazio
				if (blockquote.innerHTML.trim() === '<br>' || blockquote.innerHTML.trim() === '') {
					// Verificar se há outro BLOCKQUOTE anterior
					const prevBlockquote = blockquote.previousElementSibling;
					if (prevBlockquote && prevBlockquote.tagName === 'BLOCKQUOTE') {
						// Mover o cursor para o BLOCKQUOTE anterior e remover o novo
						const range = document.createRange();
						range.setStart(prevBlockquote, prevBlockquote.childNodes.length);
						range.collapse(true);
						
						const selection = window.getSelection();
						selection.removeAllRanges();
						selection.addRange(range);
						
						// Remover o BLOCKQUOTE vazio
						blockquote.remove();
					}
				}
			});
			
			applyLastChosenIfEmpty();
			updateToolbarState();
		});
		
		// Inicializar toolbar e capturar seleção inicial
		setTimeout(() => { saveCurrentSelection(); updateToolbarState(); }, 100);
		
		// Montar o container
		editorContainer.append(toolbar, editor);
		
		return {
			root: editorContainer,
			getValue: () => editor.innerHTML,
			setValue: (v) => { editor.innerHTML = v || ''; }
		};
	}
	
	const descEditor = createAdvancedEditor(initial.description || '');

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
						// prazo a partir de dias + hh:mm do template (aplica somente se ambos presentes)
						try {
							const hasDays = c.due_days !== undefined && c.due_days !== null && String(c.due_days).trim() !== '';
							const hasTime = typeof c.due_hm === 'string' && c.due_hm.trim() !== '';
							if (hasDays && hasTime) {
								const dt = computeDueFromTemplate(c.due_days, c.due_hm);
								if (dateInput && timeInput && typeof dt === 'string' && dt.includes('T')) {
									const [d, t] = dt.split('T');
									dateInput.value = d;
									timeInput.value = t;
								}
							} else {
								// mantém em branco se não há dados de prazo no template
								if (dateInput) dateInput.value = '';
								if (timeInput) timeInput.value = '';
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
				// prazo padrão com base nas definições do template padrão (aplica somente se ambos presentes)
				try {
					const hasDays = c.due_days !== undefined && c.due_days !== null && String(c.due_days).trim() !== '';
					const hasTime = typeof c.due_hm === 'string' && c.due_hm.trim() !== '';
					if (hasDays && hasTime) {
						const dt = computeDueFromTemplate(c.due_days, c.due_hm);
						if (dateInput && timeInput && typeof dt === 'string' && dt.includes('T')) {
							const [d, t] = dt.split('T');
							dateInput.value = d;
							timeInput.value = t;
						}
					} else {
						if (dateInput) dateInput.value = '';
						if (timeInput) timeInput.value = '';
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
					// Salva apenas se preenchidos
					...(tplDueDaysInput.value?.trim() && tplDueTimeInput.value?.trim() ? {
						due_days: parseInt(tplDueDaysInput.value, 10) || 0,
						due_hm: tplDueTimeInput.value
					} : {})
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
