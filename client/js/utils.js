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
	if (color) p.style.background = color;
	return p;
}

function sortByPosition(a, b) { return (a.position || 0) - (b.position || 0) || a.id - b.id; }

window.$utils = { api, el, pill, sortByPosition, setBoardId, getBoardId };
