import { IconeLixeira } from "./Icones";

// Modal de confirmação usado em todas as ações destrutivas do sistema.
function ConfirmacaoModal({
  aberto,
  titulo,
  mensagem,
  rotuloConfirmar = "Sim, excluir",
  onConfirmar,
  onCancelar,
}) {
  if (!aberto) {
    return null;
  }

  return (
    <div className="modal-fundo" onClick={onCancelar}>
      <div
        className="modal-cartao"
        role="dialog"
        aria-modal="true"
        onClick={(evento) => evento.stopPropagation()}
      >
        <div className="modal-icone">
          <IconeLixeira tamanho={28} />
        </div>

        <h3>{titulo}</h3>

        <p>{mensagem}</p>

        <div className="modal-acoes">
          <button className="botao" type="button" onClick={onCancelar}>
            Não, voltar
          </button>

          <button
            className="botao botao-perigo"
            type="button"
            onClick={onConfirmar}
          >
            {rotuloConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmacaoModal;
