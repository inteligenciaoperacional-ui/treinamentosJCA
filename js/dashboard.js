/* ============================================================
   JCA Treinamentos — Dashboard (Firebase)
   ============================================================ */

import { onAuthChange, logout, getInstructorByEmail, getCompanies, getTrainings, getProgress, LOGO_BY_SHORTNAME }
  from './firebase.js';

// LOGO_BY_SHORTNAME importado de firebase.js

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
          <div style="display:flex;gap:6px;align-items:center;margin-left:auto;">
            ${training.planoPDF ? `
            <button class="btn btn-sm btn-plano-aula"
              onclick="event.stopPropagation();openPdfViewer('${training.planoPDF}','${training.title.replace(/'/g,"\\'").replace(/"/g, '\"')}')">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
              Plano de Aula
            </button>` : ''}
            <button class="btn btn-primary btn-sm btn-start" style="padding:6px 16px;font-size:0.85rem;">
              ${progress > 0 ? 'Continuar' : 'Iniciar'}
            </button>
          </div>
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

// ── Lançamento de Treinamentos ──────────────────────────────

// ── Treinamentos do Sheets ──────────────────────────────────
const SHEETS_TREINAMENTOS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS94tDzkb7mFtnIgXeikqkHG44okldPb8eT9OgvgqVH_pMXCh-9S0Cmv0YH7KSqXV0i7x7ZZ4fkNlIb/pub?gid=1232385970&single=true&output=csv';

const PRAT_NOME      = 'PRAT - PROGRAMA REDUÇÃO DE ACIDENTES';
const INTEGRACAO_NOME = 'INTEGRAÇÃO OPERACIONAL - JCA';
const MAX_HORAS      = 8;

let _allTreinamentos = []; // [{nome, horas, exclusivo}]
let _selTreinamentos = []; // selecionados

async function loadTreinamentosSheets() {
  const container = document.getElementById('lancTreinamentosContainer');
  if (!container) return;
  container.innerHTML = '<div style="color:var(--col-text-3);font-size:.82rem;padding:8px;">Carregando treinamentos…</div>';

  try {
    const res  = await fetch(SHEETS_TREINAMENTOS_URL);
    const text = await res.text();
    const lines = text.trim().split(/\r?\n/);

    _allTreinamentos = [];
    lines.forEach((line, i) => {
      const cols = parseCSVLine(line);
      if (i === 0) return; // pula cabecalho
      const nome = (cols[0] || '').replace(/^"|"$/g,'').trim();
      if (!nome) return;
      const rawH = (cols[2] || '').replace(/^"|"$/g,'').trim().replace(',','.');
      const horas = parseFloat(rawH) || 0;
      const exclusivo = nome.includes('PRAT') || nome.includes('INTEGRAÇÃO OPERACIONAL');
      _allTreinamentos.push({ nome, horas, exclusivo });
    });

    _selTreinamentos = [];
    renderTreinamentosSelector();
  } catch(e) {
    container.innerHTML = '<div style="color:#FF4757;font-size:.82rem;padding:8px;">⚠ Erro ao carregar treinamentos.</div>';
  }
}

function parseCSVLine(line) {
  const cols = []; let cur = '', inQ = false;
  for (const ch of line) {
    if (ch === '"') inQ = !inQ;
    else if (ch === ',' && !inQ) { cols.push(cur); cur = ''; }
    else cur += ch;
  }
  cols.push(cur);
  return cols;
}

