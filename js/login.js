/* ============================================================
   JCA Treinamentos — Login com Firebase Auth (Google)
   ============================================================ */

import { loginWithGoogle, onAuthChange, getCompanies, getInstructorByEmail, logout }
  from './firebase.js';

// Logos por prefixo de matrícula
const LOGO_BY_SHORTNAME = {
  'COM': 'https://res.cloudinary.com/dxnruvmgu/image/upload/v1776644927/Cometa_iud8vx.png',
  'AV1': 'https://res.cloudinary.com/dxnruvmgu/image/upload/v1776644927/1001_ynes4h.png',
  'AVC': 'https://res.cloudinary.com/dxnruvmgu/image/upload/v1776644927/Catarinense_toqlsq.png',
  // Adicione novos prefixos aqui
};

let _companies = [];

document.addEventListener('DOMContentLoaded', async () => {
  // Verifica se já está logado
  onAuthChange(async (firebaseUser) => {
    if (firebaseUser) {
      const instructor = await getInstructorByEmail(firebaseUser.email);
      if (instructor) {
        window.location.href = 'dashboard.html';
      } else {
        // E-mail não cadastrado — faz logout e mostra erro
        await logout();
        showError('E-mail não cadastrado como instrutor. Entre em contato com o administrador.');
      }
    }
  });

  // Carrega empresas do Firestore para montar o badge
  _companies = await getCompanies();

  // Lê empresa da URL
  const params    = new URLSearchParams(window.location.search);
  const companyId = params.get('company');
  if (companyId) {
    const company = _companies.find(c => c.id === companyId);
    if (company) applyCompanyTheme(company);
  }

  // Esconde loading
  document.getElementById('loadingOverlay')?.classList.add('hidden');
});

// ── Login com Google ────────────────────────────────────────
async function handleGoogleLogin() {
  setLoading(true);
  hideError();

  const result = await loginWithGoogle();
  setLoading(false);

  if (result.error) {
    showError(result.error);
    return;
  }

  if (!result.user) return; // Cancelou o popup

  // Verifica se o e-mail está cadastrado como instrutor
  const instructor = await getInstructorByEmail(result.user.email);
  if (!instructor) {
    await logout();
    showError('E-mail não cadastrado. Entre em contato com o administrador.');
    return;
  }

  showToast('Login realizado!', 'success');
  setTimeout(() => window.location.href = 'dashboard.html', 600);
}

// ── Tema da empresa ─────────────────────────────────────────
function applyCompanyTheme(company) {
  const badge   = document.getElementById('companyBadge');
  const logoUrl = company.logo || LOGO_BY_SHORTNAME[company.matriculaPrefix] || null;

  if (logoUrl) {
    badge.innerHTML = `<img src="${logoUrl}" alt="${company.name}"
      onerror="this.style.display='none'">`;
    badge.style.background = '#0F1624';
    badge.style.border     = `2px solid ${company.color}60`;
  } else {
    badge.textContent      = company.shortName?.slice(0,3).toUpperCase() || '?';
    badge.style.background = company.color;
    badge.style.color      = '#0A0E1A';
  }

  // Stripe colorida no topo do card
  const stripe = document.getElementById('cardStripe');
  if (stripe) stripe.style.background = company.color;

  document.getElementById('breadcrumbCompany').textContent = company.name;
  document.getElementById('loginTitle').textContent        = company.name;
  document.getElementById('loginSubtitle').textContent     = 'Faça login com seu e-mail corporativo';
  document.documentElement.style.setProperty('--col-orange', company.color);
}

// ── Helpers UI ──────────────────────────────────────────────
function setLoading(on) {
  const btn = document.getElementById('btnGoogle');
  if (!btn) return;
  btn.disabled    = on;
  btn.textContent = on ? 'Aguarde...' : 'Entrar com Google';
}

function showError(msg) {
  const el = document.getElementById('errorBox');
  el.textContent = msg;
  el.classList.add('visible');
}

function hideError() {
  document.getElementById('errorBox')?.classList.remove('visible');
}

function showToast(msg, type = 'info') {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// Expõe para o HTML
window.handleGoogleLogin = handleGoogleLogin;
