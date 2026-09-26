import { useEffect, useState } from "react";
import { apiVeiculos } from "../services/api";
import ConfirmacaoModal from "../components/ConfirmacaoModal";
import { IconeLixeira, IconeCarro, IconeMoto, IconeDinheiro } from "../components/Icones";
import { formatarData } from "../utils/datas";

// Página de Veículos: cadastro, listagem, despesas, relatório e exclusão.
function Veiculos() {
  const [modo, setModo] = useState("cadastrar");

  // Cadastro
  const [placa, setPlaca] = useState("");
  const [cor, setCor] = useState("");
  const [tipo, setTipo] = useState("");

  // Listagem
  const [veiculos, setVeiculos] = useState([]);

  // Mensagens
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState("erro");

  // Exclusão
  const [confirmandoVeiculo, setConfirmandoVeiculo] = useState(null);

  // Despesas
  const [veiculoDespesa, setVeiculoDespesa] = useState(null);
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [dataDespesa, setDataDespesa] = useState("");
  const [salvandoDespesa, setSalvandoDespesa] = useState(false);

  // Relatório
  const [veiculoRelatorio, setVeiculoRelatorio] = useState(null);
  const [filtroRelatorio, setFiltroRelatorio] = useState(() =>
    new Date().toISOString().slice(0, 7),
  );
  const [despesasRelatorio, setDespesasRelatorio] = useState([]);
  const [totalRelatorio, setTotalRelatorio] = useState(0);

  function mostrar(mensagemTexto, tipo = "erro") {
    setMensagem(mensagemTexto);
    setTipoMensagem(tipo);

    setTimeout(() => {
      setMensagem("");
    }, 3000);
  }

  async function buscarVeiculos() {
    try {
      const dados = await apiVeiculos.listar();

      setVeiculos(dados);
    } catch (erro) {
      mostrar(erro.message);
    }
  }

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        const dados = await apiVeiculos.listar();

        if (ativo) {
          setVeiculos(dados);
        }
      } catch (erro) {
        if (ativo) {
          mostrar(erro.message);
        }
      }
    }

    carregar();

    return () => {
      ativo = false;
    };
  }, []);

  // -------------------------------------------------------------
  // Cadastro
  // -------------------------------------------------------------

  async function handleCadastrar(evento) {
    evento.preventDefault();

    const placaNormalizada = placa.toUpperCase().replace(/[^A-Z0-9]/g, "");

    if (placaNormalizada.length !== 7) {
      mostrar("Placa inválida. Use 3 letras + 4 caracteres (ex.: ABC1D23).");
      return;
    }

    if (cor.trim() === "") {
      mostrar("Informe a cor do veículo.");
      return;
    }

    if (tipo === "") {
      mostrar("Escolha o tipo do veículo (Carro ou Moto).");
      return;
    }

    try {
      const dados = await apiVeiculos.cadastrar({
        placa: placaNormalizada,
        cor: cor.trim(),
        tipo,
      });

      mostrar(dados.mensagem, "sucesso");

      setPlaca("");
      setCor("");
      setTipo("");

      buscarVeiculos();
    } catch (erro) {
      mostrar(erro.message);
    }
  }

  // -------------------------------------------------------------
  // Exclusão
  // -------------------------------------------------------------

  async function confirmarExclusao() {
    if (!confirmandoVeiculo) {
      return;
    }

    try {
      const dados = await apiVeiculos.excluir(confirmandoVeiculo.id);

      mostrar(dados.mensagem, "sucesso");
      buscarVeiculos();
    } catch (erro) {
      mostrar(erro.message);
    } finally {
      setConfirmandoVeiculo(null);
    }
  }

  // -------------------------------------------------------------
  // Despesas
  // -------------------------------------------------------------

  function abrirDespesas(veiculo) {
    setVeiculoDespesa(veiculo);
    setValor("");
    setDescricao("");
    setDataDespesa(new Date().toISOString().slice(0, 10));
  }

  async function handleRegistrarDespesa(evento) {
    evento.preventDefault();

    const valorNumero = Number(valor.replace(",", "."));

    if (!Number.isFinite(valorNumero) || valorNumero <= 0) {
      mostrar("Informe um valor válido para a despesa.");
      return;
    }

    if (descricao.trim() === "") {
      mostrar("Informe a descrição da despesa.");
      return;
    }

    if (dataDespesa === "") {
      mostrar("Informe a data da despesa.");
      return;
    }

    setSalvandoDespesa(true);

    try {
      const dados = await apiVeiculos.registrarDespesa(veiculoDespesa.id, {
        valor: valorNumero,
        descricao: descricao.trim(),
        data: dataDespesa,
      });

      mostrar(dados.mensagem, "sucesso");

      setVeiculoDespesa(null);
      buscarVeiculos();
    } catch (erro) {
      mostrar(erro.message);
    } finally {
      setSalvandoDespesa(false);
    }
  }

  // -------------------------------------------------------------
  // Relatório
  // -------------------------------------------------------------

  async function abrirRelatorio(veiculo) {
    setVeiculoRelatorio(veiculo);
    setFiltroRelatorio(new Date().toISOString().slice(0, 7));

    await carregarRelatorio(veiculo.id, new Date().toISOString().slice(0, 7));
  }

  async function carregarRelatorio(veiculoId, mesAno) {
    const [ano, mes] = mesAno.split("-");

    try {
      const despesas = await apiVeiculos.despesas(veiculoId, {
        mes: Number(mes),
        ano: Number(ano),
      });

      setDespesasRelatorio(despesas);
      setTotalRelatorio(
        despesas.reduce((soma, despesa) => soma + Number(despesa.valor), 0),
      );
    } catch (erro) {
      mostrar(erro.message);
    }
  }

  function formatarMoeda(valorNumero) {
    return Number(valorNumero).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  // -------------------------------------------------------------

  return (
    <div>
      <h2>Veículos</h2>

      <div className="acoes-pagina" style={{ justifyContent: "center" }}>
        <button
          type="button"
          className={`botao ${modo === "cadastrar" ? "botao-ativo" : ""}`}
          onClick={() => setModo("cadastrar")}
        >
          Cadastrar Veículo
        </button>

        <button
          type="button"
          className={`botao ${modo === "ver" ? "botao-ativo" : ""}`}
          onClick={() => setModo("ver")}
        >
          Ver Veículos
        </button>
      </div>

      {mensagem && <p className={`mensagem ${tipoMensagem}`}>{mensagem}</p>}

      {modo === "cadastrar" ? (
        <div className="cartao">
          <form onSubmit={handleCadastrar}>
            <div className="linha-campos">
              <label className="campo">
                <span>Placa</span>
                <input
                  type="text"
                  value={placa}
                  onChange={(evento) =>
                    setPlaca(
                      evento.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""),
                    )
                  }
                  placeholder="ABC1D23"
                  maxLength={7}
                />
              </label>

              <label className="campo">
                <span>Cor</span>
                <input
                  type="text"
                  value={cor}
                  onChange={(evento) => setCor(evento.target.value)}
                  placeholder="Ex.: Branco"
                />
              </label>

              <label className="campo">
                <span>Tipo</span>
                <select
                  value={tipo}
                  onChange={(evento) => setTipo(evento.target.value)}
                >
                  <option value="">Selecione</option>
                  <option value="CARRO">Carro</option>
                  <option value="MOTO">Moto</option>
                </select>
              </label>
            </div>

            <button className="botao botao-primario" type="submit">
              Cadastrar veículo
            </button>
          </form>
        </div>
      ) : veiculos.length === 0 ? (
        <div className="cartao">
          <p className="lista-vazia">Nenhum veículo cadastrado.</p>
        </div>
      ) : (
        <table className="tabela">
          <thead>
            <tr>
              <th>Placa</th>
              <th>Cor</th>
              <th>Tipo</th>
              <th>Total de despesas</th>
              <th>Ações</th>
            </tr>
          </thead>

          <tbody>
            {veiculos.map((veiculo) => {
              const totalDespesas = veiculo.despesas.reduce(
                (soma, despesa) => soma + Number(despesa.valor),
                0,
              );

              return (
                <tr key={veiculo.id}>
                  <td>{veiculo.placa}</td>
                  <td>{veiculo.cor}</td>
                  <td>
                    {veiculo.tipo === "CARRO" ? (
                      <span title="Carro">
                        <IconeCarro tamanho={20} />
                      </span>
                    ) : (
                      <span title="Moto">
                        <IconeMoto tamanho={20} />
                      </span>
                    )}
                  </td>
                  <td>{formatarMoeda(totalDespesas)}</td>

                  <td>
                    <button
                      className="botao botao-pequeno"
                      type="button"
                      onClick={() => abrirDespesas(veiculo)}
                    >
                      Despesas
                    </button>{" "}
                    <button
                      className="botao botao-pequeno"
                      type="button"
                      onClick={() => abrirRelatorio(veiculo)}
                    >
                      Relatório
                    </button>{" "}
                    <button
                      className="botao-icone botao-icone-perigo"
                      type="button"
                      title="Excluir veículo"
                      onClick={() => setConfirmandoVeiculo(veiculo)}
                    >
                      <IconeLixeira tamanho={18} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* ---------------- Modal: registrar despesa ---------------- */}

      {veiculoDespesa && (
        <div className="modal-fundo" onClick={() => setVeiculoDespesa(null)}>
          <div
            className="modal-cartao"
            role="dialog"
            aria-modal="true"
            onClick={(evento) => evento.stopPropagation()}
          >
            <div className="modal-icone">
              <IconeDinheiro tamanho={26} />
            </div>

            <h3>
              Despesa — {veiculoDespesa.placa} ({veiculoDespesa.tipo})
            </h3>

            <form onSubmit={handleRegistrarDespesa}>
              <label className="campo" style={{ textAlign: "left" }}>
                <span>Valor (R$)</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={valor}
                  onChange={(evento) => setValor(evento.target.value)}
                  placeholder="Ex.: 150,00"
                />
              </label>

              <label className="campo" style={{ textAlign: "left" }}>
                <span>Descrição</span>
                <input
                  type="text"
                  value={descricao}
                  onChange={(evento) => setDescricao(evento.target.value)}
                  placeholder="Ex.: Troca de óleo"
                />
              </label>

              <label className="campo" style={{ textAlign: "left" }}>
                <span>Data</span>
                <input
                  type="date"
                  value={dataDespesa}
                  onChange={(evento) => setDataDespesa(evento.target.value)}
                />
              </label>

              <div className="modal-acoes">
                <button
                  className="botao"
                  type="button"
                  onClick={() => setVeiculoDespesa(null)}
                >
                  Cancelar
                </button>

                <button
                  className="botao botao-primario"
                  type="submit"
                  disabled={salvandoDespesa}
                >
                  {salvandoDespesa ? "Salvando…" : "Registrar despesa"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- Modal: relatório de despesas ---------------- */}

      {veiculoRelatorio && (
        <div className="modal-fundo" onClick={() => setVeiculoRelatorio(null)}>
          <div
            className="modal-cartao"
            role="dialog"
            aria-modal="true"
            style={{ maxWidth: 560 }}
            onClick={(evento) => evento.stopPropagation()}
          >
            <h3>
              Relatório — {veiculoRelatorio.placa} ({veiculoRelatorio.tipo})
            </h3>

            <div className="linha-campos">
              <label className="campo" style={{ textAlign: "left" }}>
                <span>Mês e ano</span>
                <input
                  type="month"
                  value={filtroRelatorio}
                  onChange={(evento) => {
                    setFiltroRelatorio(evento.target.value);
                    carregarRelatorio(
                      veiculoRelatorio.id,
                      evento.target.value,
                    );
                  }}
                />
              </label>
            </div>

            <p className="texto-ajuda">
              Total no período: <strong>{formatarMoeda(totalRelatorio)}</strong>{" "}
              · {despesasRelatorio.length} despesa(s)
            </p>

            {despesasRelatorio.length === 0 ? (
              <p className="lista-vazia">Nenhuma despesa no período.</p>
            ) : (
              <div className="tabela-rolagem">
                <table className="tabela">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Descrição</th>
                      <th>Valor</th>
                    </tr>
                  </thead>

                  <tbody>
                    {despesasRelatorio.map((despesa) => (
                      <tr key={despesa.id}>
                        <td>{formatarData(despesa.data)}</td>
                        <td>{despesa.descricao}</td>
                        <td>{formatarMoeda(despesa.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="modal-acoes">
              <button
                className="botao"
                type="button"
                onClick={() => setVeiculoRelatorio(null)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- Modal: confirmar exclusão ---------------- */}

      <ConfirmacaoModal
        aberto={Boolean(confirmandoVeiculo)}
        titulo="Excluir veículo"
        mensagem={
          confirmandoVeiculo
            ? `Excluir o veículo ${confirmandoVeiculo.placa}? Todas as despesas registradas nele também serão removidas.`
            : ""
        }
        onConfirmar={confirmarExclusao}
        onCancelar={() => setConfirmandoVeiculo(null)}
      />
    </div>
  );
}

export default Veiculos;
