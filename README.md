# TrainHub — Plataforma de Treinamentos

Plataforma profissional para instrutores aplicarem treinamentos em sala de aula, com cronômetro por módulo, conteúdo integrado ao GitHub e controle por empresa.

---

## 📁 Estrutura de Arquivos

```
trainhub/
├── index.html          ← Tela inicial (seleção de empresa)
├── login.html          ← Login (Google OAuth ou Matrícula)
├── dashboard.html      ← Dashboard com treinamentos disponíveis
├── training.html       ← Apresentador com cronômetro e módulos
│
├── css/
│   └── main.css        ← Estilos globais
│
├── js/
│   ├── config.js       ← ⚙️ Configurações (Google Client ID, etc.)
│   ├── auth.js         ← Módulo de autenticação
│   └── training.js     ← Módulo do cronômetro/sessão
│
└── data/
    └── companies.js    ← ⚙️ Empresas e treinamentos (editar aqui!)
```

---

## 🚀 Configuração Rápida

### 1. Configurar empresas e treinamentos

Edite o arquivo **`data/companies.js`**:

```js
// Adicione sua empresa
{
  id: 'minha-empresa',
  name: 'Minha Empresa S.A.',
  shortName: 'Minha',
  emailDomains: ['minha-empresa.com.br'],  // domínios reconhecidos
  matriculaPrefix: 'MNH',                  // prefixo das matrículas
  color: '#FF6B00',                        // cor da empresa (hex)
  active: true,
}
```

### 2. Adicionar treinamentos

No mesmo arquivo `data/companies.js`, na constante `TRAININGS`:

```js
{
  id: 'minha-empresa-treinamento-01',
  companyId: 'minha-empresa',       // deve bater com o id da empresa
  title: 'Direção Defensiva',
  description: 'Descrição do treinamento.',
  category: 'Segurança',
  level: 'Básico',                  // Básico | Intermediário | Avançado
  totalDuration: 120,               // duração total em minutos
  active: true,
  modules: [
    {
      id: 'mod-01',
      title: 'Introdução',
      description: 'Descrição do módulo.',
      duration: 30,                 // duração em minutos
      githubUrl: 'https://meu-usuario.github.io/treinamento/', // URL do conteúdo
      order: 1,
    },
    // ... mais módulos
  ],
}
```

### 3. Configurar Google OAuth (opcional)

Para usar login com Google:

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um projeto e ative a API "Google Identity Services"
3. Em "Credenciais", crie um **ID do cliente OAuth 2.0** (tipo: Aplicativo da Web)
4. Adicione os domínios autorizados (onde o TrainHub ficará hospedado)
5. Copie o **Client ID** e cole em `js/config.js`:

```js
GOOGLE_CLIENT_ID: 'SEU_CLIENT_ID.apps.googleusercontent.com',
```

> **Sem Google OAuth**: Os instrutores podem fazer login com matrícula e senha normalmente.

---

## 📋 Formatos de URL aceitos para o conteúdo

O `githubUrl` de cada módulo aceita:

| Formato | Exemplo |
|---------|---------|
| GitHub Pages | `https://usuario.github.io/repositorio/` |
| GitHub Pages pasta | `https://usuario.github.io/repo/modulo-01/` |
| HTML Raw | `https://raw.githubusercontent.com/user/repo/main/slide.html` |
| Google Slides Embed | `https://docs.google.com/presentation/d/ID/embed` |
| Canva Embed | `https://www.canva.com/design/ID/view?embed` |
| Qualquer URL pública | Qualquer URL HTML que permita embed |

> 💡 **Recomendado**: Use **GitHub Pages** para hospedar os slides. Cada módulo pode ser um `index.html` em uma subpasta do repositório.

### Como criar conteúdo no GitHub

1. Crie um repositório no GitHub
2. Ative **GitHub Pages** (Settings → Pages → Source: main)
3. Cada módulo = uma pasta com um `index.html`
4. Use o link `https://usuario.github.io/repositorio/modulo-01/`

---

## ⌨️ Atalhos de Teclado (na tela de apresentação)

| Tecla | Ação |
|-------|------|
| `Espaço` | Play/Pause do cronômetro |
| `→` ou `Page Down` | Próximo módulo |
| `←` ou `Page Up` | Módulo anterior |
| `F` | Tela cheia |

---

## 🔐 Autenticação

### Por Google
- Instrutor loga com e-mail corporativo
- A plataforma identifica a empresa pelo domínio do e-mail
- Ex: `joao@transportes-alpha.com.br` → acessa os treinamentos da "Transportes Alpha"

### Por Matrícula
- Formato: `PREFIXO-NÚMERO` (ex: `ALF-0001`)
- O prefixo identifica a empresa
- Configure o `matriculaPrefix` em `data/companies.js`

---

## 🌐 Hospedagem

O TrainHub é 100% frontend (HTML/CSS/JS puro). Pode ser hospedado em:

- **GitHub Pages** (gratuito)
- **Netlify** (gratuito)
- **Vercel** (gratuito)
- Qualquer servidor web estático (Apache, Nginx, etc.)

> Para GitHub Pages: faça upload de todos os arquivos e ative Pages.

---

## 📝 Notas importantes

- **Sessões** são salvas no `localStorage` do navegador (8 horas por padrão)
- **Progresso** dos módulos é salvo automaticamente por treinamento/usuário
- **Cronômetro** continua mesmo ao trocar módulos (tempo total)
- O timer de módulo é **independente** do timer total

---

*TrainHub v1.0.0 — Desenvolvido para instrutores de frota*
