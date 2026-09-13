import { useEffect, useState } from "react";
import { apiInstrutores } from "../services/api";

function Instrutores() {
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState("erro");
  const [instrutores, setInstrutores] = useState([]);

  function mostrar(mensagemTexto, tipo = "erro") {
    setMensagem(mensagemTexto);
    setTipoMensagem(tipo);

    setTimeout(() => {
      setMensagem("");
    }, 4000);
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

  async function handleDelete(instrutor) {
    const confirmou = window.confirm(
      `Excluir o instrutor ${instrutor.nome}? As aulas agendadas dele também serão removidas.`,
    );

    if (!confirmou) {
      return;
    }

    try {
      const dados = await apiInstrutores.excluir(instrutor.id);

      mostrar(dados.mensagem, "sucesso");
      buscarInstrutores();
    } catch (erro) {
      mostrar(erro.message);
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
              />
            </label>

            <label className="campo">
              <span>CPF</span>
              <input
                type="text"
                value={cpf}
                onChange={(evento) => setCpf(evento.target.value)}
                placeholder="Somente números"
              />
            </label>
          </div>

          <button className="botao botao-primario" type="submit">
            Cadastrar
          </button>
        </form>

        {mensagem && (
          <p className={`mensagem ${tipoMensagem}`}>{mensagem}</p>
        )}
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
                    className="botao botao-perigo botao-pequeno"
                    type="button"
                    onClick={() => handleDelete(instrutor)}
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Instrutores;
