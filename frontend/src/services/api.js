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
    erro.dados = dados;
    throw erro;
  }

  return dados;
}

export const apiAuth = {
  status: () => api("/auth/status"),
  setup: (senha) => api("/auth/setup", { method: "POST", body: { senha } }),
  login: (senha) => api("/auth/login", { method: "POST", body: { senha } }),
  logout: () => api("/auth/logout", { method: "POST" }),
  verificar: (senha) => api("/auth/verificar", { method: "POST", body: { senha } }),
};

export const apiAlunos = {
  listar: () => api("/alunos"),
  cadastrar: (dados) => api("/alunos", { method: "POST", body: dados }),
  excluir: (id) => api(`/alunos/${id}`, { method: "DELETE" }),
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
  excluirLote: (ids) =>
    api("/agendamentos/excluir-lote", { method: "POST", body: { ids } }),
  agendarLote: (dados) =>
    api("/agendamentos/lote", { method: "POST", body: dados }),
  cancelarLote: (id) =>
    api(`/agendamentos/lote/${id}`, { method: "DELETE" }),
};

export const apiConfiguracoes = {
  cadastrarSenha: (dados) =>
    api("/configuracoes/senhas", { method: "POST", body: dados }),
  excluirSenha: (dados) =>
    api("/configuracoes/senhas/excluir", { method: "POST", body: dados }),
  verificarAdmin: (senhaAdmin) =>
    api("/configuracoes/verificar-admin", {
      method: "POST",
      body: { senhaAdmin },
    }),
};

export const apiVeiculos = {
  listar: () => api("/veiculos"),
  cadastrar: (dados) => api("/veiculos", { method: "POST", body: dados }),
  excluir: (id) => api(`/veiculos/${id}`, { method: "DELETE" }),
  despesas: (id, filtros = {}) => {
    const busca = new URLSearchParams(
      Object.entries(filtros).filter(([, valor]) => valor),
    ).toString();

    return api(`/veiculos/${id}/despesas${busca ? `?${busca}` : ""}`);
  },
  registrarDespesa: (id, dados) =>
    api(`/veiculos/${id}/despesas`, { method: "POST", body: dados }),
  excluirDespesa: (id) =>
    api(`/veiculos/despesas/${id}`, { method: "DELETE" }),
};

export const apiFinanceiro = {
  resumo: (mes, ano) => api(`/financeiro/resumo?mes=${mes}&ano=${ano}`),
  lancamentos: (de, ate, tipo = "") => {
    const busca = new URLSearchParams();

    if (de) {
      busca.set("de", de);
    }

    if (ate) {
      busca.set("ate", ate);
    }

    if (tipo) {
      busca.set("tipo", tipo);
    }

    const consulta = busca.toString();

    return api(`/financeiro/lancamentos${consulta ? `?${consulta}` : ""}`);
  },
  criarLancamento: (dados) =>
    api("/financeiro/lancamentos", { method: "POST", body: dados }),
  excluirLancamento: (id) =>
    api(`/financeiro/lancamentos/${id}`, { method: "DELETE" }),
};
