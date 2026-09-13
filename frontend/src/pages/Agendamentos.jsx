import { useEffect, useState } from "react";
import { apiAgendamentos, apiAlunos, apiInstrutores } from "../services/api";
import TabelaHorarios from "../components/TabelaHorarios";
import {
  agruparPorData,
  domingoDaSemana,
  formatarData,
  hojeISO,
  intervaloDoMes,
  segundaDaSemana,
} from "../utils/datas";

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
  }

  // ---------------------------------------------------------------
  // Modo agendar
  // ---------------------------------------------------------------

  function localizarAluno(cpf) {
    setCpfDigitado(cpf);

    const digitos = cpf.replace(/\D/g, "");
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

      await carregarTabelaDia(data);
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

      // No modo dia, também carrega a grade completa de horários do dia
      if (periodo === "dia") {
        const dadosHorarios = await apiAgendamentos.horarios(dataFiltro);

        setHorariosVer(dadosHorarios.horarios || []);
      }

      mostrar("");
    } catch (erro) {
      mostrar(erro.message);
    }
  }

  async function handleCancelar(agendamento) {
    const confirmou = window.confirm(
      `Cancelar a aula de ${agendamento.aluno.nome} às ${agendamento.horario} (${formatarData(agendamento.data)})?`,
    );

    if (!confirmou) {
      return;
    }

    try {
      const dados = await apiAgendamentos.cancelar(agendamento.id);

      mostrar(dados.mensagem, "sucesso");

      await carregarResultado();
      await carregarTabelaDia(data);
    } catch (erro) {
      mostrar(erro.message);
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
          className={`botao ${modo === "ver" ? "botao-ativo" : ""}`}
          onClick={() => {
            setModo("ver");
            carregarResultado();
          }}
        >
          Mostrar agendamentos do dia
        </button>
      </div>

      {mensagem && <p className={`mensagem ${tipoMensagem}`}>{mensagem}</p>}

      {modo === "agendar" ? (
        <div className="cartao">
          <form onSubmit={handleAgendar}>
            <div className="linha-campos">
              <label className="campo">
                <span>CPF do aluno</span>
                <input
                  type="text"
                  value={cpfDigitado}
                  onChange={(evento) => localizarAluno(evento.target.value)}
                  placeholder="Digite o CPF cadastrado"
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

              <label className="campo">
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
          </form>
        </div>
      ) : (
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
                  value={periodo === "mes" ? dataFiltro.slice(0, 7) : dataFiltro}
                  onChange={(evento) => {
                    const valor = evento.target.value;

                    setDataFiltro(
                      periodo === "mes" ? `${valor}-01` : valor,
                    );
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

          {periodo === "dia" ? (
            <div className="cartao">
              <h3>Agendamentos de {formatarData(dataFiltro)}</h3>

              <TabelaHorarios
                horarios={horariosVer}
                agendamentos={resultado}
                mostrarCancelar
                onCancelar={handleCancelar}
              />
            </div>
          ) : resultado.length === 0 ? (
            <div className="cartao">
              <p className="lista-vazia">Nenhum agendamento no período.</p>
            </div>
          ) : (
            agruparPorData(resultado).map(([dia, agendamentos]) => (
              <div className="cartao grupo-datas" key={dia}>
                <h4>{formatarData(dia)}</h4>

                <table className="tabela">
                  <thead>
                    <tr>
                      <th>Horário</th>
                      <th>Aluno</th>
                      <th>Instrutor</th>
                      <th>Veículo</th>
                      <th>Ações</th>
                    </tr>
                  </thead>

                  <tbody>
                    {agendamentos.map((agendamento) => (
                      <tr key={agendamento.id}>
                        <td>{agendamento.horario}</td>
                        <td>{agendamento.aluno.nome}</td>
                        <td>{agendamento.instrutor.nome}</td>
                        <td>{agendamento.veiculo}</td>

                        <td>
                          <button
                            className="botao botao-perigo botao-pequeno"
                            type="button"
                            onClick={() => handleCancelar(agendamento)}
                          >
                            Cancelar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default Agendamentos;
