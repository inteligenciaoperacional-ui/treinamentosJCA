/* ============================================================
   TrainHub — Dashboard (Firebase)
   ============================================================ */

import { onAuthChange, logout, getInstructorByEmail, getCompanies, getTrainings, getProgress }
  from './firebase.js';

const LOGO_BY_SHORTNAME = {
  'COM': 'https://res.cloudinary.com/dxnruvmgu/image/upload/v1776644927/Cometa_iud8vx.png',
  'AV1': 'https://res.cloudinary.com/dxnruvmgu/image/upload/v1776644927/1001_ynes4h.png',
  'AVC': 'https://res.cloudinary.com/dxnruvmgu/image/upload/v1776644927/Catarinense_toqlsq.png',
};

let _user       = null;
let _instructor = null;
let _company    = null;
let _trainings  = [];
let _activeFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
  onAuthChange(async (firebaseUser) => {
    if (!firebaseUser) {
      window.location.href = 'login.html';
      return;
    }

    _user       = firebaseUser;
    _instructor = await getInstructorByEmail(firebaseUser.email);

    if (!_instructor) {
      window.location.href = 'login.html';
      return;
    }

    const companies = await getCompanies();
    _company   = companies.find(c => c.id === _instructor.empresaId) || null;
    _trainings = await getTrainings(_instructor.empresaId);

    populateUser();
    populateCategories();
    await renderTrainings();

    setTimeout(() => document.getElementById('loadingOverlay')?.classList.add('hidden'), 400);
  });
});

// ── Usuário ─────────────────────────────────────────────────
function populateUser() {
  const firstLetter = (_instructor.nome || '?')[0].toUpperCase();
  const avatarEl    = document.getElementById('userAvatar');

  if (_user.photoURL) {
    avatarEl.innerHTML = `<img src="${_user.photoURL}" alt="${_instructor.nome}"
      onerror="this.parentElement.textContent='${firstLetter}'">`;
  } else {
    avatarEl.textContent = firstLetter;
  }

  document.getElementById('userName').textContent    = _instructor.nome || _user.email;
  const companyEl = document.getElementById('userCompany');
  if (_company) {
    companyEl.innerHTML = '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:'+_company.color+';flex-shrink:0"></span> ' + _company.name;
  } else {
    companyEl.textContent = '—';
  }

  if (_company) {
    const navBadge = document.getElementById('navCompanyBadge');
    const logoUrl  = _company.logo || LOGO_BY_SHORTNAME[_company.matriculaPrefix] || null;

    if (logoUrl) {
      navBadge.innerHTML = `<img src="${logoUrl}" style="height:22px;width:auto;object-fit:contain;">`;
      navBadge.style.background = 'transparent';
      navBadge.style.border     = 'none';
    } else {
      navBadge.textContent       = _company.shortName;
      navBadge.style.background  = `rgba(${hexToRgb(_company.color)}, 0.12)`;
      navBadge.style.color       = _company.color;
      navBadge.style.borderColor = `rgba(${hexToRgb(_company.color)}, 0.3)`;
    }
    navBadge.style.display = 'flex';
    document.documentElement.style.setProperty('--col-orange', _company.color);
  }

  document.getElementById('contentEyebrow').textContent  = _company?.name || 'Treinamentos';

  // Saudação personalizada
  const firstName = (_instructor.nome || _user.email).split(' ')[0];
  const welcome = document.getElementById('contentWelcome');
  if (welcome) {
    welcome.innerHTML = 'Bem-vindo, <strong style="color:var(--col-text)">' + firstName + '</strong>! Aqui estão os treinamentos disponíveis para você aplicar.';
  }
  document.getElementById('contentTitle').textContent    = 'Meus Treinamentos';
  document.getElementById('contentSubtitle').textContent =
    `${_trainings.length} treinamento${_trainings.length !== 1 ? 's' : ''} disponível${_trainings.length !== 1 ? 'is' : ''} para você.`;
}

