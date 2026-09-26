import { useEffect, useState } from "react";
import { apiAgendamentos, apiInstrutores } from "../services/api";
import TabelaHorarios from "../components/TabelaHorarios";
import ConfirmacaoModal from "../components/ConfirmacaoModal";
import { IconeLixeira } from "../components/Icones";
import { formatarData, hojeISO } from "../utils/datas";

// Página inicial: aulas agendadas de HOJE, uma tabela por instrutor.
// Horários ocupados aparecem em verde claro com o nome do aluno.
// Permite selecionar várias aulas e excluir de uma só vez.
function Dashboard() {
  const [instrutores, setInstrutores] = useState([]);
  const [agendamentos, setAgendamentos] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState("erro");

  const [selecionadosExclusao, setSelecionadosExclusao] = useState([]);
  const [confirmando, setConfirmando] = useState(false);

  const hoje = hojeISO();

  function mostrar(mensagemTexto, tipo = "erro") {
    setMensagem(mensagemTexto);
    setTipoMensagem(tipo);

    setTimeout(() => {
      setMensagem("");
    }, 3000);
  }

  async function carregar() {
    try {
      const [listaInstrutores, listaAgendamentos, dadosHorarios] =
        await Promise.all([
          apiInstrutores.listar(),
          apiAgendamentos.listar({ data: hoje }),
          apiAgendamentos.horarios(hoje),
        ]);

      setInstrutores(listaInstrutores);
      setAgendamentos(listaAgendamentos);
      setHorarios(dadosHorarios.horarios);
      setSelecionadosExclusao([]);
    } catch (erro) {
      mostrar(erro.message);
    }
  }

  useEffect(() => {
    let ativo = true;

    async function carregarInicial() {
      try {
        const [listaInstrutores, listaAgendamentos, dadosHorarios] =
          await Promise.all([
            apiInstrutores.listar(),
            apiAgendamentos.listar({ data: hoje }),
            apiAgendamentos.horarios(hoje),
          ]);

        if (ativo) {
          setInstrutores(listaInstrutores);
          setAgendamentos(listaAgendamentos);
          setHorarios(dadosHorarios.horarios);
          setSelecionadosExclusao([]);
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
  }, [hoje]);

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

      await carregar();
    } catch (erro) {
      mostrar(erro.message);
    } finally {
      setConfirmando(false);
    }
  }

  return (
    <div>
      <h2>Início</h2>

      <p className="texto-ajuda" style={{ textAlign: "center" }}>
        Aulas agendadas de hoje, {formatarData(hoje)}.
      </p>

      {mensagem && <p className={`mensagem ${tipoMensagem}`}>{mensagem}</p>}

      {horarios.length === 0 ? (
        <div className="cartao">
          <p className="lista-vazia">Hoje não há aulas (domingo).</p>
        </div>
      ) : instrutores.length === 0 ? (
        <div className="cartao">
          <p className="lista-vazia">
            Nenhum instrutor cadastrado. Cadastre na aba Instrutores.
          </p>
        </div>
      ) : (
        <>
          <p className="texto-ajuda">
            Toque nas aulas (verde) para selecionar várias e depois use a
            lixeira no canto da tela para excluir.
          </p>

          {instrutores.map((instrutor) => (
            <div className="cartao" key={instrutor.id}>
              <h3>{instrutor.nome}</h3>

              <TabelaHorarios
                horarios={horarios}
                agendamentos={agendamentos}
                instrutorId={instrutor.id}
                selecionavelOcupado
                ocupadosSelecionados={selecionadosExclusao}
                onAlternarOcupado={alternarSelecao}
              />
            </div>
          ))}
        </>
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

export default Dashboard;
