import { IconeCarro, IconeMoto } from "./Icones";

// Grade de horários do dia.
//
// - Verde claro: horário já ocupado (instrutor ou aluno).
// - Azul: horário selecionado pelo usuário (modo agendar).
// - Branco: horário livre.
//
// Modos:
//   selecionavel → clicar alterna a seleção de horários livres
//                  (máx. 5, controlado pela página)
//   selecionavelOcupado → clicar em aulas ocupadas alterna a seleção
//                  múltipla (para excluir várias de uma vez)
function TabelaHorarios({
  horarios,
  agendamentos,
  instrutorId = null,
  alunoId = null,
  selecionavel = false,
  selecionados = [],
  onAlternar = null,
  selecionavelOcupado = false,
  ocupadosSelecionados = [],
  onAlternarOcupado = null,
}) {
  function ocupacoesDoHorario(inicio) {
    return agendamentos.filter(
      (agendamento) =>
        agendamento.horario === inicio &&
        (!instrutorId || agendamento.instrutorId === instrutorId),
    );
  }

  function alunoOcupado(inicio) {
    if (!alunoId) {
      return null;
    }

    return (
      agendamentos.find(
        (agendamento) =>
          agendamento.horario === inicio && agendamento.alunoId === alunoId,
      ) || null
    );
  }

  if (horarios.length === 0) {
    return <p className="lista-vazia">Não há aulas neste dia.</p>;
  }

  return (
    <div>
      {selecionavel && (
        <p className="texto-ajuda">
          Selecione até 5 horários. Os horários em verde já estão ocupados.
        </p>
      )}

      <div className="grade-horarios">
        {horarios.map((item) => {
          const ocupados = ocupacoesDoHorario(item.inicio);
          const ocupadoPeloAluno = alunoOcupado(item.inicio);
          const indisponivel = ocupados.length > 0 || Boolean(ocupadoPeloAluno);
          const selecionado = selecionados.includes(item.inicio);

          const selecionadosAqui = ocupados.filter((agendamento) =>
            ocupadosSelecionados.includes(agendamento.id),
          );

          let classe = "slot slot-livre";

          if (selecionado) {
            classe = "slot slot-selecionado";
          } else if (indisponivel) {
            classe =
              selecionadosAqui.length > 0
                ? "slot slot-ocupado slot-ocupado-selecionado"
                : "slot slot-ocupado";
          }

          function handleClick() {
            if (selecionavel && !indisponivel && onAlternar) {
              onAlternar(item.inicio);
              return;
            }

            if (selecionavelOcupado && onAlternarOcupado) {
              // Alterna a seleção de todas as aulas ocupadas deste horário
              for (const agendamento of ocupados) {
                onAlternarOcupado(agendamento);
              }
            }
          }

          return (
            <button
              type="button"
              key={item.inicio}
              className={classe}
              onClick={handleClick}
              disabled={!selecionavel && !selecionavelOcupado}
              title={
                selecionavelOcupado && indisponivel
                  ? "Toque para selecionar/desmarcar a aula"
                  : indisponivel
                    ? "Horário ocupado"
                    : "Clique para selecionar"
              }
            >
              <strong>
                {item.inicio} – {item.fim}
              </strong>

              {ocupadoPeloAluno && ocupados.length === 0 && (
                <span className="slot-detalhe">
                  Aluno ocupado: {ocupadoPeloAluno.aluno.nome}
                </span>
              )}

              {ocupados.map((agendamento) => (
                <span className="slot-detalhe" key={agendamento.id}>
                  {agendamento.aluno.nome}

                  <span className="icone-veiculo" title={agendamento.veiculo}>
                    {agendamento.veiculo === "CARRO" ? (
                      <IconeCarro tamanho={20} />
                    ) : (
                      <IconeMoto tamanho={20} />
                    )}
                  </span>
                </span>
              ))}

              {!indisponivel && !selecionado && (
                <span className="slot-detalhe">Livre</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default TabelaHorarios;
