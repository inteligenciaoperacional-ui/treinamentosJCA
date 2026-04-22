/* ============================================================
   TrainHub — Módulo de Autenticação
   Google OAuth + Matrícula
   ============================================================ */

const Auth = (() => {
  // ─── Estado interno ───────────────────────────────────────────
  let _currentUser = null;
  let _googleInitialized = false;

  // ─── Gestão de Sessão ─────────────────────────────────────────

  function saveSession(user) {
    const session = {
      user,
      createdAt: Date.now(),
      expiresAt: Date.now() + CONFIG.SESSION_DURATION,
    };
    localStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify(session));
    _currentUser = user;
  }

  function loadSession() {
    try {
      const raw = localStorage.getItem(CONFIG.SESSION_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw);
      if (Date.now() > session.expiresAt) {
        clearSession();
        return null;
      }
      _currentUser = session.user;
      return session.user;
    } catch {
      clearSession();
      return null;
    }
  }

  function clearSession() {
    localStorage.removeItem(CONFIG.SESSION_KEY);
    _currentUser = null;
  }

  function getCurrentUser() {
    if (_currentUser) return _currentUser;
    return loadSession();
  }

  function isAuthenticated() {
    return !!getCurrentUser();
  }

  // ─── Google OAuth ─────────────────────────────────────────────

  function initGoogle(callback) {
    if (typeof google === 'undefined') {
      console.warn('TrainHub: Google Identity Services não carregado.');
      return;
    }
    google.accounts.id.initialize({
      client_id: CONFIG.GOOGLE_CLIENT_ID,
      callback: (response) => handleGoogleResponse(response, callback),
      auto_select: false,
      cancel_on_tap_outside: true,
    });
    _googleInitialized = true;
  }

  function renderGoogleButton(elementId) {
    if (!_googleInitialized) return;
    const el = document.getElementById(elementId);
    if (!el) return;
    google.accounts.id.renderButton(el, {
      type: 'standard',
      shape: 'rectangular',
      theme: 'filled_black',
      text: 'signin_with',
      size: 'large',
      logo_alignment: 'left',
      width: 300,
      locale: 'pt-BR',
    });
  }

  function handleGoogleResponse(response, callback) {
    try {
      // Decodifica o JWT manualmente (sem verificação - apenas para UI)
      const payload = parseJwt(response.credential);
      if (!payload || !payload.email) {
        callback({ error: 'Email não encontrado no token Google.' });
        return;
      }

      const email = payload.email.toLowerCase();
      const company = getCompanyByEmailDomain(email);

      if (!company) {
        callback({
          error: `O domínio "${email.split('@')[1]}" não está cadastrado na plataforma. Entre em contato com o administrador.`,
        });
        return;
      }

      const user = {
        id: payload.sub,
        name: payload.name || email.split('@')[0],
        email: email,
        avatar: payload.picture || null,
        companyId: company.id,
        authMethod: 'google',
        loginAt: new Date().toISOString(),
      };

      saveSession(user);
      callback({ user });
    } catch (err) {
      callback({ error: 'Falha ao processar autenticação Google.' });
    }
  }

  // ─── Login por Matrícula ──────────────────────────────────────

  function loginWithMatricula(matricula, password, callback) {
    // Validação básica
    if (!matricula || matricula.trim().length < 4) {
      callback({ error: 'Matrícula inválida. Formato esperado: AAA-0000' });
      return;
    }

    const cleanMatricula = matricula.trim().toUpperCase();
    const company = getCompanyByMatricula(cleanMatricula);

    if (!company) {
      callback({
        error: `Prefixo de matrícula não reconhecido. Verifique e tente novamente.`,
      });
      return;
    }

    // Em produção, aqui seria feita uma chamada à API de autenticação
    // Por ora, aceita qualquer senha de 4+ caracteres como demonstração
    if (!password || password.length < 4) {
      callback({ error: 'Senha deve ter ao menos 4 caracteres.' });
      return;
    }

    const user = {
      id: `mat-${cleanMatricula}`,
      name: `Instrutor ${cleanMatricula}`,
      email: null,
      avatar: null,
      matricula: cleanMatricula,
      companyId: company.id,
      authMethod: 'matricula',
      loginAt: new Date().toISOString(),
    };

    saveSession(user);
    callback({ user });
  }

  // ─── Logout ───────────────────────────────────────────────────

  function logout() {
    if (_googleInitialized && typeof google !== 'undefined') {
      try { google.accounts.id.disableAutoSelect(); } catch {}
    }
    clearSession();
    window.location.href = 'index.html';
  }

  // ─── Guards de Rota ───────────────────────────────────────────

  function requireAuth(redirectUrl = 'login.html') {
    if (!isAuthenticated()) {
      window.location.href = redirectUrl;
      return false;
    }
    return true;
  }

  function redirectIfAuthenticated(redirectUrl = 'dashboard.html') {
    if (isAuthenticated()) {
      window.location.href = redirectUrl;
      return true;
    }
    return false;
  }

  // ─── Helpers ──────────────────────────────────────────────────

  function parseJwt(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  }

  // ─── API Pública ──────────────────────────────────────────────
  return {
    init: initGoogle,
    renderGoogleButton,
    loginWithMatricula,
    logout,
    getCurrentUser,
    isAuthenticated,
    requireAuth,
    redirectIfAuthenticated,
    loadSession,
  };
})();