// ── Categorias ───────────────────────────────────────────────
function populateCategories() {
  const categories = [...new Set(_trainings.map(t => t.category))];
  const linksEl    = document.getElementById('categoryLinks');
  const filterBar  = document.getElementById('filterBar');

  categories.forEach(cat => {
    const count = _trainings.filter(t => t.category === cat).length;
    const link  = document.createElement('button');
    link.className = 'sidebar-link';
    link.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
      ${cat}
      <span style="margin-left:auto;font-size:0.75rem;background:var(--col-surface-3);padding:1px 7px;border-radius:10px;">${count}</span>
    `;
    link.onclick = () => setFilter(cat, link);
    linksEl.appendChild(link);

    const chip = document.createElement('button');
    chip.className    = 'filter-chip';
    chip.dataset.filter = cat;
    chip.textContent  = cat;
    chip.onclick      = () => setFilter(cat);
    filterBar.appendChild(chip);
  });

  if (categories.length > 1) filterBar.style.display = 'flex';
}

// ── Filtro ───────────────────────────────────────────────────
function setFilter(cat, clickedLink) {
  _activeFilter = cat;
  document.querySelectorAll('.filter-chip').forEach(c =>
    c.classList.toggle('active', c.dataset.filter === cat || (cat === 'all' && !c.dataset.filter)));
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  if (clickedLink) clickedLink.classList.add('active');
  renderTrainings();
}

// ── Renderizar grid ──────────────────────────────────────────
async function renderTrainings() {
  const grid     = document.getElementById('trainingGrid');
  const filtered = _activeFilter === 'all'
    ? _trainings
    : _trainings.filter(t => t.category === _activeFilter);

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="1.5"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
        <h3>Nenhum treinamento</h3>
        <p style="font-size:0.85rem;">Nenhum treinamento disponível nesta categoria.</p>
      </div>`;
    return;
  }

  const levelColor = { 'Básico':'badge-green','Intermediário':'badge-amber','Avançado':'badge-danger' };
  const catColor   = { 'Segurança':'badge-orange','Regulatório':'badge-blue','Saúde':'badge-green','Técnico':'badge-amber','Eficiência':'badge-muted' };

  // Busca progresso de todos os treinamentos em paralelo
  const progressMap = {};
  await Promise.all(filtered.map(async t => {
    const p = await getProgress(_user.uid, t.id);
    progressMap[t.id] = p ? ((p.completedModules?.length || 0) / (t.modules?.length || 1)) * 100 : 0;
  }));

  grid.innerHTML = filtered.map(training => {
    const progress = progressMap[training.id] || 0;
    return `
      <div class="training-card" onclick="openTraining('${training.id}')">
        <div class="card-header-stripe" style="background:${_company?.color || 'var(--col-orange)'};"></div>
        <div class="card-body">
          <div class="card-category">
            <span class="badge ${catColor[training.category]||'badge-muted'}">${training.category}</span>
            <span class="badge ${levelColor[training.level]||'badge-muted'}" style="margin-left:4px;">${training.level}</span>
          </div>
          <div class="card-title">${training.title}</div>
          <p class="card-description">${training.description || ''}</p>
          <div class="card-meta">
            <span class="meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              ${formatDuration(training.totalDuration || 0)}
            </span>
            <span class="meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              ${(training.modules||[]).length} módulos
            </span>
          </div>
          ${progress > 0 ? `
          <div class="progress-bar">
            <div class="progress-fill" style="width:${progress}%;background:${_company?.color||'var(--col-orange)'};"></div>
          </div>
          <div style="font-size:0.75rem;color:var(--col-text-3);">${Math.round(progress)}% concluído</div>
          ` : ''}
        </div>
        <div class="card-footer">
          <span class="module-count">${(training.modules||[]).length} módulos</span>
          <button class="btn btn-primary btn-sm btn-start">
            ${progress > 0 ? 'Continuar' : 'Iniciar'}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>`;
  }).join('');
}

function openTraining(trainingId) {
  window.location.href = `training.html?training=${encodeURIComponent(trainingId)}`;
}

// ── Logout ───────────────────────────────────────────────────
function confirmLogout() {
  document.getElementById('logoutModal').style.display = 'flex';
}

function closeLogoutModal() {
  document.getElementById('logoutModal').style.display = 'none';
}

document.getElementById('logoutModal')?.addEventListener('click', e => {
  if (e.target.id === 'logoutModal') closeLogoutModal();
});

// ── Helpers ──────────────────────────────────────────────────
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}

function formatDuration(m) {
  if (m < 60) return m + 'min';
  const h = Math.floor(m/60), r = m%60;
  return r > 0 ? `${h}h ${r}min` : `${h}h`;
}

// Expõe para o HTML
Object.assign(window, {
  confirmLogout, closeLogoutModal, setFilter, logout, openTraining
});