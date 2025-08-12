// Função para inicializar o menu de usuário com avatar
function initUserMenu() {
  const user = window.$auth.getUser();
  if (!user) return;

  // Verificar se existe o elemento .user-info na topbar
  const userInfoEl = document.querySelector('.topbar .user-info');
  if (!userInfoEl) return;

  // Obter elemento avatar
  const avatarEl = userInfoEl.querySelector('.avatar');
  if (!avatarEl) return;

  // Atualizar avatar com função global
  if (window.updateAvatarDisplay) {
    window.updateAvatarDisplay(avatarEl, user.avatar_url);
  } else {
    // Fallback se a função não existir
    if (user.avatar_url) {
      const imgEl = document.createElement('img');
      imgEl.src = user.avatar_url;
      imgEl.alt = 'Avatar do usuário';
      avatarEl.innerHTML = '';
      avatarEl.appendChild(imgEl);
    } else {
      const initials = user.username ? user.username.charAt(0).toUpperCase() : '?';
      avatarEl.textContent = initials;
    }
  }
}

// Verificar se o documento já foi carregado
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initUserMenu);
} else {
  initUserMenu();
}

// Verificar se essa é uma página com a topbar e atalho Alt+P
  // Removidos: atalhos de teclado e logs
