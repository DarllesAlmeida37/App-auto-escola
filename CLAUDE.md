# CLAUDE.md — App Auto Escola (CFC Forquilha)

Documentação permanente do projeto para sessões do Claude Code.
Antes de qualquer alteração, leia este arquivo e os arquivos relacionados à mudança.

---

## 1. Visão geral

Sistema web completo para uma autoescola (CFC Forquilha): cadastro de alunos e instrutores, agendamento de aulas práticas (carro/moto) com regras rígidas de horário e conflito, envio de resumo das aulas pelo WhatsApp, tema claro/escuro e área de Segurança protegida por senha-mestra.

- **Frontend**: React 19 (SPA) — pasta `frontend/`
- **Backend**: Node.js + Express 5 — pasta `backend/`
- **Banco**: PostgreSQL 17 (local) / Neon (produção), acessado via **Prisma 7**
- **Deploy**: Render (app) + Neon (banco), configurado no `render.yaml`

O sistema está em produção. Alterações commitadas na branch `main` são implantadas automaticamente pelo Render (~4 min).

## 2. Objetivo do sistema

Gerenciar a rotina de uma autoescola: cadastrar alunos/instrutores, montar a agenda diária de aulas práticas de cada instrutor (tabelas de horários com ocupação em verde claro), impedir conflitos de agenda e comunicar as aulas ao aluno via WhatsApp.

## 3. Tecnologias utilizadas

| Camada | Tecnologia | Versão |
|---|---|---|
| Frontend | React / React DOM | ^19.2.8 |
| Frontend | Vite | ^8.2.2 |
| Frontend | React Router DOM | ^7.18.3 |
| Frontend | ESLint (+ react-hooks, react-refresh) | ^10.9.0 |
| Backend | Express (CommonJS) | ^5.2.1 |
| Backend | Prisma + @prisma/adapter-pg | ^7.10.0 |
| Backend | bcrypt (hash de senhas, custo 12) | ^6.0.0 |
| Backend | helmet (headers de segurança) | ^8.3.0 |
| Backend | dotenv / pg / nodemon | ^17.4.2 / ^8.23.0 / ^3.1.14 |
| Banco | PostgreSQL 17 | local `autoescola` / Neon (prod) |

Sem bibliotecas de UI (tudo com CSS próprio: variáveis de tema + classes globais + CSS Modules).

## 4. Estrutura de pastas

```
├── render.yaml                  # Deploy do Render (build + migrate + start)
├── backend/
│   ├── .env                     # DATABASE_URL — NUNCA versionar (no .gitignore)
│   ├── prisma7.config.ts        # Config do Prisma 7 (datasource via env)
│   ├── prismaClient.js          # Client Prisma (adapter-pg + dotenv)
│   ├── prisma/
│   │   ├── schema.prisma        # Modelos: Aluno, Instrutor, Agendamento,
│   │   │                        #   SenhaAcesso, AdminGeral, Sessao
│   │   └── migrations/          # 5 migrations aplicadas
│   ├── server.js                # Express: helmet, rotas /api, estático prod
│   ├── config/horarios.js       # Fonte única dos horários de aula
│   ├── middleware/auth.js       # Sessões, requireAuth, rate-limit de login
│   ├── utils/sessao.js          # Token, hash sha256, parser de cookies
│   └── routes/
│       ├── auth.js              # status, fechar, setup, login, verificar,
│       │                        #   logout, me
│       ├── alunos.js            # CRUD de alunos
│       ├── instrutores.js       # CRUD de instrutores
│       ├── agendamentos.js      # CRUD + filtros + horários do dia
│       └── configuracoes.js     # cadastrar/excluir senha de acesso
└── frontend/
    ├── vite.config.js           # Proxy dev: /api → http://localhost:3000
    ├── index.html               # lang pt-BR, título da autoescola
    └── src/
        ├── main.jsx             # BrowserRouter + TemaProvider + AuthProvider
        ├── App.jsx              # Rotas + layout (Sidebar + Header + main)
        ├── App.css              # Estilos globais e classes compartilhadas
        ├── index.css            # Variáveis de tema (dia/noite) e reset
        ├── services/api.js      # ÚNICO ponto de chamada à API (fetch)
        ├── context/
        │   ├── AuthContext.jsx  # Login/logout, marcador de aba, fechar aba
        │   └── TemaContext.jsx  # Tema dia/noite (localStorage + data-tema)
        ├── components/
        │   ├── ProtectedRoute.jsx     # Redireciona para /login sem sessão
        │   ├── TabelaHorarios.jsx     # Grade de horários (verde/azul/livre)
        │   ├── ConfirmacaoModal.jsx   # Confirmação de exclusões
        │   ├── Icones.jsx             # SVGs inline (carro, moto, lixeira…)
        │   ├── header/                # Logo + usuário + botão Sair
        │   └── sidebar/               # Menu fixo (ícones + rótulos)
        ├── pages/                # Dashboard, Alunos, Instrutores,
        │                         #   Agendamentos, Configuracoes, Login, Setup
        └── utils/                # datas.js, numeros.js
```

