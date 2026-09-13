import { useEffect, useState } from "react";
import { apiAgendamentos, apiInstrutores } from "../services/api";
import TabelaHorarios from "../components/TabelaHorarios";
import { formatarData, hojeISO } from "../utils/datas";

// Página inicial: aulas agendadas de HOJE, uma tabela por instrutor.
// Horários ocupados aparecem em verde claro com o nome do aluno.
function Dashboard() {
  const [instrutores, setInstrutores] = useState([]);
  const [agendamentos, setAgendamentos] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [mensagem, setMensagem] = useState("");

  const hoje = hojeISO();

  useEffect(() => {
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
      } catch (erro) {
        setMensagem(erro.message);
      }
    }

    carregar();
  }, [hoje]);

  return (
    <div>
      <h2>Início</h2>

      <p className="texto-ajuda" style={{ textAlign: "center" }}>
        Aulas agendadas de hoje, {formatarData(hoje)}.
      </p>

      {mensagem && <p className="mensagem erro">{mensagem}</p>}

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
        instrutores.map((instrutor) => (
          <div className="cartao" key={instrutor.id}>
            <h3>{instrutor.nome}</h3>

            <TabelaHorarios
              horarios={horarios}
              agendamentos={agendamentos}
              instrutorId={instrutor.id}
            />
          </div>
        ))
      )}
    </div>
  );
}

export default Dashboard;
