/* ============================================================
   TrainHub — Training UI (Firebase Auth)
   ============================================================ */

import { onAuthChange, getInstructorByEmail, getCompanies, getTrainings }
  from './firebase.js';

let _user       = null;
let _instructor = null;
let _training   = null;
let _company    = null;

document.addEventListener('DOMContentLoaded', () => {
  onAuthChange(async (firebaseUser) => {
    if (!firebaseUser) { window.location.href = 'login.html'; return; }

    _user       = firebaseUser;
    _instructor = await getInstructorByEmail(firebaseUser.email);
    if (!_instructor) { window.location.href = 'login.html'; return; }

    const params     = new URLSearchParams(window.location.search);
    const trainingId = params.get('training');
    if (!trainingId) { window.location.href = 'dashboard.html'; return; }

    // Carrega treinamentos da empresa
    const companies = await getCompanies();
    _company = companies.find(c => c.id === _instructor.empresaId) || null;

    const trainings = await getTrainings(_instructor.empresaId);
    _training = trainings.find(t => t.id === trainingId) || null;

    if (!_training) {
      alert('Treinamento não encontrado.');
      window.location.href = 'dashboard.html';
      return;
    }

    // Aplica cor da empresa
    if (_company?.color) {
      document.documentElement.style.setProperty('--col-orange', _company.color);
    }

    // Inicializa sessão de treinamento
    window.TrainingSession.init(_training, _user.uid, false); // Sempre começa do zero

    // UI inicial
    document.getElementById('topbarTitle').textContent = _training.title;
    document.title = _training.title + ' — TrainHub';

    renderModulesList();
    loadCurrentModule();
  });
});

// ── Renderizar lista de módulos ─────────────────────────────
function renderModulesList() {
  const list  = document.getElementById('modulesList');
  const state = window.TrainingSession.getTimerState();

  list.innerHTML = _training.modules.map((mod, i) => {
    const isActive    = i === state.currentModuleIndex;
    const isCompleted = state.completedModules.includes(mod.id);
    return '<div class="module-item '+(isActive?'active':'')+' '+(isCompleted?'completed':'')+'" id="modItem-'+i+'" onclick="goToModule('+i+')">'
      + '<div class="module-number">'+(i+1)+'</div>'
      + '<div class="module-info"><div class="module-name">'+mod.title+'</div>'
      + '<div class="module-duration">'+formatDuration(mod.duration)+'</div></div>'
      + '<svg class="module-check" viewBox="0 0 24 24" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>'
      + '</div>';
  }).join('');

  updateProgress();
}

// ── Carregar módulo atual ───────────────────────────────────
function loadCurrentModule() {
  const mod   = TrainingSession.getCurrentModule();
  if (!mod) return;

  const state       = TrainingSession.getTimerState();
  const iframe      = document.getElementById('contentFrame');
  const placeholder = document.getElementById('contentPlaceholder');

  renderModulesList();

  document.getElementById('moduleBarTitle').textContent = (state.currentModuleIndex + 1) + '. ' + mod.title;

  // Mostra a carga horária do módulo no timer desde o início
  const targetSecs = (mod.duration || 0) * 60;
  const targetFmt  = window.TrainingSession.formatSeconds(targetSecs);
  document.getElementById('timerModuleTarget').textContent = targetSecs > 0 ? '/ ' + targetFmt : '/ —';
  // Focus timer target
  const ftgt = document.getElementById('focusTimerTarget');
  if (ftgt) ftgt.textContent = targetSecs > 0 ? targetFmt : '—';
  document.getElementById('modProgText').textContent = '00:00 / ' + (targetSecs > 0 ? targetFmt : '—');
  document.getElementById('moduleCounter').textContent  = (state.currentModuleIndex + 1) + ' / ' + state.totalModules;
  document.getElementById('btnPrev').disabled           = state.isFirstModule;
  document.getElementById('btnNext').style.display      = state.isLastModule ? 'none' : 'flex';
  document.getElementById('btnFinish').style.display    = state.isLastModule ? 'flex' : 'none';

  const hasUrl = mod.githubUrl && mod.githubUrl.trim() !== '' && !mod.githubUrl.includes('SEU_USUARIO');
  if (hasUrl) {
    placeholder.style.display = 'none';
    iframe.style.display      = 'block';
    iframe.src = 'about:blank';
    setTimeout(() => { iframe.src = mod.githubUrl; }, 80);
  } else {
    iframe.style.display      = 'none';
    placeholder.style.display = 'flex';
    document.getElementById('placeholderTitle').textContent = mod.title;
    document.getElementById('placeholderMsg').textContent   = 'Configure o link do Google Slides em data/companies.js.';
    const urlEl  = document.getElementById('urlDisplay');
    const extBtn = document.getElementById('openExternalBtn');
    if (mod.githubUrl && !mod.githubUrl.includes('SEU_USUARIO')) {
      urlEl.textContent  = mod.githubUrl; urlEl.style.display  = 'block';
      extBtn.href        = mod.githubUrl; extBtn.style.display = 'flex';
    } else {
      urlEl.style.display = 'none'; extBtn.style.display = 'none';
    }
  }
}

