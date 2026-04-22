/* ============================================================
   TrainHub — Configurações Globais
   Edite este arquivo para personalizar a plataforma
   ============================================================ */

const CONFIG = {
  APP_NAME: 'TrainHub',
  APP_VERSION: '1.0.0',

  // ─── Google OAuth ───────────────────────────────────────────
  // Obtenha em: https://console.cloud.google.com/
  GOOGLE_CLIENT_ID: 'SEU_GOOGLE_CLIENT_ID_AQUI.apps.googleusercontent.com',

  // ─── Sessão ─────────────────────────────────────────────────
  SESSION_KEY: 'trainhub_session',
  SESSION_DURATION: 8 * 60 * 60 * 1000, // 8 horas em ms

  // ─── URLs ────────────────────────────────────────────────────
  // Domínios reservados para acesso de admin
  ADMIN_DOMAINS: ['trainhub.com.br'],

  // ─── Timer ───────────────────────────────────────────────────
  TIMER_TICK_MS: 1000,
  SHOW_TIMER_ALERT_AT: 5 * 60, // alerta quando restar 5 min (segundos)
};