## 5. Arquitetura do frontend

- **SPA com React Router**: `App.jsx` define `/login`, `/setup` (públicas) e, sob `ProtectedRoute`, `/` (Início), `/alunos`, `/instrutores`, `/agendamentos`, `/configuracoes`. Rota desconhecida cai no `/`.
- **Layout**: `Sidebar` (fixa com `position: sticky`) + `Header` (logo à esquerda, "Sair" à direita) + `<main>`.
- **Comunicação com a API**: somente via `src/services/api.js` — wrapper `api()` com `fetch`, `credentials: "include"`, JSON automático e erros padronizados (`erro.message` vindo do campo `mensagem` do backend). Nunca usar `fetch` fora deste arquivo.
- **Autenticação**: `AuthContext` consulta `/api/auth/status` na inicialização; `ProtectedRoute` redireciona conforme `autenticado`/`precisaSetup`.
- **Tema**: `TemaContext` grava `autoescola:tema` no localStorage e seta `data-tema="dia|noite"` no `<html>`; as cores vêm das variáveis CSS de `index.css` (`--cor-fundo`, `--cor-primaria`, `--cor-ocupado`…).
- **Responsividade**: sidebar vira barra de ícones com tooltip em telas < 768px; tabelas rolam horizontalmente; campos quebram com `flex-wrap`.
- **Padrão de tela**: estado local com `useState`; carregamento inicial em `useEffect` com função assíncrona interna e flag `ativo` (regra de lint `set-state-in-effect`); mensagens somem em **3 s**.

## 6. Arquitetura do backend

- **Express 5 (CommonJS)** em `backend/server.js`: `helmet()`, `express.json({ limit: "100kb" })`, rotas montadas sob `/api/*`, `express.static(frontend/dist)` + fallback SPA em produção, 404 JSON para API e handler global de erros. Porta: `process.env.PORT || 3000`.
- **Sessões** (`middleware/auth.js` + `utils/sessao.js`):
  - Cookie `sid` **httpOnly + SameSite=Strict, sem Max-Age** (cookie de sessão: some quando o navegador fecha). Flag `Secure` em produção.
  - No banco (`Sessao`) fica apenas o **sha256** do token; validade de 12 h com renovação deslizante.
  - **Fechar a aba**: o frontend envia `sendBeacon("/api/auth/fechar")` no `pagehide`; a sessão entra em `fechando=true` com carência de **5 min** (`GRACE_FECHANDO_MS`). Se nenhuma página viva fizer requisição na carência, a sessão expira. Qualquer chamada autenticada restaura (`fechando=false` + 12 h) — é isso que faz o F5 não deslogar.
  - `requireAuth` protege todas as rotas, exceto `status`, `setup` e `login`.
- **Login**: o usuário é sempre "Admin"; qualquer senha da tabela `SenhaAcesso` dá acesso (bcrypt). Rate-limit de 5 tentativas/min por IP (em memória).
- **Primeiro acesso**: se `AdminGeral` estiver vazia, o frontend mostra `/setup` (cria a senha-mestra + a primeira senha de acesso, uma única vez).
- **Prisma 7**: client em `backend/prismaClient.js` com driver adapter (`@prisma/adapter-pg`); `DATABASE_URL` vem do `backend/.env` (local) ou da env do Render (produção). Sempre usar o Prisma para consultas (sem SQL bruto).

## 7. Banco de dados (PostgreSQL) e modelos Prisma

Schema em `backend/prisma/schema.prisma` (enum `TipoVeiculo`: CARRO | MOTO):

| Modelo | Campos principais | Observações |
|---|---|---|
| `Aluno` | nome, cpf (**unique**), telefone | nomes salvos em CAIXA ALTA |
| `Instrutor` | nome, cpf (**unique**) | idem |
| `Agendamento` | data (@db.Date), horario ("HH:MM"), veiculo, alunoId, instrutorId | `@@unique([alunoId, data, horario])` e `@@unique([instrutorId, data, horario])` garantem ausência de conflito; FKs com `onDelete: Cascade` |
| `SenhaAcesso` | senhaHash | senhas de login (várias permitidas) |
| `AdminGeral` | senhaHash | senha-mestra (1 registro) — só ela autoriza criar/excluir senhas |
| `Sessao` | tokenHash (unique), expiraEm, fechando | sessões de login |

