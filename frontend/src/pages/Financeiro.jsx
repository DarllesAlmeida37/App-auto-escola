import { useCallback, useEffect, useState } from "react";
import { apiFinanceiro, apiConfiguracoes, apiVeiculos } from "../services/api";
import ConfirmacaoModal from "../components/ConfirmacaoModal";
import { IconeCadeado, IconeLixeira, IconeDinheiro } from "../components/Icones";

const TIPOS_PERIODO = ["dia", "semana", "mes", "ano"];

function pad2(numero) {
  return String(numero).padStart(2, "0");
}

function paraISO(data) {
  return `${data.getFullYear()}-${pad2(data.getMonth() + 1)}-${pad2(data.getDate())}`;
}

function segundoDaSemana(data) {
  const dia = data.getDay();
  const deslocamento = dia === 0 ? -6 : 1 - dia;
  const segunda = new Date(data);

  segunda.setDate(data.getDate() + deslocamento);
  segunda.setHours(0, 0, 0, 0);

  const domingo = new Date(segunda);

  domingo.setDate(segunda.getDate() + 6);
  domingo.setHours(23, 59, 59, 999);

  return { de: segunda, ate: domingo };
}

function intervalo(tipo, referencia) {
  if (tipo === "dia") {
    return { de: referencia, ate: referencia };
  }

  if (tipo === "semana") {
    return segundoDaSemana(referencia);
  }

  if (tipo === "mes") {
    return {
      de: new Date(referencia.getFullYear(), referencia.getMonth(), 1),
      ate: new Date(referencia.getFullYear(), referencia.getMonth() + 1, 0, 23, 59, 59, 999),
    };
  }

  return {
    de: new Date(referencia.getFullYear(), 0, 1),
    ate: new Date(referencia.getFullYear(), 11, 31, 23, 59, 59, 999),
  };
}

function rotuloPeriodo(tipo, referencia) {
  if (tipo === "dia") {
    return referencia.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  if (tipo === "semana") {
    const { de, ate } = segundoDaSemana(referencia);

    return `${pad2(de.getDate())}/${pad2(de.getMonth() + 1)} – ${pad2(
      ate.getDate(),
    )}/${pad2(ate.getMonth() + 1)}/${ate.getFullYear()}`;
  }

  if (tipo === "mes") {
    const nome = referencia.toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });

    return nome.charAt(0).toUpperCase() + nome.slice(1);
  }

  return String(referencia.getFullYear());
}

function deslocarPeriodo(tipo, referencia, direcao) {
  const nova = new Date(referencia);

  if (tipo === "dia") {
    nova.setDate(nova.getDate() + direcao);
  } else if (tipo === "semana") {
    nova.setDate(nova.getDate() + direcao * 7);
  } else if (tipo === "mes") {
    nova.setMonth(nova.getMonth() + direcao);
  } else {
    nova.setFullYear(nova.getFullYear() + direcao);
  }

  return nova;
}

