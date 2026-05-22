/* ============================================================
   JCA Treinamentos — Training UI (Firebase Auth)
   ============================================================ */

import { onAuthChange, getInstructorByEmail, getCompanies, getTrainings, saveSession, saveProgress, getProgress }
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

    // Carrega progresso salvo do Firebase
    const savedProgress = await getProgress(_user.uid, _training.id);

    // Inicializa sessão — retoma se houver progresso salvo
    window.TrainingSession.init(_training, _user.uid, false);

    // Restaura módulos concluídos
    if (savedProgress?.completedModules?.length) {
      const lastCompleted = savedProgress.completedModules.length;
      // Avança para o próximo módulo não concluído
      for (let i = 0; i < lastCompleted && i < _training.modules.length - 1; i++) {
        window.TrainingSession.goToModule(i);
        window.TrainingSession._forceComplete(i);
      }
      window.TrainingSession.goToModule(Math.min(lastCompleted, _training.modules.length - 1));
      _completedModules = new Set(savedProgress.completedModules);
    }

    // UI inicial
    document.getElementById('topbarTitle').textContent = _training.title;
    document.title = _training.title + ' — JCA Treinamentos';

    renderModulesList();
    loadCurrentModule();

    // Garante estado inicial correto sem mostrar overlay de pausa
    _timerRunning = false;
    _hasStarted = false;
    window.TrainingSession.pauseTimer();
    updatePlayPauseBtn();
  });
});

// ── Renderizar lista de módulos ─────────────────────────────
function renderModulesList() {
  const list  = document.getElementById('modulesList');
  const state = window.TrainingSession.getTimerState();

  list.innerHTML = _training.modules.map((mod, i) => {
    const isActive    = i === state.currentModuleIndex;
    const isCompleted = state.completedModules.includes(mod.id);
    // Módulo está liberado se é o primeiro, está ativo, ou o anterior foi concluído
    const isUnlocked  = i === 0 || isCompleted || isActive || state.completedModules.includes(_training.modules[i-1]?.id);
    const isLocked    = !isUnlocked;

    return '<div class="module-item '+(isActive?'active':'')
      +' '+(isCompleted?'completed':'')
      +' '+(isLocked?'locked':'')+'"'
      +' id="modItem-'+i+'"'
      +' onclick="'+(isLocked?'showLockedToast()':'goToModule('+i+')')+'"'
      +' title="'+(isLocked?'Conclua o módulo anterior primeiro':'')+'">'
      + '<div class="module-number">'
      + (isLocked
          ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'
          : (i+1))
      + '</div>'
      + '<div class="module-info"><div class="module-name">'+mod.title+'</div>'
      + '<div class="module-duration">'+(isLocked?'<span style="color:var(--col-text-3);font-size:.7rem">Bloqueado</span>':formatDuration(mod.duration))+'</div></div>'
      + (isCompleted ? '<svg class="module-check" viewBox="0 0 24 24" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>' : '')
      + '</div>';
  }).join('');

  updateProgress();
}

function showLockedToast() {
  showToast('Conclua o módulo anterior primeiro.', 'warning');
}

