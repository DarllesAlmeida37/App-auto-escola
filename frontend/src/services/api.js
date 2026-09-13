const BASE = "/api";

// Wrapper único das chamadas HTTP.
// O cookie de sessão (httpOnly) viaja junto automaticamente.
async function api(caminho, { method = "GET", body } = {}) {
  const resposta = await fetch(`${BASE}${caminho}`, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  const dados = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    const erro = new Error(dados?.mensagem || "Erro inesperado.");
    erro.status = resposta.status;
    throw erro;
  }

  return dados;
}

export const apiAuth = {
  status: () => api("/auth/status"),
  setup: (senha) => api("/auth/setup", { method: "POST", body: { senha } }),
  login: (senha) => api("/auth/login", { method: "POST", body: { senha } }),
  logout: () => api("/auth/logout", { method: "POST" }),
};

export const apiAlunos = {
  listar: () => api("/alunos"),
  cadastrar: (dados) => api("/alunos", { method: "POST", body: dados }),
  excluir: (id) => api(`/alunos/${id}`, { method: "DELETE" }),
  urlPdf: (id) => `${BASE}/alunos/${id}/aulas/pdf`,
};

export const apiInstrutores = {
  listar: () => api("/instrutores"),
  cadastrar: (dados) => api("/instrutores", { method: "POST", body: dados }),
  excluir: (id) => api(`/instrutores/${id}`, { method: "DELETE" }),
};

export const apiAgendamentos = {
  listar: (filtros = {}) => {
    const busca = new URLSearchParams(
      Object.entries(filtros).filter(([, valor]) => valor),
    ).toString();

    return api(`/agendamentos${busca ? `?${busca}` : ""}`);
  },
  horarios: (data) => api(`/agendamentos/horarios?data=${data}`),
  agendar: (dados) => api("/agendamentos", { method: "POST", body: dados }),
  cancelar: (id) => api(`/agendamentos/${id}`, { method: "DELETE" }),
};

export const apiConfiguracoes = {
  cadastrarSenha: (dados) =>
    api("/configuracoes/senhas", { method: "POST", body: dados }),
};