function formatarMoeda(valorNumero) {
  return Number(valorNumero).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// Painel financeiro: protegido pela senha do Administrador Geral.
// Funcionalidades: resumo por período (saldo, entradas, saídas e um
// medidor visual), registro de entradas/saídas e lançamentos com
// filtro de período e exclusão.
function Financeiro() {
  const [liberado, setLiberado] = useState(false);
  const [senhaAdmin, setSenhaAdmin] = useState("");
  const [verificando, setVerificando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState("erro");

  // Período selecionado (comum ao resumo e aos lançamentos)
  const [tipoPeriodo, setTipoPeriodo] = useState("mes");
  const [referencia, setReferencia] = useState(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return hoje;
  });

  // Lançamentos do período
  const [lancamentos, setLancamentos] = useState([]);
  const [visao, setVisao] = useState("ENTRADA");

  // Modal de novo lançamento
  const [modalAberto, setModalAberto] = useState(false);
  const [tipoModal, setTipoModal] = useState("ENTRADA");
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [dataLancamento, setDataLancamento] = useState("");
  const [salvando, setSalvando] = useState(false);

  // Exclusão
  const [confirmandoLancamento, setConfirmandoLancamento] = useState(null);

  function mostrar(mensagemTexto, tipo = "erro") {
    setMensagem(mensagemTexto);
    setTipoMensagem(tipo);

    setTimeout(() => {
      setMensagem("");
    }, 3000);
  }

  const carregarLancamentos = useCallback(async () => {
    const { de, ate } = intervalo(tipoPeriodo, referencia);

    try {
      const dados = await apiFinanceiro.lancamentos(
        paraISO(de),
        paraISO(ate),
      );

      setLancamentos(dados);
    } catch (erro) {
      mostrar(erro.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoPeriodo, referencia, liberado]);

  useEffect(() => {
    if (!liberado) {
      return;
    }

    let ativo = true;

    async function carregarInicial() {
      const { de, ate } = intervalo(tipoPeriodo, referencia);

      try {
        const dados = await apiFinanceiro.lancamentos(
          paraISO(de),
          paraISO(ate),
        );

        if (ativo) {
          setLancamentos(dados);
        }
      } catch (erro) {
        if (ativo) {
          mostrar(erro.message);
        }
      }
    }

    carregarInicial();

    return () => {
      ativo = false;
    };
  }, [liberado, tipoPeriodo, referencia]);

  async function handleLiberar(evento) {
    evento.preventDefault();

    if (senhaAdmin === "") {
      mostrar("Informe a senha do Administrador Geral.");
      return;
    }

    setVerificando(true);

    try {
      await apiConfiguracoes.verificarAdmin(senhaAdmin);

      setLiberado(true);
      setSenhaAdmin("");
      setMensagem("");
    } catch (erro) {
      mostrar(erro.message);
      setSenhaAdmin("");
    } finally {
      setVerificando(false);
    }
  }

  // -------------------------------------------------------------
  // Totais do período (entradas, saídas, saldo)
  // -------------------------------------------------------------

  const entradas = lancamentos
    .filter((lancamento) => lancamento.tipo === "ENTRADA")
    .reduce((soma, lancamento) => soma + Number(lancamento.valor), 0);

  const saidas = lancamentos
    .filter((lancamento) => lancamento.tipo === "SAIDA")
    .reduce((soma, lancamento) => soma + Number(lancamento.valor), 0);

  const saldo = entradas - saidas;
  const totalMovimentado = entradas + saidas;
  const percentualEntradas =
    totalMovimentado > 0 ? Math.round((entradas / totalMovimentado) * 100) : 0;
  const grausEntradas = (percentualEntradas / 100) * 180;

  const lancamentosVisiveis = lancamentos.filter(
    (lancamento) => lancamento.tipo === visao,
  );
  const totalVisao = lancamentosVisiveis.reduce(
    (soma, lancamento) => soma + Number(lancamento.valor),
    0,
  );

  // -------------------------------------------------------------
  // Novo lançamento
  // -------------------------------------------------------------

  function abrirModal(tipo) {
    setTipoModal(tipo);
    setValor("");
    setDescricao("");
    setDataLancamento(paraISO(new Date()));
    setModalAberto(true);
  }

  async function handleSalvarLancamento(evento) {
    evento.preventDefault();

    const valorNumero = Number(valor.replace(",", "."));

    if (!Number.isFinite(valorNumero) || valorNumero <= 0) {
      mostrar("Informe um valor válido.");
      return;
    }

    if (descricao.trim() === "") {
      mostrar("Informe a descrição do lançamento.");
      return;
    }

    if (dataLancamento === "") {
      mostrar("Informe a data do lançamento.");
      return;
    }

    setSalvando(true);

    try {
      const dados = await apiFinanceiro.criarLancamento({
        tipo: tipoModal,
        valor: valorNumero,
        descricao: descricao.trim(),
        data: dataLancamento,
      });

      mostrar(dados.mensagem, "sucesso");

      setModalAberto(false);
      setVisao(tipoModal);

      await carregarLancamentos();
    } catch (erro) {
      mostrar(erro.message);
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarExclusao() {
    if (!confirmandoLancamento) {
      return;
    }

    try {
      // Despesas de veículos são excluídas pela rota de despesas;
      // lançamentos manuais, pela rota de lançamentos.
      const dados =
        confirmandoLancamento.origem === "despesa"
          ? await apiVeiculos.excluirDespesa(confirmandoLancamento.id)
          : await apiFinanceiro.excluirLancamento(confirmandoLancamento.id);

      mostrar(dados.mensagem, "sucesso");

      await carregarLancamentos();
    } catch (erro) {
      mostrar(erro.message);
    } finally {
      setConfirmandoLancamento(null);
    }
  }

  // -------------------------------------------------------------

  if (!liberado) {
    return (
      <div>
        <h2>Financeiro</h2>

        <div className="cartao">
          <p className="texto-ajuda">
            Esta é uma área protegida. Digite a senha do{" "}
            <strong>Administrador Geral</strong> para abrir o painel
            financeiro.
          </p>

          <form onSubmit={handleLiberar}>
            <div className="linha-campos">
              <label className="campo campo-16ch">
                <span>Senha do Administrador Geral</span>
                <input
                  type="password"
                  value={senhaAdmin}
                  onChange={(evento) => setSenhaAdmin(evento.target.value)}
                />
              </label>
            </div>

            <button
              className="botao botao-primario"
              type="submit"
              disabled={verificando}
            >
              <IconeCadeado tamanho={16} />{" "}
              {verificando ? "Verificando…" : "Acessar financeiro"}
            </button>
          </form>

          {mensagem && <p className={`mensagem ${tipoMensagem}`}>{mensagem}</p>}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2>Financeiro</h2>

      {/* ---------------- Seletor de período ---------------- */}

      <div className="cartao periodo-bar">
        <div className="acoes-pagina" style={{ marginBottom: 8 }}>
          {TIPOS_PERIODO.map((tipo) => (
            <button
              type="button"
              key={tipo}
              className={`botao botao-pequeno ${
                tipoPeriodo === tipo ? "botao-ativo" : ""
              }`}
              onClick={() => setTipoPeriodo(tipo)}
            >
              {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
            </button>
          ))}
        </div>

        <div className="periodo-navegacao">
          <button
            type="button"
            className="botao-icone periodo-nav-botao"
            title="Período anterior"
            onClick={() =>
              setReferencia(deslocarPeriodo(tipoPeriodo, referencia, -1))
            }
          >
            ‹
          </button>

          <span className="periodo-rotulo">
            {rotuloPeriodo(tipoPeriodo, referencia)}
          </span>

          <button
            type="button"
            className="botao-icone periodo-nav-botao"
            title="Próximo período"
            onClick={() =>
              setReferencia(deslocarPeriodo(tipoPeriodo, referencia, 1))
            }
          >
            ›
          </button>

          {tipoPeriodo === "dia" && (
            <input
              type="date"
              value={paraISO(referencia)}
              onChange={(evento) => {
                if (evento.target.value) {
                  setReferencia(
                    new Date(`${evento.target.value}T00:00:00`),
                  );
                }
              }}
            />
          )}

          {tipoPeriodo === "mes" && (
            <input
              type="month"
              value={`${referencia.getFullYear()}-${pad2(
                referencia.getMonth() + 1,
              )}`}
              onChange={(evento) => {
                if (evento.target.value) {
                  const [ano, mes] = evento.target.value.split("-");

                  setReferencia(new Date(Number(ano), Number(mes) - 1, 1));
                }
              }}
            />
          )}

          {tipoPeriodo === "ano" && (
            <input
              type="number"
              min="2000"
              max="2100"
              value={referencia.getFullYear()}
              onChange={(evento) => {
                const ano = Number(evento.target.value);

                if (ano >= 2000 && ano <= 2100) {
                  setReferencia(new Date(ano, referencia.getMonth(), 1));
                }
              }}
            />
          )}

          <button
            type="button"
            className="botao"
            onClick={() => {
              const hoje = new Date();
              hoje.setHours(0, 0, 0, 0);
              setReferencia(hoje);
            }}
          >
            Hoje
          </button>
        </div>
      </div>

      {mensagem && <p className={`mensagem ${tipoMensagem}`}>{mensagem}</p>}

      {/* ---------------- Resumo do período ---------------- */}

      <div className="cartao resumo-financeiro">
        <div>
          <p className="texto-ajuda" style={{ marginBottom: 4 }}>
            Saldo no período
          </p>

          <p
            className={`saldo-valor ${saldo < 0 ? "negativo" : ""}`}
            style={{
              fontSize: "2rem",
              fontWeight: "bold",
              margin: "0 0 16px",
            }}
          >
            {formatarMoeda(saldo)}
          </p>

          <div className="mini-estatisticas">
            <span className="mini-estatistica">
              <span className="ponto ponto-verde" /> Entradas
              <strong>{formatarMoeda(entradas)}</strong>
            </span>

            <span className="mini-estatistica">
              <span className="ponto ponto-vermelho" /> Saídas
              <strong>{formatarMoeda(saidas)}</strong>
            </span>
          </div>
        </div>

        <div className="medidor-wrap">
          <div className="medidor-externo">
            <div
              className="medidor-preenchimento"
              style={{
                background:
                  totalMovimentado > 0
                    ? `conic-gradient(from 180deg, var(--cor-sucesso) 0deg ${grausEntradas}deg, var(--cor-primaria) ${grausEntradas}deg 180deg, transparent 180deg 360deg)`
                    : `conic-gradient(from 180deg, var(--cor-borda) 0deg 180deg, transparent 180deg 360deg)`,
              }}
            />
            <div className="medidor-mascara" />
            <div className="medidor-centro">
              {totalMovimentado > 0
                ? `${percentualEntradas}% entradas`
                : "sem dados"}
            </div>
          </div>

          <div className="medidor-legenda">
            <span>
              <span className="ponto ponto-verde" /> Entradas{" "}
              {totalMovimentado > 0 ? `${percentualEntradas}%` : "—"}
            </span>
            <span>
              <span className="ponto ponto-vermelho" /> Saídas{" "}
              {totalMovimentado > 0 ? `${100 - percentualEntradas}%` : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* ---------------- Ações ---------------- */}

      <div className="acoes-pagina">
        <button
          type="button"
          className="botao botao-verde"
          onClick={() => abrirModal("ENTRADA")}
        >
          <IconeDinheiro tamanho={16} /> Nova entrada
        </button>

        <button
          type="button"
          className="botao botao-perigo"
          onClick={() => abrirModal("SAIDA")}
        >
          <IconeDinheiro tamanho={16} /> Nova saída
        </button>

        <button
          type="button"
          className="botao"
          onClick={() => {
            setLiberado(false);
            setLancamentos([]);
          }}
        >
          Bloquear painel
        </button>
      </div>

      {/* ---------------- Lançamentos ---------------- */}

      <div className="cartao">
        <div className="ledger-cabecalho">
          <h3>{visao === "ENTRADA" ? "Entradas" : "Saídas"}</h3>

          <div className="acoes-pagina" style={{ marginBottom: 0 }}>
            <button
              type="button"
              className={`botao botao-pequeno ${
                visao === "ENTRADA" ? "botao-verde" : ""
              }`}
              onClick={() => setVisao("ENTRADA")}
            >
              Ver entradas
            </button>

            <button
              type="button"
              className={`botao botao-pequeno ${
                visao === "SAIDA" ? "botao-perigo" : ""
              }`}
              onClick={() => setVisao("SAIDA")}
            >
              Ver saídas
            </button>
          </div>
        </div>

        <p className="texto-ajuda" style={{ marginBottom: 10 }}>
          {lancamentosVisiveis.length === 0
            ? `Nenhum lançamento neste período.`
            : `Total de ${formatarMoeda(totalVisao)} em ${
                lancamentosVisiveis.length
              } lançamento(s).`}
        </p>

        {lancamentosVisiveis.length > 0 && (
          <div className="tabela-rolagem tabela-rolagem-financeiro">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th>Valor</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {lancamentosVisiveis.map((lancamento) => {
                  const ehEntrada = lancamento.tipo === "ENTRADA";

                  return (
                    <tr key={`${lancamento.origem || "lanc"}-${lancamento.id}`}>
                      <td>
                        {new Date(lancamento.data).toLocaleDateString("pt-BR")}
                      </td>
                      <td>{lancamento.descricao}</td>
                      <td
                        className={
                          ehEntrada ? "valor-entrada" : "valor-saida"
                        }
                        style={{ fontWeight: "bold", whiteSpace: "nowrap" }}
                      >
                        {ehEntrada ? "+ " : "− "}
                        {formatarMoeda(lancamento.valor)}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="botao-icone botao-icone-perigo"
                          title={
                            lancamento.origem === "despesa"
                              ? "Excluir despesa"
                              : "Excluir lançamento"
                          }
                          onClick={() => setConfirmandoLancamento(lancamento)}
                        >
                          <IconeLixeira tamanho={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ---------------- Modal: novo lançamento ---------------- */}

      {modalAberto && (
        <div className="modal-fundo" onClick={() => setModalAberto(false)}>
          <div
            className="modal-cartao"
            role="dialog"
            aria-modal="true"
            onClick={(evento) => evento.stopPropagation()}
          >
            <div className="modal-icone">
              <IconeDinheiro tamanho={26} />
            </div>

            <h3>{tipoModal === "ENTRADA" ? "Nova entrada" : "Nova saída"}</h3>

            <form onSubmit={handleSalvarLancamento}>
              <label className="campo" style={{ textAlign: "left" }}>
                <span>Valor (R$)</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={valor}
                  onChange={(evento) => setValor(evento.target.value)}
                  placeholder="0,00"
                />
              </label>

              <label className="campo" style={{ textAlign: "left" }}>
                <span>
                  {tipoModal === "ENTRADA"
                    ? "De onde veio o dinheiro?"
                    : "Para onde foi o dinheiro?"}
                </span>
                <input
                  type="text"
                  value={descricao}
                  onChange={(evento) => setDescricao(evento.target.value)}
                  placeholder={
                    tipoModal === "ENTRADA"
                      ? "Ex.: Pagamento aula prática — Maria"
                      : "Ex.: Combustível"
                  }
                />
              </label>

              <label className="campo" style={{ textAlign: "left" }}>
                <span>Data</span>
                <input
                  type="date"
                  value={dataLancamento}
                  onChange={(evento) => setDataLancamento(evento.target.value)}
                />
              </label>

              <div className="modal-acoes">
                <button
                  className="botao"
                  type="button"
                  onClick={() => setModalAberto(false)}
                >
                  Cancelar
                </button>

                <button
                  className={`botao ${
                    tipoModal === "ENTRADA" ? "botao-verde" : "botao-perigo"
                  }`}
                  type="submit"
                  disabled={salvando}
                >
                  {salvando
                    ? "Salvando…"
                    : tipoModal === "ENTRADA"
                      ? "Salvar entrada"
                      : "Salvar saída"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- Modal: confirmar exclusão ---------------- */}

      <ConfirmacaoModal
        aberto={Boolean(confirmandoLancamento)}
        titulo={
          confirmandoLancamento?.origem === "despesa"
            ? "Excluir despesa"
            : "Excluir lançamento"
        }
        mensagem={
          confirmandoLancamento
            ? `Excluir "${confirmandoLancamento.descricao}"? Essa ação não pode ser desfeita.`
            : ""
        }
        onConfirmar={confirmarExclusao}
        onCancelar={() => setConfirmandoLancamento(null)}
      />
    </div>
  );
}

export default Financeiro;