// ── Timer ───────────────────────────────────────────────────
let _timerRunning = false;

function toggleTimer() {
  if (_timerRunning) { TrainingSession.pauseTimer(); _timerRunning = false; }
  else               { TrainingSession.startTimer(onTimerTick); _timerRunning = true; }
  updatePlayPauseBtn();
}

function onTimerTick(state) {
  // Timer principal
  document.getElementById('timerModuleVal').textContent    = state.moduleFormatted;
  document.getElementById('timerModuleTarget').textContent = '/ ' + state.moduleTargetFormatted;
  document.getElementById('timerTotalVal').textContent     = state.totalFormatted;

  const modBlock = document.getElementById('timerModule');
  modBlock.className = 'timer-block running';
  if (state.moduleAlert)    modBlock.classList.add('alert');
  if (state.moduleOverTime) modBlock.classList.add('overtime');

  document.getElementById('modProgFill').style.width = state.modulePercent + '%';
  document.getElementById('modProgText').textContent = state.moduleFormatted + ' / ' + state.moduleTargetFormatted;

  // Timer flutuante (modo apresentação)
  const fv = document.getElementById('focusTimerVal');
  const ftgt = document.getElementById('focusTimerTarget');
  if (fv) {
    fv.textContent = state.moduleFormatted;
    fv.classList.toggle('overtime', state.moduleOverTime);
  }
  if (ftgt) ftgt.textContent = state.moduleTargetFormatted || '—';

  // Atualiza barra de progresso do módulo na topbar também
  document.getElementById('timerModuleVal').textContent = state.moduleFormatted;

  if (state.moduleOverTime && !_alertedOvertime) {
    _alertedOvertime = true;
    showToast('⚠️ Tempo do módulo excedido!', 'warning');
  }
}

let _alertedOvertime = false;

function updatePlayPauseBtn() {
  document.getElementById('playIcon').style.display  = _timerRunning ? 'none'  : 'block';
  document.getElementById('pauseIcon').style.display = _timerRunning ? 'block' : 'none';
  // Focus mode icons
  const fp = document.getElementById('focusPlayIcon');
  const fpa = document.getElementById('focusPauseIcon');
  if (fp)  fp.style.display  = _timerRunning ? 'none'  : 'block';
  if (fpa) fpa.style.display = _timerRunning ? 'block' : 'none';
}

function resetModuleTimer() {
  window.TrainingSession.resetModuleTimer(); _alertedOvertime = false;
  document.getElementById('timerModuleVal').textContent = '00:00';
  document.getElementById('modProgFill').style.width    = '0%';
  document.getElementById('modProgText').textContent    = '0:00 / —';
  document.getElementById('timerModule').className      = 'timer-block';
  showToast('Timer do módulo zerado.', 'info');
}

function resetAllTimers() {
  if (!confirm('Reiniciar toda a sessão? O progresso será perdido.')) return;
  window.TrainingSession.resetAllTimers(); _timerRunning = false; _alertedOvertime = false;
  updatePlayPauseBtn(); loadCurrentModule(); renderModulesList();
  document.getElementById('timerTotalVal').textContent  = '00:00';
  document.getElementById('timerModuleVal').textContent = '00:00';
  document.getElementById('timerModule').className      = 'timer-block';
  showToast('Sessão reiniciada.', 'info');
}