function renderTreinamentosSelector() {
  const container = document.getElementById('lancTreinamentosContainer');
  const somaH     = _selTreinamentos.reduce((s, t) => s + t.horas, 0);
  const temExclusivo = _selTreinamentos.some(t => t.exclusivo);
  const temNormal    = _selTreinamentos.some(t => !t.exclusivo);

  // Tags dos selecionados
  const tagsHtml = _selTreinamentos.length ? `
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;">
      ${_selTreinamentos.map(t => `
        <div style="display:flex;align-items:center;gap:6px;padding:4px 10px;background:var(--col-orange);border-radius:20px;">
          <span style="font-size:.78rem;font-weight:600;color:#0a0f1a;">${t.nome}${t.horas > 0 ? ' ('+t.horas+'h)' : ''}</span>
          <span onclick="removeTrein('${t.nome.replace(/'/g,"\'")}')" style="cursor:pointer;color:#0a0f1a;font-size:.9rem;line-height:1;">✕</span>
        </div>`).join('')}
    </div>
    <div style="font-size:.8rem;color:var(--col-text-2);margin-bottom:10px;">
      Total: <strong>${somaH}h</strong> de ${MAX_HORAS}h máximas
      ${somaH >= MAX_HORAS ? '<span style="color:#FF4757;"> ⚠ Limite atingido</span>' : ''}
    </div>` : '';

  // Lista de opções
  const opcoesHtml = _allTreinamentos.map(t => {
    const jaSel     = _selTreinamentos.some(s => s.nome === t.nome);
    const bloqExcl  = !jaSel && temExclusivo && !t.exclusivo;
    const bloqExcl2 = !jaSel && temExclusivo && t.exclusivo;
    const bloqNorm  = !jaSel && temNormal    && t.exclusivo;
    const bloqHoras = !jaSel && !t.exclusivo && !temExclusivo && (somaH + t.horas) > MAX_HORAS;
    const bloqueado = bloqExcl || bloqExcl2 || bloqNorm || bloqHoras;

    let motivo = '';
    if (bloqExcl)  motivo = 'Não combinável com treinamento exclusivo';
    if (bloqExcl2) motivo = 'Treinamentos exclusivos não podem ser combinados entre si';
    if (bloqNorm)  motivo = 'Este treinamento não pode ser combinado com outros';
    if (bloqHoras) motivo = 'Excederia o limite de 8h';

    return `<div onclick="${bloqueado ? '' : `toggleTrein('${t.nome.replace(/'/g,"\'")}')`}"
      title="${motivo}"
      style="display:flex;align-items:center;gap:10px;padding:8px 12px;cursor:${bloqueado ? 'not-allowed' : 'pointer'};
             opacity:${bloqueado ? '0.4' : '1'};border-bottom:1px solid var(--col-border);
             background:${jaSel ? 'rgba(0,180,166,0.12)' : ''};transition:background .1s;"
      onmouseenter="if(!${bloqueado}) this.style.background='var(--col-surface-2)'"
      onmouseleave="this.style.background='${jaSel ? 'rgba(0,180,166,0.12)' : ''}'">
      <div style="width:16px;height:16px;border-radius:4px;border:2px solid ${jaSel ? 'var(--col-orange)' : 'var(--col-border)'};
                  background:${jaSel ? 'var(--col-orange)' : ''};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        ${jaSel ? '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0a0f1a" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
      </div>
      <span style="flex:1;font-size:.82rem;">${t.nome}</span>
      ${t.horas > 0 ? `<span style="font-size:.75rem;color:var(--col-text-3);font-family:var(--font-mono);">${t.horas}h</span>` : ''}
      ${t.exclusivo ? '<span style="font-size:.68rem;padding:2px 6px;background:rgba(138,56,236,0.2);color:#a855f7;border-radius:4px;">EXCLUSIVO</span>' : ''}
    </div>`;
  }).join('');

  // Campo de busca
  container.innerHTML = `
    ${tagsHtml}
    <div style="border:1.5px solid var(--col-border);border-radius:10px;overflow:hidden;">
      <div style="padding:8px 12px;border-bottom:1px solid var(--col-border);background:var(--col-surface-2);">
        <input type="text" placeholder="🔍 Buscar treinamento…" id="lancBuscaTrein"
          oninput="filtrarTrein(this.value)"
          style="width:100%;background:transparent;border:none;outline:none;font-size:.82rem;color:var(--col-text);">
      </div>
      <div id="lancListaTrein" style="max-height:${somaH >= MAX_HORAS || (temExclusivo && _selTreinamentos.length > 0) ? '0px' : '200px'};overflow-y:auto;overflow:hidden;transition:max-height .3s ease;">
        ${opcoesHtml}
      </div>
    </div>`;
}

window.toggleTrein = function(nome) {
  const t = _allTreinamentos.find(x => x.nome === nome);
  if (!t) return;
  const idx = _selTreinamentos.findIndex(x => x.nome === nome);
  if (idx >= 0) {
    _selTreinamentos.splice(idx, 1);
  } else {
    const somaH        = _selTreinamentos.reduce((s, x) => s + x.horas, 0);
    const temExclusivo = _selTreinamentos.some(x => x.exclusivo);
    const temNormal    = _selTreinamentos.some(x => !x.exclusivo);
    if (t.exclusivo && temNormal)    { showToastLanc('Este treinamento não pode ser combinado com outros.', 'err'); return; }
    if (t.exclusivo && temExclusivo){ showToastLanc('Treinamentos exclusivos não podem ser combinados entre si.', 'err'); return; }
    if (!t.exclusivo && temExclusivo){ showToastLanc('Não é possível combinar com treinamento exclusivo.', 'err'); return; }
    if (!t.exclusivo && (somaH + t.horas) > MAX_HORAS) { showToastLanc('Limite de 8h atingido!', 'err'); return; }
    _selTreinamentos.push(t);
  }
  renderTreinamentosSelector();
};

window.removeTrein = function(nome) {
  _selTreinamentos = _selTreinamentos.filter(x => x.nome !== nome);
  renderTreinamentosSelector();
};

window.filtrarTrein = function(q) {
  const lista = document.getElementById('lancListaTrein');
  if (!lista) return;
  lista.querySelectorAll('div').forEach(el => {
    const txt = el.textContent.toLowerCase();
    el.style.display = txt.includes(q.toLowerCase()) ? '' : 'none';
  });
};


const LANCAMENTO_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbySN13mYUFXOwoLURicOyNwqiKebrY3J0fGE8Qb16jopKBLvjjLcIONZausj4b9AFgRBw/exec';

let _quadroDB = null;
let _lancSugActive = -1;
let _lancColabSelecionado = null;
let _motoristas = []; // lista de motoristas adicionados [{mat, nome, emp, desc}]

async function loadQuadroDB() {
  if (_quadroDB) return _quadroDB;

  try {
    const res = await fetch('./quadro_db.json');
    const raw = await res.json();

    // pega as linhas do JSON
    const rows = raw?.body?.results?.[0]?.tables?.[0]?.rows || [];

    // transforma em objeto indexado pela matrícula
    _quadroDB = {};

    rows.forEach(r => {
      const matricula = String(r["[Matricula]"] || '').trim();

      if (!matricula) return;

      _quadroDB[matricula] = [
        r["[Nome]"] || '',
        r["[Empresa]"] || '',
        r["[Setor]"] || ''
      ];
    });

    console.log('Quadro DB carregado:', _quadroDB);

  } catch(e) {
    _quadroDB = {};
    console.warn('Erro ao carregar quadro_db.json', e);
  }

  return _quadroDB;
}

async function showLancamento() {
  // Esconde grid e mostra painel
  document.getElementById('trainingGrid').style.display = 'none';
  document.getElementById('filterBar').style.display = 'none';
  document.getElementById('lancamentoPanel').style.display = 'block';

  // Marca botão ativo na sidebar
  document.querySelectorAll('.sidebar-link').forEach(b => b.classList.remove('active'));
  document.getElementById('btnLancamento').classList.add('active');

  // Preenche dados do instrutor
  if (_instructor) {
    const letter = (_instructor.nome || '?')[0].toUpperCase();
    document.getElementById('lancInstrAvatar').textContent = letter;
    document.getElementById('lancInstrNome').textContent = _instructor.nome || _user.email;
    document.getElementById('lancInstrMat').textContent = 'Matrícula: ' + (_instructor.matricula || 'N/D');
  }

  // Carrega treinamentos do Sheets com carga horária
  await loadTreinamentosSheets();

  // Define data máxima como hoje
  document.getElementById('lancData').max = new Date().toISOString().split('T')[0];

  // Pre-carrega o banco
  loadQuadroDB();
}

function hideLancamento() {
  document.getElementById('lancamentoPanel').style.display = 'none';
  document.getElementById('trainingGrid').style.display = '';
}

// Autocomplete matrícula
window.onLancMat = function(el) {
  el.value = el.value.replace(/\D/g, '').slice(0, 6);
  _lancColabSelecionado = null;
  document.getElementById('lancColabPreview').style.display = 'none';
  const q = el.value;
  if (!q) { hideLancSugNow(); return; }
  showLancSug(q);
};

window.addMotorista = function() {
  if (!_lancColabSelecionado) {
    showToastLanc('Selecione um colaborador válido da lista.', 'err');
    return;
  }
  const { mat } = _lancColabSelecionado;
  if (_motoristas.find(m => m.mat === mat)) {
    showToastLanc('Este motorista já foi adicionado.', 'err');
    return;
  }
  _motoristas.push({..._lancColabSelecionado});
  _lancColabSelecionado = null;
  document.getElementById('lancMat').value = '';
  document.getElementById('lancColabPreview').style.display = 'none';
  renderMotoristaTags();
};

function renderMotoristaTags() {
  const tags = document.getElementById('lancMotTags');
  const count = document.getElementById('lancMotCount');
  if (!tags) return;
  count.textContent = _motoristas.length + ' adicionado' + (_motoristas.length !== 1 ? 's' : '');
  tags.innerHTML = _motoristas.map(m => `
    <div style="display:flex;align-items:center;gap:6px;padding:4px 10px;background:var(--col-surface-2);border:1px solid var(--col-border);border-radius:20px;max-width:100%;">
      <span style="font-family:var(--font-mono);font-size:.72rem;color:var(--col-orange);">${m.mat}</span>
      <span style="font-size:.75rem;font-weight:600;color:var(--col-text);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${m.nome}</span>
      <span onclick="removeMotorista('${m.mat}')" style="cursor:pointer;color:var(--col-text-3);font-size:.85rem;line-height:1;flex-shrink:0;">✕</span>
    </div>`).join('');
}

window.removeMotorista = function(mat) {
  _motoristas = _motoristas.filter(m => m.mat !== mat);
  renderMotoristaTags();
};

async function showLancSug(q) {
  const db = await loadQuadroDB();
  const box = document.getElementById('lancSug');
  const matches = Object.keys(db).filter(k => k.startsWith(q)).slice(0, 8);
  if (!matches.length) {
    box.innerHTML = '<div style="padding:10px 12px;font-size:.82rem;color:var(--col-text-3);text-align:center;">Nenhum colaborador encontrado</div>';
  } else {
    box.innerHTML = matches.map((k, i) => {
      const r = db[k];
      return `<div class="lanc-sug-item" data-mat="${k}" data-nome="${r[0]}" data-emp="${r[1]}" data-desc="${r[2]}"
        style="display:flex;gap:10px;align-items:center;padding:8px 12px;cursor:pointer;border-bottom:1px solid var(--col-border);transition:background .1s;"
        onmouseenter="this.style.background='var(--col-surface-2)'"
        onmouseleave="this.style.background=''"
        onmousedown="pickLancColab(event)">
        <span style="font-family:var(--font-mono);font-weight:700;font-size:.82rem;color:var(--col-orange);min-width:52px;">${k}</span>
        <span style="flex:1;">
          <div style="font-size:.82rem;font-weight:600;">${r[0]}</div>
          <div style="font-size:.72rem;color:var(--col-text-3);">${r[1]}${r[2] ? ' · ' + r[2] : ''}</div>
        </span>
      </div>`;
    }).join('');
  }
  box.style.display = 'block';
  _lancSugActive = -1;
}

window.pickLancColab = function(e) {
  e.preventDefault();
  const el = e.currentTarget;
  _lancColabSelecionado = { mat: el.dataset.mat, nome: el.dataset.nome, emp: el.dataset.emp, desc: el.dataset.desc };
  document.getElementById('lancMat').value = el.dataset.mat;
  document.getElementById('lancColabNome').textContent = el.dataset.nome;
  document.getElementById('lancColabInfo').textContent = el.dataset.emp + (el.dataset.desc ? ' · ' + el.dataset.desc : '');
  document.getElementById('lancColabPreview').style.display = 'block';
  hideLancSugNow();
};

window.hideLancSug = function() { setTimeout(hideLancSugNow, 150); };
function hideLancSugNow() { const b = document.getElementById('lancSug'); if (b) b.style.display = 'none'; }

window.lancMatKey = function(e) {
  const box = document.getElementById('lancSug');
  const items = box.querySelectorAll('.lanc-sug-item');
  if (e.key === 'Enter') {
    e.preventDefault();
    if (_lancSugActive >= 0 && items[_lancSugActive]) {
      items[_lancSugActive].dispatchEvent(new MouseEvent('mousedown'));
    } else {
      window.addMotorista();
    }
    return;
  }
  if (!items.length) return;
  if (e.key === 'ArrowDown') { e.preventDefault(); _lancSugActive = Math.min(_lancSugActive + 1, items.length - 1); highlightLancSug(items); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); _lancSugActive = Math.max(_lancSugActive - 1, 0); highlightLancSug(items); }
  else if (e.key === 'Escape') hideLancSugNow();
};

function highlightLancSug(items) {
  items.forEach((el, i) => el.style.background = i === _lancSugActive ? 'var(--col-surface-2)' : '');
  if (items[_lancSugActive]) items[_lancSugActive].scrollIntoView({ block: 'nearest' });
}

// File preview
window.onLancFile = function(input) {
  const name = input.files[0]?.name || 'Nenhum arquivo selecionado';
  document.getElementById('lancFileName').textContent = name;
};

// Submit
window.submitLancamento = async function(e) {
  e.preventDefault();

  const mat        = document.getElementById('lancMat').value.trim();
  const data       = document.getElementById('lancData').value;
  const fileInput  = document.getElementById('lancFile');
  const file       = fileInput.files[0];

  if (!_motoristas.length) { showToastLanc('Adicione ao menos um motorista.', 'err'); return; }
  if (!data) { showToastLanc('Informe a data de realização.', 'err'); return; }
  if (!_selTreinamentos.length) { showToastLanc('Selecione ao menos um treinamento.', 'err'); return; }
  if (!file) { showToastLanc('Anexe a lista assinada.', 'err'); return; }

  const btn = document.getElementById('lancSubmitBtn');
  btn.disabled = true;
  btn.textContent = 'Enviando…';

  try {
    // Converte arquivo para base64
    const base64 = await fileToBase64(file);

    const payload = {
      motoristas:      _motoristas.map(m => m.mat),
      dataRealizacao:  data.split('-').reverse().join('/'),
      treinamentos:    _selTreinamentos.map(t => t.nome),
      matInstrutor:    _instructor?.matricula || '',
      emailInstrutor:  _user?.email || '',
      anexoBase64:     base64,
      anexoNome:       file.name,
      anexoTipo:       file.type,
    };

    await fetch(LANCAMENTO_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify(payload),
    });

    // com no-cors não lemos a resposta, mas o dado chega na planilha
    if (true) {
      showStatusLanc('✅ Lançamento enviado com sucesso!', '#00D68F');
      document.getElementById('lancForm').reset();
      document.getElementById('lancColabPreview').style.display = 'none';
      document.getElementById('lancFileName').textContent = 'Clique para selecionar arquivo…';
      _lancColabSelecionado = null;
      _motoristas = [];
      renderMotoristaTags();
      _selTreinamentos = [];
      renderTreinamentosSelector();
    } else {
      throw new Error(result.error || 'Erro desconhecido');
    }
  } catch(err) {
    showStatusLanc('❌ Erro ao enviar: ' + err.message, '#FF4757');
    console.error(err);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="22 2 11 13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Enviar Lançamento';
  }
};

function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload  = () => res(r.result.split(',')[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

function showStatusLanc(msg, color) {
  const el = document.getElementById('lancStatus');
  el.textContent = msg;
  el.style.display = 'block';
  el.style.background = color + '22';
  el.style.border = '1px solid ' + color;
  el.style.color = color;
  setTimeout(() => el.style.display = 'none', 6000);
}

function showToastLanc(msg, type) {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = 'toast toast-' + (type === 'err' ? 'error' : 'success');
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// Override setFilter to hide lançamento panel
const _origSetFilter = window.setFilter;
window.setFilter = function(cat) {
  document.getElementById('lancamentoPanel').style.display = 'none';
  document.getElementById('trainingGrid').style.display = '';
  document.getElementById('filterBar').style.display = '';
  document.getElementById('btnLancamento').classList.remove('active');
  if (_origSetFilter) _origSetFilter(cat);
};

window.showLancamento = showLancamento;
// ── PDF Viewer Modal ────────────────────────────────────────
window.openPdfViewer = function(url, title) {
  const old = document.getElementById('pdfViewerModal');
  if (old) old.remove();

  // Garante que usa URL de preview do Drive
  const previewUrl = url.includes('/preview') ? url : url.replace('/view', '/preview').replace('/edit', '/preview');

  const modal = document.createElement('div');
  modal.id = 'pdfViewerModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.88);z-index:9000;display:flex;flex-direction:column;';

  modal.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 20px;background:var(--col-surface);border-bottom:1px solid var(--col-border);gap:12px;flex-shrink:0;">
      <div style="display:flex;align-items:center;gap:10px;min-width:0;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--col-orange)" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <span style="font-family:var(--font-display);font-size:1rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--col-text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">Plano de Aula — ${title}</span>
      </div>
      <div style="display:flex;gap:8px;flex-shrink:0;">
        <button class="btn btn-ghost btn-sm" onclick="window.printDrivePdf('${previewUrl}')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          Imprimir
        </button>
        <button class="btn btn-ghost btn-sm" onclick="document.getElementById('pdfViewerModal').remove()">✕ Fechar</button>
      </div>
    </div>
    <iframe src="${previewUrl}" style="flex:1;border:none;background:#fff;" allowfullscreen></iframe>
  `;

  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
};

window.printDrivePdf = function(previewUrl) {
  const printUrl = previewUrl.replace('/preview', '/view');
  const win = window.open(printUrl, '_blank', 'width=900,height=700');
  if (win) {
    // Aguarda carregar e aciona impressão
    const interval = setInterval(() => {
      try {
        if (win.document.readyState === 'complete') {
          clearInterval(interval);
          setTimeout(() => { try { win.print(); } catch(e) {} }, 800);
        }
      } catch(e) { clearInterval(interval); }
    }, 300);
    // Fallback: aciona após 3s independente
    setTimeout(() => { clearInterval(interval); try { win.print(); } catch(e) {} }, 3000);
  }
};
