let _BOARD_ID = (function(){
	const v = window.localStorage.getItem('boardId');
	return v ? Number(v) : null;
})();
function setBoardId(id) {
	_BOARD_ID = id ? Number(id) : null;
	if (_BOARD_ID) window.localStorage.setItem('boardId', String(_BOARD_ID));
	else window.localStorage.removeItem('boardId');
}
function getBoardId() { return _BOARD_ID; }

const api = {
	// Helper para obter headers com token de autenticação
	getHeaders() {
		const headers = { 'Content-Type': 'application/json' };
		const token = window.$auth ? window.$auth.getToken() : localStorage.getItem('token');
		if (token) {
			headers['Authorization'] = `Bearer ${token}`;
		}
		return headers;
	},
	
	async get(path) {
		const url = new URL(path, window.location.origin);
		if (getBoardId() && !url.searchParams.has('boardId') && path.startsWith('/api/')) {
			url.searchParams.set('boardId', String(getBoardId()));
		}
		const r = await fetch(url, { 
			headers: this.getHeaders() 
		});
		
		if (r.status === 401) {
			// Token inválido - redireciona para login
			if (window.$auth) window.$auth.logout();
			else window.location.href = '/login.html';
			throw new Error('Sessão expirada. Por favor, faça login novamente.');
		}
		
		if (!r.ok) throw new Error(await r.text());
		return r.json();
	},
	
	async post(path, body) {
		const url = new URL(path, window.location.origin);
		if (getBoardId() && !url.searchParams.has('boardId') && path.startsWith('/api/')) {
			url.searchParams.set('boardId', String(getBoardId()));
		}
		const r = await fetch(url, { 
			method: 'POST', 
			headers: this.getHeaders(), 
			body: JSON.stringify(body) 
		});
		
		if (r.status === 401) {
			// Token inválido - redireciona para login
			if (window.$auth) window.$auth.logout();
			else window.location.href = '/login.html';
			throw new Error('Sessão expirada. Por favor, faça login novamente.');
		}
		
		if (!r.ok) throw new Error(await r.text());
		if (r.status === 204) return true;
		const txt = await r.text();
		if (!txt) return true;
		try { return JSON.parse(txt); } catch { return txt; }
	},
	
	async put(path, body) {
		const url = new URL(path, window.location.origin);
		if (getBoardId() && !url.searchParams.has('boardId') && path.startsWith('/api/')) {
			url.searchParams.set('boardId', String(getBoardId()));
		}
		const r = await fetch(url, { 
			method: 'PUT', 
			headers: this.getHeaders(), 
			body: JSON.stringify(body) 
		});
		
		if (r.status === 401) {
			// Token inválido - redireciona para login
			if (window.$auth) window.$auth.logout();
			else window.location.href = '/login.html';
			throw new Error('Sessão expirada. Por favor, faça login novamente.');
		}
		
		if (!r.ok) throw new Error(await r.text());
		if (r.status === 204) return true;
		const txt = await r.text();
		if (!txt) return true;
		try { return JSON.parse(txt); } catch { return txt; }
	},
	
	async del(path) {
		const url = new URL(path, window.location.origin);
		if (getBoardId() && !url.searchParams.has('boardId') && path.startsWith('/api/')) {
			url.searchParams.set('boardId', String(getBoardId()));
		}
		const r = await fetch(url, { 
			method: 'DELETE',
			headers: this.getHeaders()
		});
		
		if (r.status === 401) {
			// Token inválido - redireciona para login
			if (window.$auth) window.$auth.logout();
			else window.location.href = '/login.html';
			throw new Error('Sessão expirada. Por favor, faça login novamente.');
		}
		
		if (!r.ok && r.status !== 204) throw new Error(await r.text());
		return true;
	},
};

function el(tag, attrs = {}, children = []) {
	const e = document.createElement(tag);
	Object.entries(attrs).forEach(([k, v]) => {
		if (k === 'class') e.className = v;
		else if (k === 'dataset') Object.assign(e.dataset, v);
		else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.substring(2), v);
		else e.setAttribute(k, v);
	});
	for (const c of [].concat(children)) e.append(typeof c === 'string' ? document.createTextNode(c) : c);
	return e;
}

function pill(text, color) {
	const p = el('span', { class: 'tag' }, text);
	if (color) {
		p.style.background = color;
		const txt = getContrastTextColor(String(color).trim());
		p.style.color = txt;
	}
	return p;
}

function sortByPosition(a, b) { return (a.position || 0) - (b.position || 0) || a.id - b.id; }

// Determina automaticamente a cor do texto (preto ou branco) para melhor contraste, puxando mais para branco
function getContrastTextColor(bgColor) {
	if (!bgColor) return '#FFFFFF';
	let hex = bgColor.trim();
	if (hex.startsWith('#')) {
		hex = hex.slice(1);
		if (hex.length === 3) hex = hex.split('').map(ch => ch + ch).join('');
		if (hex.length === 8) hex = hex.slice(0, 6);
		if (hex.length !== 6) return '#FFFFFF';
		const r = parseInt(hex.slice(0,2), 16) / 255;
		const g = parseInt(hex.slice(2,4), 16) / 255;
		const b = parseInt(hex.slice(4,6), 16) / 255;
		const [R, G, B] = [r, g, b].map(c => (c <= 0.03928 ? c/12.92 : Math.pow(((c + 0.055)/1.055), 2.4)));
		const L = 0.2126 * R + 0.7152 * G + 0.0722 * B;
		// Limite de luminância ainda mais baixo para favorecer branco
		return L > 0.5 ? '#383838ff' : '#FFFFFF';
	}
	return '#FFFFFF';
}

window.$utils = { api, el, pill, sortByPosition, setBoardId, getBoardId, getContrastTextColor };
