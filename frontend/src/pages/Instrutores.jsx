import { useEffect, useState } from "react";
import { apiInstrutores } from "../services/api";
import { apenasNumeros } from "../utils/numeros";
import { IconeLixeira } from "../components/Icones";
import ConfirmacaoModal from "../components/ConfirmacaoModal";

function Instrutores() {
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState("erro");
  const [instrutores, setInstrutores] = useState([]);
  const [confirmandoInstrutor, setConfirmandoInstrutor] = useState(null);

  function mostrar(mensagemTexto, tipo = "erro") {
    setMensagem(mensagemTexto);
    setTipoMensagem(tipo);

    setTimeout(() => {
      setMensagem("");
    }, 3000);
  }

  async function buscarInstrutores() {
    try {
      const dados = await apiInstrutores.listar();

      setInstrutores(dados);
    } catch (erro) {
      mostrar(erro.message);
    }
  }

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        const dados = await apiInstrutores.listar();

        if (ativo) {
          setInstrutores(dados);
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

  async function handleSubmit(evento) {
    evento.preventDefault();

    if (nome.trim() === "") {
      mostrar("Informe o nome do instrutor!");
      return;
    }

    if (cpf.replace(/\D/g, "").length !== 11) {
      mostrar("Informe um CPF válido com 11 dígitos!");
      return;
    }

    try {
      const dados = await apiInstrutores.cadastrar({
        nome: nome.trim(),
        cpf: cpf.trim(),
      });

      setNome("");
      setCpf("");
      mostrar(dados.mensagem, "sucesso");

      buscarInstrutores();
    } catch (erro) {
      mostrar(erro.message);
    }
  }

  function handleDelete(instrutor) {
    setConfirmandoInstrutor(instrutor);
  }

  async function confirmarExclusao() {
    if (!confirmandoInstrutor) {
      return;
    }

    try {
      const dados = await apiInstrutores.excluir(confirmandoInstrutor.id);

      mostrar(dados.mensagem, "sucesso");
      buscarInstrutores();
    } catch (erro) {
      mostrar(erro.message);
    } finally {
      setConfirmandoInstrutor(null);
    }
  }

  return (
    <div>
      <h2>Cadastro de Instrutores</h2>

      <div className="cartao">
        <form onSubmit={handleSubmit}>
          <div className="linha-campos">
            <label className="campo">
              <span>Nome</span>
              <input
                type="text"
                value={nome}
                onChange={(evento) => setNome(evento.target.value)}
                placeholder="Nome do instrutor"
              />
            </label>

            <label className="campo">
              <span>CPF</span>
              <input
                type="text"
                inputMode="numeric"
                value={cpf}
                onChange={(evento) => setCpf(apenasNumeros(evento.target.value))}
                placeholder="Somente números"
                maxLength={11}
              />
            </label>
          </div>

          <button className="botao botao-primario" type="submit">
            Cadastrar
          </button>
        </form>

        {mensagem && <p className={`mensagem ${tipoMensagem}`}>{mensagem}</p>}
      </div>

      <h3 style={{ marginBottom: 12 }}>Instrutores Cadastrados</h3>

      {instrutores.length === 0 ? (
        <div className="cartao">
          <p className="lista-vazia">Nenhum instrutor cadastrado.</p>
        </div>
      ) : (
        <table className="tabela">
          <thead>
            <tr>
              <th>Nome</th>
              <th>CPF</th>
              <th>Ações</th>
            </tr>
          </thead>

          <tbody>
            {instrutores.map((instrutor) => (
              <tr key={instrutor.id}>
                <td>{instrutor.nome}</td>
                <td>{instrutor.cpf}</td>

                <td>
                  <button
                    className="botao-icone botao-icone-perigo"
                    type="button"
                    title="Excluir instrutor"
                    onClick={() => handleDelete(instrutor)}
                  >
                    <IconeLixeira tamanho={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <ConfirmacaoModal
        aberto={Boolean(confirmandoInstrutor)}
        titulo="Excluir instrutor"
        mensagem={
          confirmandoInstrutor
            ? `Excluir o instrutor ${confirmandoInstrutor.nome}? As aulas agendadas dele também serão removidas.`
            : ""
        }
        onConfirmar={confirmarExclusao}
        onCancelar={() => setConfirmandoInstrutor(null)}
      />
    </div>
  );
}

export default Instrutores;
