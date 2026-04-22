/* ============================================================
   TrainHub — Módulo de Treinamento (Timer + Apresentação)
   ============================================================ */

const TrainingSession = (() => {
  // ─── Estado ───────────────────────────────────────────────────
  let _state = {
    training: null,
    currentModuleIndex: 0,
    totalElapsed: 0,      // segundos (total da sessão)
    moduleElapsed: 0,     // segundos (módulo atual)
    timerInterval: null,
    running: false,
    startedAt: null,
    moduleStartedAt: null,
    completedModules: new Set(),
    sessionKey: null,
  };

  // ─── Persistência ─────────────────────────────────────────────

  function _saveProgress() {
    if (!_state.sessionKey) return;
    const data = {
      trainingId: _state.training.id,
      currentModuleIndex: _state.currentModuleIndex,
      totalElapsed: _state.totalElapsed,
      moduleElapsed: _state.moduleElapsed,
      completedModules: [..._state.completedModules],
      savedAt: Date.now(),
    };
    localStorage.setItem(_state.sessionKey, JSON.stringify(data));
  }

  function _loadProgress(trainingId, userId) {
    try {
      const key = `trainhub_progress_${userId}_${trainingId}`;
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function _clearProgress() {
    if (_state.sessionKey) {
      localStorage.removeItem(_state.sessionKey);
    }
  }

  // ─── Inicialização ────────────────────────────────────────────

  function init(training, userId, resumeFromSaved = true) {
    _state.training = training;
    _state.sessionKey = `trainhub_progress_${userId}_${training.id}`;

    // Tenta retomar sessão salva
    if (resumeFromSaved) {
      const saved = _loadProgress(training.id, userId);
      if (saved && Date.now() - saved.savedAt < 24 * 60 * 60 * 1000) {
        _state.currentModuleIndex = saved.currentModuleIndex || 0;
        _state.totalElapsed = saved.totalElapsed || 0;
        _state.moduleElapsed = saved.moduleElapsed || 0;
        _state.completedModules = new Set(saved.completedModules || []);
      }
    }

    _state.running = false;
    _state.timerInterval = null;
  }

  // ─── Timer ────────────────────────────────────────────────────

  function startTimer(onTick) {
    if (_state.running) return;
    _state.running = true;
    _state.startedAt = Date.now();
    _state.moduleStartedAt = Date.now();

    _state.timerInterval = setInterval(() => {
      if (!_state.running) return;
      _state.totalElapsed++;
      _state.moduleElapsed++;
      _saveProgress();
      if (typeof onTick === 'function') onTick(getTimerState());
    }, 1000);
  }

  function pauseTimer() {
    _state.running = false;
    if (_state.timerInterval) {
      clearInterval(_state.timerInterval);
      _state.timerInterval = null;
    }
    _saveProgress();
  }

  function resumeTimer(onTick) {
    if (_state.running) return;
    startTimer(onTick);
  }

  function resetModuleTimer() {
    _state.moduleElapsed = 0;
    _saveProgress();
  }

  function resetAllTimers() {
    pauseTimer();
    _state.totalElapsed = 0;
    _state.moduleElapsed = 0;
    _state.completedModules.clear();
    _state.currentModuleIndex = 0;
    _clearProgress();
  }

  // ─── Navegação de Módulos ─────────────────────────────────────

  function getCurrentModule() {
    return _state.training?.modules[_state.currentModuleIndex] || null;
  }

  function nextModule() {
    const modules = _state.training?.modules || [];
    if (_state.currentModuleIndex < modules.length - 1) {
      _markCurrentModuleComplete();
      _state.currentModuleIndex++;
      _state.moduleElapsed = 0;
      _saveProgress();
      return true;
    }
    return false;
  }

  function prevModule() {
    if (_state.currentModuleIndex > 0) {
      _state.currentModuleIndex--;
      _state.moduleElapsed = 0;
      _saveProgress();
      return true;
    }
    return false;
  }

  function goToModule(index) {
    const modules = _state.training?.modules || [];
    if (index >= 0 && index < modules.length) {
      _markCurrentModuleComplete();
      _state.currentModuleIndex = index;
      _state.moduleElapsed = 0;
      _saveProgress();
      return true;
    }
    return false;
  }

  function _markCurrentModuleComplete() {
    const mod = getCurrentModule();
    if (mod) _state.completedModules.add(mod.id);
  }

  function completeTraining() {
    _markCurrentModuleComplete();
    pauseTimer();
    _saveProgress();
    return getTimerState();
  }

  // ─── Estado do Timer ──────────────────────────────────────────

  function getTimerState() {
    const currentModule = getCurrentModule();
    const modules = _state.training?.modules || [];
    const moduleTarget = (currentModule?.duration || 0) * 60; // segundos
    const totalTarget = (_state.training?.totalDuration || 0) * 60;

    return {
      // Timer total
      totalElapsed: _state.totalElapsed,
      totalTarget,
      totalFormatted: formatSeconds(_state.totalElapsed),
      totalTargetFormatted: formatSeconds(totalTarget),
      totalPercent: totalTarget > 0 ? Math.min(((_state.totalElapsed / totalTarget) * 100), 100) : 0,

      // Timer do módulo
      moduleElapsed: _state.moduleElapsed,
      moduleTarget,
      moduleFormatted: formatSeconds(_state.moduleElapsed),
      moduleTargetFormatted: formatSeconds(moduleTarget),
      modulePercent: moduleTarget > 0 ? Math.min(((_state.moduleElapsed / moduleTarget) * 100), 100) : 0,
      moduleOverTime: _state.moduleElapsed > moduleTarget && moduleTarget > 0,

      // Navegação
      currentModuleIndex: _state.currentModuleIndex,
      totalModules: modules.length,
      completedModules: [..._state.completedModules],
      isFirstModule: _state.currentModuleIndex === 0,
      isLastModule: _state.currentModuleIndex === modules.length - 1,
      isRunning: _state.running,

      // Alertas
      moduleAlert: moduleTarget > 0 &&
        (moduleTarget - _state.moduleElapsed) <= 300 &&
        _state.moduleElapsed < moduleTarget,
    };
  }

  // ─── Formatação ───────────────────────────────────────────────

  function formatSeconds(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) {
      return `${pad(h)}:${pad(m)}:${pad(s)}`;
    }
    return `${pad(m)}:${pad(s)}`;
  }

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  // ─── API Pública ──────────────────────────────────────────────
  return {
    init,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetModuleTimer,
    resetAllTimers,
    nextModule,
    prevModule,
    goToModule,
    getCurrentModule,
    completeTraining,
    getTimerState,
    formatSeconds,
    getState: () => ({ ..._state }),
  };
})();

// Expõe globalmente para compatibilidade com módulos ES
window.TrainingSession = TrainingSession;