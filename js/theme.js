/* ============================================================
   JCA Treinamentos — Theme Toggle (Light / Dark)
   ============================================================ */
(function() {
  const STORAGE_KEY = 'jca-theme';

  // Mapeamento de logos dark → light
  const LOGO_MAP = {
    // Inteligência
    'horizontal_branco_yxlsyw': 'https://res.cloudinary.com/dxnruvmgu/image/upload/v1775248387/Intelig%C3%AAncia_horizontal_preto_p6gikp.png',
    'horizontal_branco':        'https://res.cloudinary.com/dxnruvmgu/image/upload/v1775248387/Intelig%C3%AAncia_horizontal_preto_p6gikp.png',
    // Grupo JCA
    'GRUPOJCA_branco':          'https://res.cloudinary.com/dxnruvmgu/image/upload/v1770942727/JCA_f9syze.png',
    // Empresas
    'Catarinense_BrancoHD':     'https://res.cloudinary.com/dxnruvmgu/image/upload/v1778633770/AVC_zk4pe9.png',
    'Cometa_brancoHD':          'https://res.cloudinary.com/dxnruvmgu/image/upload/v1778633783/COM_folzln.png',
    'EXP_Branco2':              'https://res.cloudinary.com/dxnruvmgu/image/upload/v1778633804/EXP_druks9.png',
    'Sit_gv7d2x':               'https://res.cloudinary.com/dxnruvmgu/image/upload/v1778634339/Sit_preto_rucocl.png',
  };

  function swapLogos(theme) {
    document.querySelectorAll('img').forEach(img => {
      // Na primeira vez, salva a URL original no data-dark
      if (!img.dataset.darkSrc && !img.dataset.lightSrc) {
        for (const key of Object.keys(LOGO_MAP)) {
          if (img.src.includes(key)) {
            img.dataset.darkSrc  = img.src;
            img.dataset.lightSrc = LOGO_MAP[key];
            break;
          }
        }
      }
      // Troca se tiver os dois mapeados
      if (img.dataset.darkSrc && img.dataset.lightSrc) {
        img.src = theme === 'light' ? img.dataset.lightSrc : img.dataset.darkSrc;
      }
    });
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
    swapLogos(theme);

    const btn = document.getElementById('themeToggleBtn');
    if (btn) {
      btn.title   = theme === 'light' ? 'Mudar para tema escuro' : 'Mudar para tema claro';
      btn.innerHTML = theme === 'light' ? iconMoon() : iconSun();
    }
  }

  function iconSun() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
  }

  function iconMoon() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  }

  // Aplica tema salvo antes do DOM carregar (evita flash)
  const saved = localStorage.getItem(STORAGE_KEY) || 'dark';
  document.documentElement.setAttribute('data-theme', saved);

  window.toggleTheme = function() {
    const current = document.documentElement.getAttribute('data-theme');
    applyTheme(current === 'light' ? 'dark' : 'light');
  };

  // Quando DOM pronto, aplica logos e ícone
  document.addEventListener('DOMContentLoaded', function() {
    const theme = localStorage.getItem(STORAGE_KEY) || 'dark';
    applyTheme(theme);
  });
})();