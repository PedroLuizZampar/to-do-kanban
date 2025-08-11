// Centraliza a lógica de autenticação
const AuthService = {
  // Verifica se usuário está autenticado
  isAuthenticated() {
    return !!localStorage.getItem('token');
  },
  
  // Obtém token
  getToken() {
    return localStorage.getItem('token');
  },
  
  // Obtém dados do usuário logado
  getUser() {
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch (e) {
      console.error('Erro ao obter dados do usuário:', e);
      return null;
    }
  },
  
  // Login
  async login(username, password) {
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await r.json();
      
      if (!r.ok) {
        throw new Error(data.error || 'Erro ao fazer login');
      }
      
      // Armazena token e dados do usuário
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      return data.user;
    } catch (e) {
      throw e;
    }
  },
  
  // Registro
  async register(username, email, password) {
    try {
      const r = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });
      
      const data = await r.json();
      
      if (!r.ok) {
        throw new Error(data.error || 'Erro ao registrar usuário');
      }
      
      // Armazena token e dados do usuário
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      return data.user;
    } catch (e) {
      throw e;
    }
  },
  
  // Logout
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
  },
  
  // Verifica autenticação e redireciona se não estiver logado
  checkAuth() {
    if (!this.isAuthenticated()) {
      window.location.href = '/login.html';
      return false;
    }
    return true;
  }
};

window.$auth = AuthService;
