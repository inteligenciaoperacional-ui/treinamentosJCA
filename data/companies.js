/* ============================================================
   TrainHub — Dados de Empresas e Treinamentos
   ⚠️  Não edite este arquivo manualmente.
   Use o Painel Admin (admin.html) para gerenciar os dados.
   ============================================================ */

// Lê do Painel Admin (localStorage) se disponível — prioridade máxima
const _adminData = (() => {
  try {
    const r = localStorage.getItem('trainhub_admin_data');
    return r ? JSON.parse(r) : null;
  } catch { return null; }
})();

// Fallback: dados de exemplo (usados apenas se o admin ainda não foi configurado)
const _defaultCompanies = [
  {
    id: 'transportes-alpha',
    name: 'Transportes Alpha',
    shortName: 'Alpha',
    emailDomains: ['transportes-alpha.com.br'],
    matriculaPrefix: 'ALF',
    color: '#FF6B00',
    active: true,
  },
];

const _defaultTrainings = [
  {
    id: 'alpha-direcao-defensiva',
    companyId: 'transportes-alpha',
    title: 'Direção Defensiva',
    description: 'Técnicas e princípios de direção defensiva para redução de acidentes.',
    category: 'Segurança',
    level: 'Básico',
    totalDuration: 120,
    active: true,
    modules: [
      {
        id: 'mod-01',
        title: 'Apresentação completa',
        duration: 120,
        githubUrl: 'https://docs.google.com/presentation/d/e/2PACX-1vQb7fdYCh_u3pWuGuGxoUdhbVcP8T6IDuxI5N5ph8G49da27yGhLSUbnoHvGM6mqg/pubembed?start=false&loop=false&delayms=3000',
        order: 1,
      },
    ],
  },
];

const COMPANIES = _adminData?.companies || _defaultCompanies;
const TRAININGS = _adminData?.trainings || _defaultTrainings;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCompanyByEmailDomain(email) {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return null;
  return COMPANIES.find(c => c.active && (c.emailDomains || []).includes(domain)) || null;
}

function getCompanyByMatricula(matricula) {
  const prefix = matricula.split('-')[0]?.toUpperCase();
  if (!prefix) return null;
  return COMPANIES.find(c => c.active && c.matriculaPrefix === prefix) || null;
}

function getTrainingsByCompany(companyId) {
  return TRAININGS.filter(t => t.companyId === companyId && t.active);
}

function getTrainingById(trainingId) {
  return TRAININGS.find(t => t.id === trainingId) || null;
}

function getCompanyById(companyId) {
  return COMPANIES.find(c => c.id === companyId) || null;
}

function formatDuration(minutes) {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}