// ── Navegação ───────────────────────────────────────────────
function nextModule() {
  _alertedOvertime = false;
  if (TrainingSession.nextModule()) { loadCurrentModule(); updateProgress(); showToast('Próximo módulo!','success'); }
}
function prevModule() {
  _alertedOvertime = false;
  if (TrainingSession.prevModule()) { loadCurrentModule(); updateProgress(); }
}
function goToModule(index) {
  _alertedOvertime = false;
  if (TrainingSession.goToModule(index)) { loadCurrentModule(); updateProgress(); }
}

function updateProgress() {
  const state = window.TrainingSession.getTimerState();
  const pct   = state.totalModules > 0 ? Math.round((state.completedModules.length / state.totalModules) * 100) : 0;
  document.getElementById('progressLabel').textContent   = state.completedModules.length + ' / ' + state.totalModules + ' módulos';
  document.getElementById('progressPercent').textContent = pct + '%';
  document.getElementById('progressFill').style.width    = pct + '%';
}

// ── Concluir ────────────────────────────────────────────────
function finishTraining() {
  const finalState = window.TrainingSession.completeTraining();
  _timerRunning = false; updatePlayPauseBtn();
  document.getElementById('statFinalTime').textContent    = finalState.totalFormatted;
  document.getElementById('statModulesCount').textContent = String(finalState.totalModules);
  document.getElementById('completionModal').classList.add('visible');
}

function closeCompletion() {
  document.getElementById('completionModal').classList.remove('visible');
}

// ── Fullscreen ──────────────────────────────────────────────
function toggleFullscreen() {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(()=>{});
  else document.exitFullscreen().catch(()=>{});
}

function openGithubUrl() {
  const mod = window.TrainingSession.getCurrentModule();
  if (mod?.githubUrl) window.open(mod.githubUrl, '_blank');
}

// ── Atalhos ─────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (document.activeElement === document.getElementById('contentFrame')) return;
  switch(e.key) {
    case ' ':          e.preventDefault(); toggleTimer(); break;
    case 'ArrowRight': case 'PageDown':    nextModule();  break;
    case 'ArrowLeft':  case 'PageUp':      prevModule();  break;
    case 'f': case 'F': toggleFullscreen(); break;
  }
});

// ── Toast ───────────────────────────────────────────────────
function showToast(msg, type='info') {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = 'toast toast-'+type; t.textContent = msg;
  c.appendChild(t); setTimeout(()=>t.remove(), 3000);
}

function formatDuration(m) {
  if (!m) return '—';
  if (m < 60) return m + 'min';
  const h = Math.floor(m/60), r = m%60;
  return r > 0 ? h+'h '+r+'min' : h+'h';
}

// ── Modo Apresentação ──────────────────────────────────────
let _focusMode = false;

function toggleFocusMode() {
  _focusMode = !_focusMode;
  document.body.classList.toggle('focus-mode', _focusMode);

  if (_focusMode) {
    // Entra em tela cheia automaticamente
    document.documentElement.requestFullscreen().catch(() => {});
    // Inicia timer automaticamente
    if (!_timerRunning) toggleTimer();
  } else {
    // Sai da tela cheia
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }

  const btn = document.getElementById('btnFocus');
  if (btn) {
    btn.innerHTML = _focusMode
      ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg> Controles'
      : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg> Modo Apresentação';
  }
}

// Sai do modo foco se o usuário sair do fullscreen pelo ESC
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement && _focusMode) {
    _focusMode = false;
    document.body.classList.remove('focus-mode');
    const btn = document.getElementById('btnFocus');
    if (btn) btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg> Modo Apresentação';
  }
});

// Expõe para o HTML
Object.assign(window, {
  toggleTimer, resetModuleTimer, resetAllTimers,
  nextModule, prevModule, goToModule,
  finishTraining, closeCompletion,
  toggleFullscreen, openGithubUrl, toggleFocusMode,
});