// ── Carregar módulo atual ───────────────────────────────────
function loadCurrentModule() {
  const mod   = window.TrainingSession.getCurrentModule();
  if (!mod) return;

  const state       = window.TrainingSession.getTimerState();
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
  document.getElementById('btnPrev').disabled = state.isFirstModule || !_timerRunning;
  // Reset módulo atual como não concluído ao carregar novo módulo
  _currentModuleDone = mod ? _completedModules.has(mod.id) : false;
  updateNextButton();

  const hasUrl = mod.githubUrl && mod.githubUrl.trim() !== '' && !mod.githubUrl.includes('SEU_USUARIO');
  if (hasUrl) {
    placeholder.style.display = 'none';
    iframe.style.display      = 'block';
    iframe.src = 'about:blank';
    setTimeout(() => {
      // Garante que os slides não avançam automaticamente
      let url = mod.githubUrl;
      url = url.replace(/start=true/gi, 'start=false');
      if (!url.includes('start=')) url += (url.includes('?') ? '&' : '?') + 'start=false';
      iframe.src = url;
    }, 80);
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
let _hasStarted = false;          // true após o instrutor apertar play pela primeira vez
let _awaitingConclusion = false; // true quando último módulo concluído, aguardando "Concluir Treinamento"
let _sessionStartedAt = null;
let _moduleTimings = {};
let _currentModuleStartTime = null;
let _completedModules = new Set(); // módulos marcados como concluídos pelo instrutor
let _currentModuleDone = false;   // se o módulo atual foi marcado como concluído

function toggleTimer() {
  if (_timerRunning) { window.TrainingSession.pauseTimer(); _timerRunning = false; }
  else {
    _hasStarted = true;
    window.TrainingSession.startTimer(onTimerTick); _timerRunning = true; _awaitingConclusion = false;
    if (!_sessionStartedAt) _sessionStartedAt = new Date().toISOString();
    if (!_currentModuleStartTime) _currentModuleStartTime = Date.now();
  }
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
  // Overlay de pausa — bloqueia tudo quando pausado (exceto ao aguardar conclusão)
  const pauseOverlay = document.getElementById('pauseBlockOverlay');
  if (pauseOverlay) pauseOverlay.style.display = (_hasStarted && !_timerRunning && !_awaitingConclusion) ? 'flex' : 'none';
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
function concludeCurrentModule() {
  const mod = window.TrainingSession.getCurrentModule();
  if (!mod) return;
  _completedModules.add(mod.id);
  _currentModuleDone = true;

  // Salva progresso no Firebase
  saveProgress(_user.uid, _training.id, {
    completedModules: [..._completedModules],
    currentModuleIndex: window.TrainingSession.getTimerState().currentModuleIndex,
    updatedAt: new Date().toISOString(),
  }).catch(e => console.warn('Erro ao salvar progresso:', e));

  // Se for o último módulo, pausa o timer
  const stateNow = window.TrainingSession.getTimerState();
  if (stateNow.isLastModule) {
    window.TrainingSession.pauseTimer();
    _timerRunning = false;
    const playIcon  = document.getElementById('playIcon');
    const pauseIcon = document.getElementById('pauseIcon');
    if (playIcon)  playIcon.style.display  = 'block';
    if (pauseIcon) pauseIcon.style.display = 'none';
    document.getElementById('timerModule')?.classList.remove('running','alert','overtime');
    document.getElementById('timerTotal')?.classList.remove('running');
    // Não mostra overlay de pausa no último módulo — aguarda conclusão
    _awaitingConclusion = true;
  }

  // Atualiza botões
  updateNextButton();
  renderModulesList();
  const msg = stateNow.isLastModule
    ? 'Módulo concluído! Clique em "Concluir Treinamento" para finalizar.'
    : 'Módulo concluído! Pode avançar para o próximo.';
  showToast(msg, 'success');

  // Garante que o overlay de pausa não aparece ao concluir último módulo
  if (stateNow.isLastModule) {
    const po = document.getElementById('pauseBlockOverlay');
    if (po) po.style.display = 'none';
  }
}

function updateNextButton() {
  const state = window.TrainingSession.getTimerState();
  const btnNext     = document.getElementById('btnNext');
  const btnFinish   = document.getElementById('btnFinish');
  const btnConclude = document.getElementById('btnConcludeModule');

  // Esconde todos primeiro
  if (btnNext)     btnNext.style.display     = 'none';
  if (btnFinish)   btnFinish.style.display   = 'none';
  if (btnConclude) btnConclude.style.display = 'none';

  if (!_currentModuleDone) {
    // Ainda não concluiu — mostra botão amarelo "Concluir este Módulo"
    if (btnConclude) btnConclude.style.display = 'flex';
  } else if (state.isLastModule) {
    // Último módulo concluído — mostra "Concluir Treinamento"
    if (btnFinish) btnFinish.style.display = 'flex';
  } else {
    // Módulo do meio concluído — mostra "Próximo Módulo"
    if (btnNext) btnNext.style.display = 'flex';
  }
}

function nextModule() {
  if (!_timerRunning) {
    showToast('▶ Inicie o timer para navegar entre módulos.', 'warning');
    return;
  }
  if (!_currentModuleDone) {
    showToast('Conclua este módulo antes de avançar.', 'warning');
    return;
  }
  _alertedOvertime = false;
  _currentModuleDone = false;
  recordModuleTiming();
  if (window.TrainingSession.nextModule()) {
    _currentModuleStartTime = Date.now();
    loadCurrentModule(); updateProgress();
    updateNextButton();
    showToast('Próximo módulo!', 'success');
  }
}
function prevModule() {
  if (!_timerRunning) {
    showToast('▶ Inicie o timer para navegar entre módulos.', 'warning');
    return;
  }
  _alertedOvertime = false;
  recordModuleTiming();
  if (window.TrainingSession.prevModule()) {
    _currentModuleStartTime = Date.now();
    loadCurrentModule(); updateProgress();
  }
}
function goToModule(index) {
  _alertedOvertime = false;
  if (window.TrainingSession.goToModule(index)) { loadCurrentModule(); updateProgress(); }
}

function updateProgress() {
  const state = window.TrainingSession.getTimerState();
  const pct   = state.totalModules > 0 ? Math.round((state.completedModules.length / state.totalModules) * 100) : 0;
  document.getElementById('progressLabel').textContent   = state.completedModules.length + ' / ' + state.totalModules + ' módulos';
  document.getElementById('progressPercent').textContent = pct + '%';
  document.getElementById('progressFill').style.width    = pct + '%';
}

// ── Registro de tempo por módulo ────────────────────────────
function recordModuleTiming() {
  const mod = window.TrainingSession.getCurrentModule();
  if (!mod || !_currentModuleStartTime) return;
  const elapsed = Math.round((Date.now() - _currentModuleStartTime) / 1000);
  _moduleTimings[mod.id] = (_moduleTimings[mod.id] || 0) + elapsed;
}

// ── Concluir ────────────────────────────────────────────────
function finishTraining() {
  recordModuleTiming();
  const finalState = window.TrainingSession.completeTraining();
  _timerRunning = false;
  _awaitingConclusion = true; // mantém flag para não mostrar overlay
  updatePlayPauseBtn();
  _awaitingConclusion = false; // reseta após updatePlayPauseBtn
  // Garante que overlay de pausa não aparece na conclusão
  const _po = document.getElementById('pauseBlockOverlay');
  if (_po) _po.style.display = 'none';
  document.getElementById('statFinalTime').textContent    = finalState.totalFormatted;
  document.getElementById('statModulesCount').textContent = String(finalState.totalModules);
  document.getElementById('completionModal').classList.add('visible');

  // Salva sessão no Firestore para auditoria
  try {
    const moduleDetails = (_training.modules||[]).map(m => ({
      moduleId:    m.id,
      title:       m.title,
      duration:    m.duration || 0,
      tempoGasto:  _moduleTimings[m.id] || 0,
    }));

    saveSession({
      userId:        _user.uid,
      userEmail:     _user.email,
      userName:      _instructor?.nome || _user.email,
      companyId:     _instructor?.empresaId || '',
      companyName:   _company?.name || '',
      trainingId:    _training.id,
      trainingTitle: _training.title,
      startedAt:     _sessionStartedAt || new Date().toISOString(),
      completedAt:   new Date().toISOString(),
      totalSeconds:  finalState.totalElapsed,
      totalModules:  finalState.totalModules,
      concluido:     true,
      modulos:       moduleDetails,
    }).catch(e => console.warn('Erro ao salvar sessão:', e));
  } catch(e) { console.warn('Erro sessão:', e); }
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
    case 'ArrowRight': case 'PageDown':
      if (!_timerRunning) { showToast('▶ Inicie o timer para navegar entre módulos.', 'warning'); return; }
      nextModule(); break;
    case 'ArrowLeft':  case 'PageUp':
      if (!_timerRunning) { showToast('▶ Inicie o timer para navegar entre módulos.', 'warning'); return; }
      prevModule(); break;
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
  showLockedToast,
  toggleTimer, resetModuleTimer, resetAllTimers,
  nextModule, prevModule, goToModule,
  concludeCurrentModule, updateNextButton,
  finishTraining, closeCompletion,
  toggleFullscreen, openGithubUrl, toggleFocusMode,
});