**Migrations**: `backend/prisma/migrations/` (5 aplicadas). Mudanças de schema exigem: editar `schema.prisma` → criar migration SQL manual → `npx prisma migrate deploy` → `npx prisma generate`. Em produção o `render.yaml` roda `migrate deploy` no build. **Nunca usar `migrate dev`/reset sem avisar** — pode apagar dados.

## 8. Rotas da API (todas sob `/api`, JSON com campo `mensagem`)

**Auth** (`routes/auth.js` — públicas: status, setup, login)
- `GET /auth/status` → `{ precisaSetup, autenticado, fechando }`
- `POST /auth/setup` → cria senha-mestra (só se AdminGeral vazia)
- `POST /auth/login` → `{ senha }`; seta cookie `sid`
- `POST /auth/verificar` (auth) → valida senha de acesso (desbloqueia Segurança)
- `POST /auth/fechar` (auth) → marca sessão como "fechando" (aba fechada)
- `POST /auth/logout` (auth) → revoga a sessão
- `GET /auth/me` (auth) → `{ autenticado: true }`

**Alunos** (`routes/alunos.js` — tudo autenticado)
- `GET /` lista · `POST /` cadastra (CPF 11 dígitos único, nome em maiúsculas) · `DELETE /:id` exclui (cascade nos agendamentos)

**Instrutores** (`routes/instrutores.js` — tudo autenticado)
- `GET /` · `POST /` (CPF único) · `DELETE /:id`

**Agendamentos** (`routes/agendamentos.js` — tudo autenticado)
- `GET /` com filtros opcionais: `data`, `de`+`ate` (intervalo), `instrutorId`, `alunoId`; inclui `aluno` e `instrutor`
- `POST /` → `{ alunoId, instrutorId, data, horarios[], veiculo }` — valida tudo e grava em transação (1 linha por horário)
- `DELETE /:id` → cancela aula
- `GET /horarios?data=` → horários válidos do dia (grade oficial)

**Configurações** (`routes/configuracoes.js` — tudo autenticado)
- `POST /senhas` → `{ novaSenha, senhaAdmin }` cadastra senha de acesso
- `POST /senhas/excluir` → `{ senhaExcluir, senhaAdmin }` exclui senha (nunca a última)

## 9. Principais regras de negócio

- **Horários** (fonte única: `backend/config/horarios.js` — o frontend NUNCA duplica):
  - Seg–Sex: 12 aulas de 50 min (07:00–12:00 e 13:00–18:00, com intervalos de 10 min)
  - Sábado: 4 aulas (07:00–10:20) · **Domingo: fechado**
- **Agendamento**: máx. **5 horários** por vez (seguidos ou espalhados); aluno e instrutor não podem ter aula no mesmo horário (checagem em transação + constraints únicas como segunda trava; erro de corrida → 409).
- **CPF**: 11 dígitos, único por aluno e por instrutor; campos do frontend só aceitam números (`utils/numeros.js`).
- **Nomes** de alunos e instrutores são salvos em CAIXA ALTA (backend normaliza).
- **Exclusão**: excluir aluno/instrutor remove os agendamentos (CASCADE); toda exclusão pede confirmação (modal).
- **Senhas**: bcrypt custo 12; a última senha de acesso não pode ser excluída; cadastrar/excluir senha exige a senha do Administrador Geral e confirmação no modal.
- **WhatsApp**: botão na lista de alunos abre `wa.me` com resumo das aulas (sem anexo — PDF foi removido do projeto).
- **Sessão**: fechar a aba desloga (carência de 5 min); **F5 mantém o login**; botão Sair revoga na hora.

## 10. Comandos

```bash
# Instalar dependências (uma vez em cada pasta)
cd backend && npm install
cd frontend && npm install

# Backend (porta 3000)
cd backend && npm run dev     # nodemon
cd backend && npm start       # node server.js

# Frontend (porta 5173; proxy /api → 3000 em dev)
cd frontend && npm run dev
cd frontend && npm run build  # gera frontend/dist (servido pelo Express em prod)
cd frontend && npm run lint

# Prisma (sempre dentro de backend/)
cd backend && npx prisma migrate deploy   # aplica migrations pendentes
cd backend && npx prisma generate         # regenera o client após mudar schema
```

