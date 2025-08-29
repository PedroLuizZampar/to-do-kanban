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

	// Editor de texto rico com formatação avançada
	function escapeHtml(str) {
		return (str || '').replace(/[&<>"']/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[ch]));
	}
	
	function richTextToHtml(content) {
		if (!content) return '';
		let s = escapeHtml(content);
		
		// Code blocks (```) multiline - DEVE VIR ANTES das formatações de cor
		s = s.replace(/```([\s\S]*?)```/g, (m, p1) => `<pre style="background:#f5f5f5; border:1px solid #ddd; border-radius:4px; padding:8px; margin:4px 0; overflow-x:auto;"><code>${p1.replace(/\n/g,'<br>')}</code></pre>`);
		
		// Inline code `code` - DEVE VIR ANTES das formatações de cor
		s = s.replace(/`([^`]+)`/g, '<code style="background:#f5f5f5; padding:1px 4px; border-radius:3px; font-family:monospace;">$1</code>');
		
		// Links [texto](url) - DEVE VIR ANTES das formatações de cor
		s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:#007bff; text-decoration:none; border-bottom:1px dotted #007bff;">$1</a>');
		
		// Formatação básica - DEVE VIR ANTES das formatações de cor
		s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
		s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
		s = s.replace(/\+\+([^+]+)\+\+/g, '<u>$1</u>');
		s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');
		
		// Formatação de cor de texto: {color:#ff0000}texto{/color} - Agora preserva formatação interna
		s = s.replace(/\{color:(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|[a-zA-Z]+)\}([\s\S]*?)\{\/color\}/g, '<span style="color:$1">$2</span>');
		
		// Formatação de cor de fundo: {bg:#ffff00}texto{/bg} - Suporte para código e preserva formatação interna
		s = s.replace(/\{bg:(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|[a-zA-Z]+)\}(<pre[\s\S]*?<\/pre>)\{\/bg\}/g, (match, color, preBlock) => {
			return preBlock.replace(/style="([^"]*)"/, `style="background-color:${color}; $1"`);
		});
		s = s.replace(/\{bg:(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|[a-zA-Z]+)\}([\s\S]*?)\{\/bg\}/g, '<span style="background-color:$1; padding:1px 3px; border-radius:2px;">$2</span>');
		
		// Alinhamento de texto: {align:center}texto{/align}
		s = s.replace(/\{align:(left|center|right|justify)\}([\s\S]*?)\{\/align\}/g, '<div style="text-align:$1">$2</div>');
		
		// Headings com estilo melhorado
		s = s.replace(/^######\s+(.*)$/gm, '<h6 style="color:#666; margin:8px 0 4px 0; font-size:0.85em;">$1</h6>');
		s = s.replace(/^#####\s+(.*)$/gm, '<h5 style="color:#666; margin:8px 0 4px 0; font-size:0.9em;">$1</h5>');
		s = s.replace(/^####\s+(.*)$/gm, '<h4 style="color:#555; margin:10px 0 5px 0; font-size:1em;">$1</h4>');
		s = s.replace(/^###\s+(.*)$/gm, '<h3 style="color:#444; margin:12px 0 6px 0; font-size:1.1em;">$1</h3>');
		s = s.replace(/^##\s+(.*)$/gm, '<h2 style="color:#333; margin:14px 0 7px 0; font-size:1.25em; border-bottom:1px solid #eee; padding-bottom:2px;">$1</h2>');
		s = s.replace(/^#\s+(.*)$/gm, '<h1 style="color:#222; margin:16px 0 8px 0; font-size:1.4em; border-bottom:2px solid #ddd; padding-bottom:3px;">$1</h1>');
		
		// Listas não ordenadas melhoradas com alternância de bolinhas (pretas/brancas)
		s = s.replace(/(^|\n)([ ]*[-*+]\s+.+(?:\n[ ]*[-*+]\s+.+)*)/gm, (match, prefix, listBlock) => {
			const lines = listBlock.split('\n').filter(l => l.trim());
			let html = prefix + '<ul style="margin:4px 0; padding-left:20px; list-style-type:disc;">';
			let currentLevel = 0;
			
			for (const line of lines) {
				const indent = (line.match(/^[ ]*/)[0] || '').length;
				const level = Math.floor(indent / 2);
				const text = line.replace(/^[ ]*[-*+]\s+/, '').trim();
				
				if (level > currentLevel) {
					for (let i = currentLevel; i < level; i++) {
						// Alterna entre disc (bolinha preta) e circle (bolinha branca)
						// Nível 0: disc (preto), Nível 1: circle (branco), Nível 2: disc (preto), etc.
						const listStyle = (i + 1) % 2 === 1 ? 'circle' : 'disc';
						html += `<ul style="margin:2px 0; padding-left:16px; list-style-type:${listStyle};">`;
					}
				} else if (level < currentLevel) {
					for (let i = currentLevel; i > level; i--) {
						html += '</ul>';
					}
				}
				
				html += `<li style="margin:2px 0; line-height:1.3;">${text}</li>`;
				currentLevel = level;
			}
			
			for (let i = currentLevel; i >= 0; i--) {
				html += '</ul>';
			}
			
			return html;
		});
		
		// Listas ordenadas melhoradas com numeração inteligente multinível (1.1.1, 1.1.2, etc.)
		s = s.replace(/(^|\n)([ ]*\d+\.\s+.+(?:\n[ ]*\d+\.\s+.+)*)/gm, (match, prefix, listBlock) => {
			const lines = listBlock.split('\n').filter(l => l.trim());
			let html = prefix + '<ol style="margin:4px 0; padding-left:30px; list-style-type:none;">';
			let currentLevel = 0;
			let counters = [0]; // Contadores por nível
			
			for (const line of lines) {
				const indent = (line.match(/^[ ]*/)[0] || '').length;
				const level = Math.floor(indent / 2);
				const text = line.replace(/^[ ]*\d+\.\s+/, '').trim();
				
				// Ajusta array de contadores conforme o nível
				while (counters.length <= level) {
					counters.push(0);
				}
				
				// Gerencia transições de nível
				if (level > currentLevel) {
					// Subindo de nível - abre novas listas
					for (let i = currentLevel; i < level; i++) {
						html += `<ol style="margin:2px 0; padding-left:30px; list-style-type:none;">`;
					}
				} else if (level < currentLevel) {
					// Descendo de nível - fecha listas e reseta contadores
					for (let i = currentLevel; i > level; i--) {
						html += '</ol>';
						if (i < counters.length) {
							counters[i] = 0; // Reset contador do nível abandonado
						}
					}
				}
				
				// Incrementa contador do nível atual
				counters[level]++;
				
				// Gera numeração hierárquica completa (ex: 1.2.3)
				let hierarchicalNumber = '';
				for (let i = 0; i <= level; i++) {
					if (i === 0) {
						hierarchicalNumber = counters[i].toString();
					} else {
						hierarchicalNumber += '.' + counters[i];
					}
				}
				
				// Aplica numeração customizada com recuo proporcional ao nível
				html += `<li style="margin:2px 0; line-height:1.3; position:relative; list-style:none;">`;
				html += `<span style="position:absolute; left:-25px; font-weight:500; color:#666; min-width:20px; text-align:right;">${hierarchicalNumber}.</span>`;
				html += `${text}</li>`;
				
				currentLevel = level;
			}
			
			// Fecha todas as listas abertas
			for (let i = currentLevel; i >= 0; i--) {
				html += '</ol>';
			}
			
			return html;
		});
		
		// Line breaks
		s = s.replace(/\n/g, '<br>');
		
		// Remove <br> após headings e divs
		s = s.replace(/<\/(h[1-6]|div)><br>/g, '</$1>');
		
		return s;
	}
	function createRichTextToolbar(textarea, preview) {
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
		
		function wrapSelectionWithColor(colorType, color) {
			wrapSelection(`{${colorType}:${color}}`, `{/${colorType}}`);
		}
		
		function wrapSelectionWithAlign(alignment) {
			const ta = textarea;
			const { selectionStart, selectionEnd, value } = ta;
			const startLine = value.lastIndexOf('\n', selectionStart - 1) + 1;
			const endLine = value.indexOf('\n', selectionEnd);
			const endPos = endLine === -1 ? value.length : endLine;
			const selectedText = value.slice(startLine, endPos);
			
			const newText = `{align:${alignment}}${selectedText}{/align}`;
			ta.value = value.slice(0, startLine) + newText + value.slice(endPos);
			ta.focus();
			ta.setSelectionRange(startLine, startLine + newText.length);
			ta.dispatchEvent(new Event('input'));
		}
		
		function insertSmartList(type) {
			const ta = textarea;
			const { selectionStart, selectionEnd, value } = ta;
			const before = value.slice(0, selectionStart);
			const selected = value.slice(selectionStart, selectionEnd);
			const after = value.slice(selectionEnd);
			
			if (selected.trim()) {
				// Se há texto selecionado, converte cada linha em item de lista
				const lines = selected.split('\n').filter(l => l.trim());
				let result = '';
				for (let i = 0; i < lines.length; i++) {
					const line = lines[i].trim();
					if (type === 'ul') {
						result += `- ${line}\n`;
					} else {
						result += `${i + 1}. ${line}\n`;
					}
				}
				ta.value = before + result + after;
				ta.setSelectionRange(selectionStart, selectionStart + result.length);
			} else {
				// Se não há seleção, adiciona novo item de lista
				const currentLine = value.lastIndexOf('\n', selectionStart - 1) + 1;
				const lineContent = value.slice(currentLine, selectionStart);
				const prefix = type === 'ul' ? '- ' : '1. ';
				
				if (lineContent.trim() === '') {
					ta.value = before + prefix + after;
					ta.setSelectionRange(selectionStart + prefix.length, selectionStart + prefix.length);
				} else {
					ta.value = before + '\n' + prefix + after;
					ta.setSelectionRange(selectionStart + 1 + prefix.length, selectionStart + 1 + prefix.length);
				}
			}
			ta.focus();
			ta.dispatchEvent(new Event('input'));
		}
		
		// Paleta de cores
		const colors = ['#000000', '#333333', '#666666', '#999999', '#cccccc', '#ffffff', 
		               '#ff0000', '#ff6600', '#ffaa00', '#ffdd00', '#88dd00', '#00dd00',
		               '#00ddaa', '#00aadd', '#0066dd', '#0000dd', '#6600dd', '#dd00dd',
		               '#dd0066', '#ffeeff', '#ffe0e0', '#fff5e0', '#ffffcc', '#f0fff0'];
		
		const bgColors = ['transparent', '#fff2cc', '#d5e8d4', '#dae8fc', '#f8cecc', '#e1d5e7',
		                 '#ffd966', '#82b366', '#6c8ebf', '#b85450', '#9673a6', '#ffcc99'];
		
		function createColorPicker(colorType, title, colorList) {
			const btn = el('button', { 
				class: 'toolbar-btn-dropdown',
				title: title,
				onclick: (e) => { e.preventDefault(); dropdown.classList.toggle('hidden'); }
			}, [
				el('span', { class: 'material-symbols-outlined' }, colorType === 'color' ? 'format_color_text' : 'format_color_fill'),
				el('span', { class: 'material-symbols-outlined dropdown-arrow' }, 'expand_more')
			]);
			
			const customColorInput = el('input', {
				type: 'color',
				title: 'Cor personalizada',
				style: 'width: 40px; height: 20px; border: 1px solid #ccc; border-radius: 3px; cursor: pointer; margin: 4px;',
				onchange: (e) => {
					const color = e.target.value;
					if (colorType === 'color') {
						wrapSelection(`{color:${color}}`, '{/color}');
					} else {
						wrapSelection(`{bg:${color}}`, '{/bg}');
					}
					dropdown.classList.add('hidden');
				}
			});
			
			const dropdown = el('div', { class: 'color-dropdown hidden' }, [
				el('div', { style: 'grid-column: 1 / -1; padding: 4px; border-bottom: 1px solid #eee; margin-bottom: 4px; display: flex; align-items: center; gap: 8px;' }, [
					el('span', { style: 'font-size: 12px; color: #666;' }, 'Personalizada:'),
					customColorInput
				])
			]);
			
			colorList.forEach(color => {
				const colorBtn = el('button', {
					class: 'color-btn',
					style: `background-color: ${color}; ${color === 'transparent' ? 'background-image: linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%); background-size: 8px 8px; background-position: 0 0, 0 4px, 4px -4px, -4px 0px;' : ''}`,
					title: color,
					onclick: (e) => { e.preventDefault(); wrapSelectionWithColor(colorType, color); dropdown.classList.add('hidden'); }
				});
				dropdown.append(colorBtn);
			});
			
			const wrapper = el('div', { class: 'dropdown-wrapper' }, [btn, dropdown]);
			
			// Fechar dropdown ao clicar fora
			document.addEventListener('click', (e) => {
				if (!wrapper.contains(e.target)) {
					dropdown.classList.add('hidden');
				}
			});
			
			return wrapper;
		}
		
		const tb = el('div', { class: 'rich-text-toolbar' }, [
			// Linha 1: Formatação básica
			el('div', { class: 'toolbar-row' }, [
				el('button', { 
					class: 'toolbar-btn', 
					title: 'Negrito (Ctrl+B)', 
					onclick: (e) => { e.preventDefault(); wrapSelection('**', '**'); } 
				}, [el('strong', {}, 'B')]),
				
				el('button', { 
					class: 'toolbar-btn', 
					title: 'Itálico (Ctrl+I)', 
					onclick: (e) => { e.preventDefault(); wrapSelection('*', '*'); } 
				}, [el('em', {}, 'I')]),
				
				el('button', { 
					class: 'toolbar-btn', 
					title: 'Sublinhado (Ctrl+U)', 
					onclick: (e) => { e.preventDefault(); wrapSelection('++', '++'); } 
				}, [el('u', {}, 'U')]),
				
				el('button', { 
					class: 'toolbar-btn', 
					title: 'Tachado', 
					onclick: (e) => { e.preventDefault(); wrapSelection('~~', '~~'); } 
				}, [el('del', {}, 'S')]),
				
				el('span', { class: 'toolbar-sep' }, '|'),
				
				el('button', { 
					class: 'toolbar-btn', 
					title: 'Código', 
					onclick: (e) => { e.preventDefault(); wrapSelection('```', '```'); } 
				}, [el('span', { class: 'material-symbols-outlined' }, 'code')]),
				
				el('span', { class: 'toolbar-sep' }, '|'),
				
				createColorPicker('color', 'Cor do texto', colors),
				createColorPicker('bg', 'Cor de fundo', bgColors),
				
				el('span', { class: 'toolbar-sep' }, '|')
			]),
			
			// Linha 2: Alinhamento e listas
			el('div', { class: 'toolbar-row' }, [
				el('button', { 
					class: 'toolbar-btn', 
					title: 'Alinhar à esquerda', 
					onclick: (e) => { e.preventDefault(); wrapSelectionWithAlign('left'); } 
				}, [el('span', { class: 'material-symbols-outlined' }, 'format_align_left')]),
				
				el('button', { 
					class: 'toolbar-btn', 
					title: 'Centralizar', 
					onclick: (e) => { e.preventDefault(); wrapSelectionWithAlign('center'); } 
				}, [el('span', { class: 'material-symbols-outlined' }, 'format_align_center')]),
				
				el('button', { 
					class: 'toolbar-btn', 
					title: 'Alinhar à direita', 
					onclick: (e) => { e.preventDefault(); wrapSelectionWithAlign('right'); } 
				}, [el('span', { class: 'material-symbols-outlined' }, 'format_align_right')]),
				
				el('button', { 
					class: 'toolbar-btn', 
					title: 'Justificar', 
					onclick: (e) => { e.preventDefault(); wrapSelectionWithAlign('justify'); } 
				}, [el('span', { class: 'material-symbols-outlined' }, 'format_align_justify')]),
				
				el('span', { class: 'toolbar-sep' }, '|'),
				
				el('button', { 
					class: 'toolbar-btn', 
					title: 'Lista não ordenada', 
					onclick: (e) => { e.preventDefault(); insertSmartList('ul'); } 
				}, [el('span', { class: 'material-symbols-outlined' }, 'format_list_bulleted')]),
				
				el('button', { 
					class: 'toolbar-btn', 
					title: 'Lista ordenada', 
					onclick: (e) => { e.preventDefault(); insertSmartList('ol'); } 
				}, [el('span', { class: 'material-symbols-outlined' }, 'format_list_numbered')]),
				
				el('span', { class: 'toolbar-sep' }, '|'),
				
				el('button', { 
					class: 'toolbar-btn', 
					title: 'Link', 
					onclick: (e) => { e.preventDefault(); wrapSelection('[', '](https://)'); } 
				}, [el('span', { class: 'material-symbols-outlined' }, 'link')])
			])
		]);
		// Atalhos de teclado melhorados
		textarea.addEventListener('keydown', (e) => {
			if (e.ctrlKey && (e.key === 'b' || e.key === 'B')) { e.preventDefault(); wrapSelection('**', '**'); }
			if (e.ctrlKey && (e.key === 'i' || e.key === 'I')) { e.preventDefault(); wrapSelection('*', '*'); }
			if (e.ctrlKey && (e.key === 'u' || e.key === 'U')) { e.preventDefault(); wrapSelection('++', '++'); }
			if (e.ctrlKey && (e.key === 's' || e.key === 'S')) { e.preventDefault(); wrapSelection('~~', '~~'); }
			
			// Enter inteligente para listas
			if (e.key === 'Enter') {
				const { selectionStart, value } = textarea;
				const currentLine = value.lastIndexOf('\n', selectionStart - 1) + 1;
				const lineEnd = value.indexOf('\n', selectionStart);
				const lineContent = value.slice(currentLine, lineEnd === -1 ? value.length : lineEnd);
				
				// Detecta se estamos em uma lista
				const ulMatch = lineContent.match(/^(\s*)-\s+(.*)$/);
				const olMatch = lineContent.match(/^(\s*)(\d+)\.\s+(.*)$/);
				
				if (ulMatch) {
					const [, indent, content] = ulMatch;
					if (content.trim() === '') {
						// Linha vazia, remove o marcador
						e.preventDefault();
						const start = currentLine;
						const end = lineEnd === -1 ? value.length : lineEnd;
						textarea.value = value.slice(0, start) + indent + value.slice(end);
						textarea.setSelectionRange(start + indent.length, start + indent.length);
					} else {
						// Adiciona novo item da lista
						e.preventDefault();
						const newItem = `\n${indent}- `;
						textarea.value = value.slice(0, selectionStart) + newItem + value.slice(selectionStart);
						textarea.setSelectionRange(selectionStart + newItem.length, selectionStart + newItem.length);
					}
					textarea.dispatchEvent(new Event('input'));
				} else if (olMatch) {
					const [, indent, num, content] = olMatch;
					if (content.trim() === '') {
						// Linha vazia, remove o marcador
						e.preventDefault();
						const start = currentLine;
						const end = lineEnd === -1 ? value.length : lineEnd;
						textarea.value = value.slice(0, start) + indent + value.slice(end);
						textarea.setSelectionRange(start + indent.length, start + indent.length);
					} else {
						// Adiciona novo item numerado
						e.preventDefault();
						const nextNum = parseInt(num) + 1;
						const newItem = `\n${indent}${nextNum}. `;
						textarea.value = value.slice(0, selectionStart) + newItem + value.slice(selectionStart);
						textarea.setSelectionRange(selectionStart + newItem.length, selectionStart + newItem.length);
					}
					textarea.dispatchEvent(new Event('input'));
				}
			}
			
			// Tab para indentação em listas
			if (e.key === 'Tab') {
				const { selectionStart, value } = textarea;
				const currentLine = value.lastIndexOf('\n', selectionStart - 1) + 1;
				const lineEnd = value.indexOf('\n', selectionStart);
				const lineContent = value.slice(currentLine, lineEnd === -1 ? value.length : lineEnd);
				
				if (lineContent.match(/^\s*[-*+]\s+/) || lineContent.match(/^\s*\d+\.\s+/)) {
					e.preventDefault();
					const indent = e.shiftKey ? '' : '  '; // Shift+Tab remove indentação
					if (e.shiftKey) {
						// Remove indentação
						if (lineContent.startsWith('  ')) {
							textarea.value = value.slice(0, currentLine) + lineContent.slice(2) + value.slice(lineEnd === -1 ? value.length : lineEnd);
							textarea.setSelectionRange(selectionStart - 2, selectionStart - 2);
						}
					} else {
						// Adiciona indentação
						textarea.value = value.slice(0, currentLine) + '  ' + lineContent + value.slice(lineEnd === -1 ? value.length : lineEnd);
						textarea.setSelectionRange(selectionStart + 2, selectionStart + 2);
					}
					textarea.dispatchEvent(new Event('input'));
				}
			}
		});
		return tb;
	}
	function createRichTextEditor(initialText = '') {
		const placeholderText = 'Digite aqui a descrição...';
		const ta = el('textarea', { placeholder: placeholderText, class: 'rich-text-input' }, initialText || '');
		const preview = el('div', { class: 'rich-text-preview' });
		const toolbar = createRichTextToolbar(ta, preview);
		const root = el('div', { class: 'rich-text-editor' }, [
			toolbar, 
			el('div', { class: 'rich-text-panels' }, [
				el('div', { class: 'rich-text-input-wrapper' }, ta), 
				preview
			])
		]);
		function syncHeights() {
			try {
				const isEditing = root.classList.contains('editing');
				ta.style.height = 'auto';
				preview.style.height = 'auto';
				if (isEditing) {
					const taH = Math.max(ta.scrollHeight || 0, 0);
					const pvH = Math.max(preview.scrollHeight || 0, 0);
					const h = Math.max(200, taH, pvH); // Altura mínima maior para editor rico
					ta.style.height = h + 'px';
					preview.style.height = h + 'px';
				} else {
					preview.style.height = 'auto';
				}
			} catch {}
		}
		
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
			preview.innerHTML = richTextToHtml(val);
			syncHeights();
		};
		
		const setEditing = (on) => {
			root.classList.toggle('editing', !!on);
			syncAfterLayout();
		};
		
		// Render inicial e estado não editando
		render();
		setEditing(false);
		
		// Permitir seleção/cópia no preview sem alternar modo ao clicar
		preview.setAttribute('tabindex', '0');
		preview.addEventListener('mousedown', (e) => {
			e.stopPropagation();
		});
		
		// Ao clicar no preview quando não estiver editando, entrar em edição
		preview.addEventListener('click', (e) => {
			const a = e.target && e.target.closest ? e.target.closest('a') : null;
			if (a) return; // permite abrir links normalmente
			if (!root.classList.contains('editing')) {
				setEditing(true);
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
			if (t && (t.closest && (t.closest('.rich-text-input-wrapper') || t.closest('.rich-text-toolbar')))) {
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
	const descEditor = createRichTextEditor(initial.description || '');

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
