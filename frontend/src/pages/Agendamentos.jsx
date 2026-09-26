import { useEffect, useState } from "react";
import { apiAgendamentos, apiAlunos, apiInstrutores } from "../services/api";
import TabelaHorarios from "../components/TabelaHorarios";
import ConfirmacaoModal from "../components/ConfirmacaoModal";
import { IconeLixeira } from "../components/Icones";
import {
  agruparPorData,
  domingoDaSemana,
  formatarData,
  hojeISO,
  intervaloDoMes,
  segundaDaSemana,
} from "../utils/datas";
import { apenasNumeros } from "../utils/numeros";

const MAX_HORARIOS = 5;

function Agendamentos() {
  const [modo, setModo] = useState("agendar");

  // Dados comuns
  const [alunos, setAlunos] = useState([]);
  const [instrutores, setInstrutores] = useState([]);
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState("erro");

  // Modo agendar
  const [cpfDigitado, setCpfDigitado] = useState("");
  const [alunoEncontrado, setAlunoEncontrado] = useState(null);
  const [instrutorId, setInstrutorId] = useState("");
  const [data, setData] = useState("");
  const [veiculo, setVeiculo] = useState("");
  const [horarios, setHorarios] = useState([]);
  const [agendamentosDia, setAgendamentosDia] = useState([]);
  const [selecionados, setSelecionados] = useState([]);
  const [agendando, setAgendando] = useState(false);

  // Modo ver
  const [periodo, setPeriodo] = useState("dia");
  const [dataFiltro, setDataFiltro] = useState(hojeISO());
  const [instrutorFiltro, setInstrutorFiltro] = useState("");
  const [resultado, setResultado] = useState([]);
  const [horariosVer, setHorariosVer] = useState([]);
  const [horariosPorData, setHorariosPorData] = useState(new Map());

  // Aulas selecionadas para excluir em lote (pela lixeira flutuante)
  const [selecionadosExclusao, setSelecionadosExclusao] = useState([]);
  const [confirmando, setConfirmando] = useState(false);

  // Modo agendar em lote (múltiplas datas de uma vez)
  const [loteDatas, setLoteDatas] = useState([]);
  const [loteDataInput, setLoteDataInput] = useState("");
  const [loteInstrutorId, setLoteInstrutorId] = useState("");
  const [loteDisponibilidade, setLoteDisponibilidade] = useState(new Map());
  const [loteSelecao, setLoteSelecao] = useState(new Map());
  const [loteConflitos, setLoteConflitos] = useState([]);
  const [loteEnviando, setLoteEnviando] = useState(false);

  useEffect(() => {
    Promise.all([apiAlunos.listar(), apiInstrutores.listar()])
      .then(([listaAlunos, listaInstrutores]) => {
        setAlunos(listaAlunos);
        setInstrutores(listaInstrutores);
      })
      .catch((erro) => mostrar(erro.message));
  }, []);

  function mostrar(mensagemTexto, tipo = "erro") {
    setMensagem(mensagemTexto);
    setTipoMensagem(tipo);

    setTimeout(() => {
      setMensagem("");
    }, 3000);
  }

  // ---------------------------------------------------------------
  // Modo agendar
  // ---------------------------------------------------------------

  function localizarAluno(cpf) {
    const digitos = apenasNumeros(cpf);

    setCpfDigitado(digitos);

    const encontrado = alunos.find(
      (aluno) => aluno.cpf.replace(/\D/g, "") === digitos && digitos.length > 0,
    );

    setAlunoEncontrado(encontrado || null);
  }

  async function carregarTabelaDia(novaData) {
    if (!novaData) {
      setHorarios([]);
      setAgendamentosDia([]);
      setSelecionados([]);
      return;
    }

    try {
      const [dadosHorarios, agendamentos] = await Promise.all([
        apiAgendamentos.horarios(novaData),
        apiAgendamentos.listar({ data: novaData }),
      ]);

      setHorarios(dadosHorarios.horarios || []);
      setAgendamentosDia(agendamentos);
      setSelecionados([]);
    } catch (erro) {
      mostrar(erro.message);
    }
  }

  function alternarHorario(inicio) {
    const jaSelecionado = selecionados.includes(inicio);

    if (jaSelecionado) {
      setSelecionados(selecionados.filter((h) => h !== inicio));
      return;
    }

    if (selecionados.length >= MAX_HORARIOS) {
      mostrar(`Você pode selecionar no máximo ${MAX_HORARIOS} horários.`);
      return;
    }

    setSelecionados([...selecionados, inicio]);
  }

  async function handleAgendar(evento) {
    evento.preventDefault();

    if (!alunoEncontrado) {
      mostrar("Aluno não encontrado. Verifique o CPF ou cadastre o aluno.");
      return;
    }

    if (!instrutorId) {
      mostrar("Selecione um instrutor.");
      return;
    }

    if (!data) {
      mostrar("Escolha uma data.");
      return;
    }

    if (!veiculo) {
      mostrar("Escolha o veículo (Carro ou Moto).");
      return;
    }

    if (selecionados.length === 0) {
      mostrar("Selecione pelo menos um horário.");
      return;
    }

    setAgendando(true);

    try {
      const dados = await apiAgendamentos.agendar({
        alunoId: alunoEncontrado.id,
        instrutorId: Number(instrutorId),
        data,
        horarios: selecionados,
        veiculo,
      });

      mostrar(dados.mensagem, "sucesso");

      // Limpa todos os campos para o próximo agendamento
      setCpfDigitado("");
      setAlunoEncontrado(null);
      setInstrutorId("");
      setData("");
      setVeiculo("");
      setHorarios([]);
      setAgendamentosDia([]);
      setSelecionados([]);
    } catch (erro) {
      mostrar(erro.message);
    } finally {
      setAgendando(false);
    }
  }

  // ---------------------------------------------------------------
  // Modo ver
  // ---------------------------------------------------------------

  function montarFiltros() {
    const filtros = {};

    if (periodo === "dia") {
      filtros.data = dataFiltro;
    } else if (periodo === "semana") {
      filtros.de = segundaDaSemana(dataFiltro);
      filtros.ate = domingoDaSemana(dataFiltro);
    } else {
      const intervalo = intervaloDoMes(dataFiltro);

      filtros.de = intervalo.de;
      filtros.ate = intervalo.ate;
    }

    if (instrutorFiltro) {
      filtros.instrutorId = instrutorFiltro;
    }

    return filtros;
  }

  async function carregarResultado() {
    try {
      const agendamentos = await apiAgendamentos.listar(montarFiltros());

      setResultado(agendamentos);
      setSelecionadosExclusao([]);
      setConfirmando(false);

      if (periodo === "dia") {
        const dadosHorarios = await apiAgendamentos.horarios(dataFiltro);

        setHorariosVer(dadosHorarios.horarios || []);
      } else {
        // Carrega a grade de horários de cada data que possui aulas
        const datas = [
          ...new Set(agendamentos.map((a) => a.data.slice(0, 10))),
        ];

        const resultados = await Promise.all(
          datas.map(async (dia) => {
            const dadosHorarios = await apiAgendamentos.horarios(dia);

            return [dia, dadosHorarios.horarios || []];
          }),
        );

        setHorariosPorData(new Map(resultados));
      }

      mostrar("");
    } catch (erro) {
      mostrar(erro.message);
    }
  }

  function alternarSelecao(agendamento) {
    setSelecionadosExclusao((atuais) =>
      atuais.includes(agendamento.id)
        ? atuais.filter((id) => id !== agendamento.id)
        : [...atuais, agendamento.id],
    );
  }

  async function confirmarExclusaoLote() {
    if (selecionadosExclusao.length === 0) {
      return;
    }

    try {
      const dados = await apiAgendamentos.excluirLote(selecionadosExclusao);

      mostrar(dados.mensagem, "sucesso");

      await carregarResultado();
    } catch (erro) {
      mostrar(erro.message);
    } finally {
      setConfirmando(false);
    }
  }

  // Instrutores a exibir no modo ver: todos (como a aba Início)
  // ou apenas o selecionado no filtro.
  function instrutoresVisiveis(agendamentosDaData = null) {
    if (instrutorFiltro) {
      return instrutores.filter(
        (instrutor) => instrutor.id === Number(instrutorFiltro),
      );
    }

    // Se informado, mostra apenas instrutores com aula naquela data
    if (agendamentosDaData) {
      const ids = new Set(agendamentosDaData.map((a) => a.instrutorId));

      return instrutores.filter((instrutor) => ids.has(instrutor.id));
    }

    return instrutores;
  }

  function gradeDoInstrutor(
    instrutor,
    agendamentosDoDia,
    horariosDoDia,
    chave,
  ) {
    return (
      <div className="cartao" key={chave}>
        <h3>{instrutor.nome}</h3>

        <TabelaHorarios
          horarios={horariosDoDia}
          agendamentos={agendamentosDoDia}
          instrutorId={instrutor.id}
          selecionavelOcupado
          ocupadosSelecionados={selecionadosExclusao}
          onAlternarOcupado={alternarSelecao}
        />
      </div>
    );
  }

  // ---------------------------------------------------------------
  // Modo agendar em lote
  // ---------------------------------------------------------------

  // Ao trocar de instrutor, recarrega os agendamentos de todas as
  // datas do lote e remove da seleção os horários que ficaram ocupados
  // para o instrutor recém-escolhido.
  useEffect(() => {
    if (loteInstrutorId === "") {
      return;
    }

    async function atualizarDisponibilidade() {
      const datas = [...loteDatas];

      for (const dataISO of datas) {
        await carregarDisponibilidadeLote(dataISO);
      }

      // Remove slots que ficaram ocupados para o instrutor escolhido
      const ocupacoes = new Map();

      for (const dataISO of datas) {
        const disponibilidade = loteDisponibilidade.get(dataISO);

        if (!disponibilidade) {
          continue;
        }

        const ocupados = disponibilidade.agendamentos
          .filter(
            (agendamento) =>
              agendamento.instrutorId === Number(loteInstrutorId),
          )
          .map((agendamento) => agendamento.horario);

        ocupacoes.set(dataISO, ocupados);
      }

      setLoteSelecao((atual) => {
        const novo = new Map(atual);

        for (const [dataISO, ocupados] of ocupacoes) {
          const lista = (novo.get(dataISO) || []).filter(
            (slot) => !ocupados.includes(slot.horario),
          );

          novo.set(dataISO, lista);
        }

        return novo;
      });
    }

    atualizarDisponibilidade();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loteInstrutorId]);

  async function adicionarDataLote() {
    const nova = loteDataInput;

    if (!nova) {
      mostrar("Escolha uma data.");
      return;
    }

    if (loteDatas.length >= 5) {
      mostrar("O lote permite no máximo 5 datas diferentes.");
      return;
    }

    if (loteDatas.includes(nova)) {
      mostrar("Essa data já está no lote.");
      return;
    }

    const diaSemana = new Date(`${nova}T12:00:00`).getDay();

    if (diaSemana === 0) {
      mostrar("Não é permitido agendar aos domingos.");
      return;
    }

    setLoteDatas([...loteDatas, nova]);
    setLoteDataInput("");
    setLoteConflitos([]);

    await carregarDisponibilidadeLote(nova);
  }

  async function carregarDisponibilidadeLote(dataISO) {
    try {
      const [dadosHorarios, agendamentos] = await Promise.all([
        apiAgendamentos.horarios(dataISO),
        apiAgendamentos.listar({ data: dataISO }),
      ]);

      setLoteDisponibilidade((atual) => {
        const novo = new Map(atual);

        novo.set(dataISO, {
          horarios: dadosHorarios.horarios || [],
          agendamentos,
        });

        return novo;
      });
    } catch (erro) {
      mostrar(erro.message);
    }
  }

  function removerDataLote(dataISO) {
    setLoteDatas(loteDatas.filter((data) => data !== dataISO));

    setLoteDisponibilidade((atual) => {
      const novo = new Map(atual);
      novo.delete(dataISO);
      return novo;
    });

    setLoteSelecao((atual) => {
      const novo = new Map(atual);
      novo.delete(dataISO);
      return novo;
    });
  }

  function alternarSlotLote(dataISO, horario) {
    setLoteSelecao((atual) => {
      const novo = new Map(atual);
      const lista = [...(novo.get(dataISO) || [])];
      const existente = lista.find((slot) => slot.horario === horario);

      if (existente) {
        novo.set(dataISO, lista.filter((slot) => slot.horario !== horario));
      } else {
        if (lista.length >= 6) {
          mostrar(`Máximo de 6 horários por data (${dataISO}).`);
          return atual;
        }

        lista.push({ horario, tipoVeiculo: "CARRO" });
        novo.set(dataISO, lista);
      }

      return novo;
    });
  }

  function alternarTipoLote(dataISO, horario) {
    setLoteSelecao((atual) => {
      const novo = new Map(atual);
      const lista = (novo.get(dataISO) || []).map((slot) =>
        slot.horario === horario
          ? {
              ...slot,
              tipoVeiculo: slot.tipoVeiculo === "CARRO" ? "MOTO" : "CARRO",
            }
          : slot,
      );

      novo.set(dataISO, lista);

      return novo;
    });
  }

  async function handleAgendarLote(evento) {
    evento.preventDefault();

    if (!alunoEncontrado) {
      mostrar("Aluno não encontrado. Verifique o CPF.");
      return;
    }

    if (!loteInstrutorId) {
      mostrar("Selecione um instrutor.");
      return;
    }

    const aulas = [];

    for (const dataISO of loteDatas) {
      for (const slot of loteSelecao.get(dataISO) || []) {
        aulas.push({
          data: dataISO,
          horario: slot.horario,
          instrutorId: Number(loteInstrutorId),
          tipoVeiculo: slot.tipoVeiculo,
        });
      }
    }

    if (aulas.length === 0) {
      mostrar("Selecione pelo menos um horário.");
      return;
    }

    setLoteEnviando(true);
    setLoteConflitos([]);

    try {
      const dados = await apiAgendamentos.agendarLote({
        alunoId: alunoEncontrado.id,
        aulas,
      });

      mostrar(dados.mensagem, "sucesso");

      // Limpa tudo para o próximo lote
      setCpfDigitado("");
      setAlunoEncontrado(null);
      setLoteInstrutorId("");
      setLoteDatas([]);
      setLoteDisponibilidade(new Map());
      setLoteSelecao(new Map());
    } catch (erro) {
      mostrar(erro.message);

      // Conflito: mantém a seleção intacta, remove apenas os slots
      // que falharam e recarrega a disponibilidade deles.
      const conflitos = erro.dados?.conflitos || [];

      if (conflitos.length > 0) {
        setLoteConflitos(conflitos);

        for (const conflito of conflitos) {
          setLoteSelecao((atual) => {
            const novo = new Map(atual);
            const lista = (novo.get(conflito.data) || []).filter(
              (slot) => slot.horario !== conflito.horario,
            );

            novo.set(conflito.data, lista);

            return novo;
          });

          await carregarDisponibilidadeLote(conflito.data);
        }
      }
    } finally {
      setLoteEnviando(false);
    }
  }

  // ---------------------------------------------------------------

  return (
    <div>
      <h2>Agendamentos</h2>

      <div className="acoes-pagina" style={{ justifyContent: "center" }}>
        <button
          type="button"
          className={`botao ${modo === "agendar" ? "botao-ativo" : ""}`}
          onClick={() => setModo("agendar")}
        >
          Agendar um novo aluno
        </button>

        <button
          type="button"
          className={`botao ${modo === "lote" ? "botao-ativo" : ""}`}
          onClick={() => setModo("lote")}
        >
          Agendar em lote
        </button>

        <button
          type="button"
          className={`botao ${modo === "ver" ? "botao-ativo" : ""}`}
          onClick={() => {
            setModo("ver");
            carregarResultado();
          }}
        >
          Exibir agendamentos
        </button>
      </div>

      {modo === "ver" && mensagem && (
        <p className={`mensagem ${tipoMensagem}`}>{mensagem}</p>
      )}

      {modo === "agendar" ? (
        <div className="cartao">
          <form onSubmit={handleAgendar}>
            <div className="linha-campos linha-campos-agendar">
              <label className="campo campo-curto">
                <span>CPF do Aluno</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={cpfDigitado}
                  onChange={(evento) => localizarAluno(evento.target.value)}
                  placeholder="Digite aqui"
                  maxLength={11}
                />
                {alunoEncontrado && (
                  <span className="texto-ajuda">
                    Aluno: {alunoEncontrado.nome}
                  </span>
                )}
                {cpfDigitado !== "" && !alunoEncontrado && (
                  <span className="texto-ajuda">
                    Aluno não encontrado no sistema.
                  </span>
                )}
              </label>

              <label className="campo">
                <span>Instrutor</span>
                <select
                  value={instrutorId}
                  onChange={(evento) => setInstrutorId(evento.target.value)}
                >
                  <option value="">Selecione um instrutor</option>

                  {instrutores.map((instrutor) => (
                    <option key={instrutor.id} value={instrutor.id}>
                      {instrutor.nome}
                    </option>
                  ))}
                </select>
              </label>

              <label className="campo">
                <span>Data</span>
                <input
                  type="date"
                  min={hojeISO()}
                  value={data}
                  onChange={(evento) => {
                    const novaData = evento.target.value;

                    setData(novaData);
                    carregarTabelaDia(novaData);
                  }}
                />
              </label>

              <label className="campo campo-veiculo">
                <span>Veículo</span>
                <select
                  value={veiculo}
                  onChange={(evento) => setVeiculo(evento.target.value)}
                >
                  <option value="">Selecione</option>
                  <option value="CARRO">Carro</option>
                  <option value="MOTO">Moto</option>
                </select>
              </label>
            </div>

            {data && instrutorId && (
              <TabelaHorarios
                horarios={horarios}
                agendamentos={agendamentosDia}
                instrutorId={Number(instrutorId)}
                alunoId={alunoEncontrado?.id || null}
                selecionavel
                selecionados={selecionados}
                onAlternar={alternarHorario}
              />
            )}

            <button
              className="botao botao-primario"
              type="submit"
              disabled={agendando}
            >
              {agendando ? "Agendando…" : "Agendar aluno"}
            </button>

            {mensagem && (
              <p className={`mensagem ${tipoMensagem}`}>{mensagem}</p>
            )}
          </form>
        </div>
      ) : modo !== "lote" ? (
        <div>
          <div className="cartao">
            <div className="linha-campos">
              <label className="campo">
                <span>Período</span>
                <select
                  value={periodo}
                  onChange={(evento) => setPeriodo(evento.target.value)}
                >
                  <option value="dia">Dia</option>
                  <option value="semana">Semana</option>
                  <option value="mes">Mês</option>
                </select>
              </label>

              <label className="campo">
                <span>{periodo === "mes" ? "Mês de referência" : "Data"}</span>
                <input
                  type={periodo === "mes" ? "month" : "date"}
                  value={
                    periodo === "mes" ? dataFiltro.slice(0, 7) : dataFiltro
                  }
                  onChange={(evento) => {
                    const valor = evento.target.value;

                    setDataFiltro(periodo === "mes" ? `${valor}-01` : valor);
                  }}
                />
              </label>

              <label className="campo">
                <span>Instrutor</span>
                <select
                  value={instrutorFiltro}
                  onChange={(evento) => setInstrutorFiltro(evento.target.value)}
                >
                  <option value="">Todos</option>

                  {instrutores.map((instrutor) => (
                    <option key={instrutor.id} value={instrutor.id}>
                      {instrutor.nome}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <button className="botao" type="button" onClick={carregarResultado}>
              Buscar
            </button>
          </div>

          <div className="legenda">
            <span>
              <span
                className="amostra"
                style={{ backgroundColor: "var(--cor-ocupado)" }}
              />{" "}
              Ocupado
            </span>
            <span>
              <span
                className="amostra"
                style={{ backgroundColor: "var(--cor-painel)" }}
              />{" "}
              Livre
            </span>
          </div>

          <p className="texto-ajuda">
            Toque nas aulas (verde) para selecionar várias e depois use a
            lixeira no canto da tela para excluir.
          </p>

          {periodo === "dia" ? (
            <div>
              <h3 style={{ marginBottom: 12 }}>
                Agendamentos de {formatarData(dataFiltro)}
              </h3>

              {resultado.length === 0 && instrutoresVisiveis().length === 0 ? (
                <div className="cartao">
                  <p className="lista-vazia">
                    Nenhum instrutor cadastrado neste filtro.
                  </p>
                </div>
              ) : (
                instrutoresVisiveis().map((instrutor) =>
                  gradeDoInstrutor(
                    instrutor,
                    resultado,
                    horariosVer,
                    instrutor.id,
                  ),
                )
              )}
            </div>
          ) : resultado.length === 0 ? (
            <div className="cartao">
              <p className="lista-vazia">Nenhum agendamento no período.</p>
            </div>
          ) : (
            agruparPorData(resultado).map(([dia, agendamentosDoDia]) => {
              const horariosDoDia = horariosPorData.get(dia) || [];

              return (
                <div className="grupo-datas" key={dia}>
                  <h4 style={{ marginBottom: 12 }}>{formatarData(dia)}</h4>

                  {instrutoresVisiveis(agendamentosDoDia).map((instrutor) =>
                    gradeDoInstrutor(
                      instrutor,
                      agendamentosDoDia,
                      horariosDoDia,
                      `${dia}-${instrutor.id}`,
                    ),
                  )}
                </div>
              );
            })
          )}

          {selecionadosExclusao.length > 0 && (
            <button
              type="button"
              className="botao-flutuante-lixeira"
              title="Excluir aulas selecionadas"
              onClick={() => setConfirmando(true)}
            >
              <IconeLixeira tamanho={26} />
              <span style={{ marginLeft: 6, fontWeight: "bold" }}>
                {selecionadosExclusao.length}
              </span>
            </button>
          )}
        </div>
      ) : null}

      {modo === "lote" && (
        <div className="cartao">
          <form onSubmit={handleAgendarLote}>
            <div className="linha-campos linha-campos-agendar">
              <label className="campo campo-curto">
                <span>CPF do Aluno</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={cpfDigitado}
                  onChange={(evento) => localizarAluno(evento.target.value)}
                  placeholder="Digite aqui"
                  maxLength={11}
                />
                {alunoEncontrado && (
                  <span className="texto-ajuda">
                    Aluno: {alunoEncontrado.nome}
                  </span>
                )}
              </label>

              <label className="campo">
                <span>Instrutor</span>
                <select
                  value={loteInstrutorId}
                  onChange={(evento) => setLoteInstrutorId(evento.target.value)}
                >
                  <option value="">Selecione um instrutor</option>

                  {instrutores.map((instrutor) => (
                    <option key={instrutor.id} value={instrutor.id}>
                      {instrutor.nome}
                    </option>
                  ))}
                </select>
              </label>

              <label className="campo">
                <span>Adicionar data</span>
                <input
                  type="date"
                  min={hojeISO()}
                  value={loteDataInput}
                  onChange={(evento) => setLoteDataInput(evento.target.value)}
                />
              </label>

              <label className="campo">
                <span>&nbsp;</span>
                <button
                  className="botao"
                  type="button"
                  onClick={adicionarDataLote}
                >
                  Adicionar data
                </button>
              </label>
            </div>

            {loteDatas.length > 0 && (
              <p className="texto-ajuda">
                Datas do lote ({loteDatas.length}/5):
              </p>
            )}

            <div>
              {loteDatas.map((dataISO) => (
                <span className="chip-data" key={dataISO}>
                  {formatarData(dataISO)}
                  <button
                    type="button"
                    title="Remover data"
                    onClick={() => removerDataLote(dataISO)}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>

            {loteDatas.map((dataISO) => {
              const disponibilidade = loteDisponibilidade.get(dataISO);
              const selecaoDaData = loteSelecao.get(dataISO) || [];

              return (
                <div className="cartao-interno" key={dataISO}>
                  <h3>
                    {formatarData(dataISO)} — {selecaoDaData.length}/6 horários
                  </h3>

                  {!disponibilidade ? (
                    <p className="lista-vazia">Carregando…</p>
                  ) : (
                    <div className="grade-horarios">
                      {disponibilidade.horarios.map((item) => {
                        const ocupado = disponibilidade.agendamentos.some(
                          (agendamento) =>
                            agendamento.horario === item.inicio &&
                            (agendamento.instrutorId ===
                              Number(loteInstrutorId) ||
                              agendamento.alunoId === alunoEncontrado?.id),
                        );
                        const selecionado = selecaoDaData.find(
                          (slot) => slot.horario === item.inicio,
                        );

                        let classe = "slot slot-livre";

                        if (ocupado) {
                          classe = "slot slot-ocupado";
                        } else if (selecionado) {
                          classe = "slot slot-selecionado";
                        }

                        return (
                          <div
                            key={item.inicio}
                            className={classe}
                            style={{ cursor: ocupado ? "not-allowed" : "pointer" }}
                            onClick={() => {
                              if (!ocupado) {
                                alternarSlotLote(dataISO, item.inicio);
                              }
                            }}
                          >
                            <strong>
                              {item.inicio} – {item.fim}
                            </strong>

                            {ocupado && (
                              <span className="slot-detalhe">Ocupado</span>
                            )}

                            {selecionado && (
                              <span
                                className="slot-detalhe"
                                onClick={(evento) => evento.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  className={`botao-tipo ${
                                    selecionado.tipoVeiculo === "CARRO"
                                      ? "ativo"
                                      : ""
                                  }`}
                                  onClick={() =>
                                    alternarTipoLote(dataISO, item.inicio)
                                  }
                                >
                                  Carro
                                </button>{" "}
                                <button
                                  type="button"
                                  className={`botao-tipo ${
                                    selecionado.tipoVeiculo === "MOTO"
                                      ? "ativo"
                                      : ""
                                  }`}
                                  onClick={() =>
                                    alternarTipoLote(dataISO, item.inicio)
                                  }
                                >
                                  Moto
                                </button>
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {loteConflitos.length > 0 && (
              <div className="mensagem erro">
                <strong>Horários em conflito (nenhuma aula foi criada):</strong>

                <ul style={{ marginLeft: 18, marginTop: 6 }}>
                  {loteConflitos.map((conflito, indice) => (
                    <li key={indice}>
                      {formatarData(conflito.data)} às {conflito.horario} —{" "}
                      {conflito.motivo}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              className="botao botao-primario"
              type="submit"
              disabled={loteEnviando}
            >
              {loteEnviando ? "Agendando…" : "Agendar lote"}
            </button>

            {mensagem && (
              <p className={`mensagem ${tipoMensagem}`}>{mensagem}</p>
            )}
          </form>
        </div>
      )}

      <ConfirmacaoModal
        aberto={confirmando}
        titulo="Excluir aulas"
        mensagem={`Excluir ${selecionadosExclusao.length} aula(s) selecionada(s)? Essa ação não pode ser desfeita.`}
        onConfirmar={confirmarExclusaoLote}
        onCancelar={() => setConfirmando(false)}
      />
    </div>
  );
}

export default Agendamentos;