Produção (Render): build = instalar deps (`--include=dev`), `vite build`, `prisma generate` e `prisma migrate deploy`; start = `node backend/server.js`. Tudo em `render.yaml`.

## 11. Convenções de código

- **Idioma**: UI, mensagens e comentários em **português (pt-BR)**; código em inglês para palavras reservadas.
- **Backend**: CommonJS (`require`/`module.exports`); respostas sempre JSON `{ mensagem, ... }`; status HTTP coerentes (400 validação, 401 sem sessão, 403 sem permissão, 404 não encontrado, 409 conflito, 429 limite, 500 erro).
- **Frontend**: ESM; componentes como funções nomeadas com `export default`; estado com `useState`; ícones via `Icones.jsx` (SVG com `currentColor` — nunca biblioteca de ícones).
- **CSS**: variáveis de tema em `index.css` (`--cor-*`) — novas cores devem ser variáveis; classes globais em `App.css`; CSS Modules só em `header/` e `sidebar/`.
- **Mensagens ao usuário**: somem após **3 s** (padrão `mostrar()` com `setTimeout`).
- **Segurança**: nenhum segredo no código ou no git (`.env` é ignorado); SQL sempre via Prisma parametrizado; validação no servidor SEMPRE (não confiar no frontend).

## 12. Funcionalidades já implementadas

- Login com senhas de acesso (Admin), sessões seguras (cookie httpOnly + token hasheado), deslogar ao fechar aba, manter sessão no F5
- Configuração inicial da senha-mestra (primeiro acesso)
- Área de Segurança: desbloqueio com senha de acesso, cadastrar e excluir senhas (com Admin Geral + confirmação)
- CRUD de alunos e instrutores (CPF único, maiúsculas, exclusão com confirmação)
- Agendamentos: grade de horários por instrutor (verde claro = ocupado), máx. 5 horários, conflitos bloqueados, cancelamento com lixeira flutuante
- Filtros: por instrutor, dia, semana e mês
- Início (dashboard): aulas de hoje por instrutor
- WhatsApp com resumo das aulas; tema dia/noite; site responsivo (mobile com sidebar de ícones + tooltip)
- Deploy automático no Render com banco Neon

## 13. Observações para desenvolvimento futuro

- **Não há testes automatizados** (nem backend, nem frontend).
- `README.md` da raiz está desatualizado (1 linha) — este CLAUDE.md é a referência.
- `backend/package.json` tem `"main": "index.js"` (inconsistência herdada; o entry real é `server.js`).
- O PDF de aulas foi **removido** a pedido do usuário (o WhatsApp envia só o texto do resumo). Não reintroduzir sem autorização.
- `frontend/public/icons.svg` foi removido; a logo é `frontend/public/logo.png` (usar sempre `/logo.png`).

## 14. Orientações para futuras alterações do Claude

- Antes de modificar código, analise os arquivos relacionados (rotas → serviços → páginas → CSS).
- Preserve a arquitetura e o padrão já existente (services/api.js como único ponto de fetch; rotas com `requireAuth`; mensagens JSON `{ mensagem }`).
- Não remova funcionalidades existentes sem autorização explícita do usuário.
- Não altere banco de dados ou schema Prisma sem explicar previamente o impacto (dados, migrations, produção). Mudanças de schema exigem migration SQL manual + `migrate deploy` + `prisma generate`.
- Não instale novas dependências sem necessidade; se precisar, avise antes, diga por quê e onde será usada.
- Não exponha senhas, `DATABASE_URL`, chaves ou dados sensíveis (nunca em arquivos, commits, mensagens ou CLAUDE.md).
- Ao corrigir bugs, encontre primeiro a causa raiz antes de alterar o código (investigue logs, fluxo de dados, comportamento do navegador).
- Faça alterações pequenas e objetivas; depois, verifique se afetam outras partes do sistema (outras páginas usam as mesmas classes/rotas).
- Após cada alteração, rode `npm run lint` e `npm run build` no frontend e `node --check` nos arquivos do backend; teste o fluxo afetado.
- Explique resumidamente (em pt-BR) o que foi alterado e o resultado dos testes.
- Commits: só quando o usuário pedir (ou aprovar); mensagens em português, com `Co-Authored-By: Claude Code <noreply@anthropic.com>` ao final.
- O usuário testa o sistema em produção (Render) — mudanças commitadas na `main` entram no ar automaticamente; avise que o deploy leva ~4 min.
