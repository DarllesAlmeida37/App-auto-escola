// Grade de horários do dia.
//
// - Verde claro: horário já ocupado (instrutor ou aluno).
// - Azul: horário selecionado pelo usuário.
// - Branco: horário livre.
//
// Modos:
//   selecionavel  → clicar alterna a seleção (máx. 5, controlado pela página)
//   mostrarCancelar → ocupados ganham botão de cancelar aula
function TabelaHorarios({
  horarios,
  agendamentos,
  instrutorId = null,
  alunoId = null,
  selecionavel = false,
  selecionados = [],
  onAlternar = null,
  mostrarCancelar = false,
  onCancelar = null,
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

          let classe = "slot slot-livre";

          if (selecionado) {
            classe = "slot slot-selecionado";
          } else if (indisponivel) {
            classe = "slot slot-ocupado";
          }

          function handleClick() {
            if (selecionavel && !indisponivel && onAlternar) {
              onAlternar(item.inicio);
            }
          }

          return (
            <button
              type="button"
              key={item.inicio}
              className={classe}
              onClick={handleClick}
              disabled={!selecionavel}
              title={indisponivel ? "Horário ocupado" : "Clique para selecionar"}
            >
              <strong>
                {item.inicio} – {item.fim}
              </strong>

              {ocupadoPeloAluno && (
                <span className="slot-detalhe">
                  Aluno ocupado: {ocupadoPeloAluno.aluno.nome}
                </span>
              )}

              {ocupados.map((agendamento) => (
                <span className="slot-detalhe" key={agendamento.id}>
                  {agendamento.aluno.nome} · {agendamento.instrutor.nome} ·{" "}
                  {agendamento.veiculo}
                  {mostrarCancelar && onCancelar && (
                    <button
                      type="button"
                      className="botao botao-perigo botao-pequeno"
                      onClick={(evento) => {
                        evento.stopPropagation();
                        onCancelar(agendamento);
                      }}
                    >
                      Cancelar
                    </button>
                  )}
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
