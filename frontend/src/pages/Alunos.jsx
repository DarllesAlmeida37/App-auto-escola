import { useEffect, useState } from "react";
import { apiAgendamentos, apiAlunos } from "../services/api";
import { formatarData } from "../utils/datas";

function Alunos() {
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState("erro");
  const [alunos, setAlunos] = useState([]);
  const [mostrarLista, setMostrarLista] = useState(false);

  function mostrar(mensagemTexto, tipo = "erro") {
    setMensagem(mensagemTexto);
    setTipoMensagem(tipo);

    setTimeout(() => {
      setMensagem("");
    }, 4000);
  }

  async function buscarAlunos() {
    try {
      const dados = await apiAlunos.listar();

      setAlunos(dados);
    } catch (erro) {
      mostrar(erro.message);
    }
  }

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        const dados = await apiAlunos.listar();

        if (ativo) {
          setAlunos(dados);
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
      mostrar("Informe o nome do aluno!");
      return;
    }

    if (cpf.replace(/\D/g, "").length !== 11) {
      mostrar("Informe um CPF válido com 11 dígitos!");
      return;
    }

    if (telefone.trim() === "") {
      mostrar("Informe o telefone do aluno!");
      return;
    }

    try {
      const dados = await apiAlunos.cadastrar({
        nome: nome.trim(),
        cpf: cpf.trim(),
        telefone: telefone.trim(),
      });

      setNome("");
      setCpf("");
      setTelefone("");
      mostrar(dados.mensagem, "sucesso");

      buscarAlunos();
    } catch (erro) {
      mostrar(erro.message);
    }
  }

  async function handleDelete(aluno) {
    const confirmou = window.confirm(
      `Excluir o aluno ${aluno.nome}? As aulas agendadas dele também serão removidas.`,
    );

    if (!confirmou) {
      return;
    }

    try {
      const dados = await apiAlunos.excluir(aluno.id);

      mostrar(dados.mensagem, "sucesso");
      buscarAlunos();
    } catch (erro) {
      mostrar(erro.message);
    }
  }

  // Gera o PDF das aulas do aluno e abre o WhatsApp com um resumo pronto.
  // O PDF é anexado manualmente (o WhatsApp não permite anexar via link).
  async function handleWhatsApp(aluno) {
    try {
      const aulas = await apiAgendamentos.listar({ alunoId: aluno.id });

      if (aulas.length === 0) {
        mostrar("Este aluno não possui aulas agendadas.");
        return;
      }

      const linhas = aulas.map(
        (aula) =>
          `• ${formatarData(aula.data)} às ${aula.horario} (${aula.veiculo}) com instrutor ${aula.instrutor.nome}`,
      );

      const texto = `Olá, ${aluno.nome}! Aqui está o resumo das suas aulas na Auto Escola:\n\n${linhas.join("\n")}\n\nTotal: ${aulas.length} aula(s).`;

      // Abre o PDF (o navegador baixa/imprime) e o WhatsApp do aluno
      window.open(apiAlunos.urlPdf(aluno.id), "_blank");

      const telefoneNumeros = aluno.telefone.replace(/\D/g, "");

      window.open(
        `https://wa.me/55${telefoneNumeros}?text=${encodeURIComponent(texto)}`,
        "_blank",
      );

      mostrar("PDF gerado e WhatsApp aberto!", "sucesso");
    } catch (erro) {
      mostrar(erro.message);
    }
  }

  return (
    <div>
      <h2>Cadastro de Alunos</h2>

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

            <label className="campo">
              <span>Telefone</span>
              <input
                type="text"
                value={telefone}
                onChange={(evento) => setTelefone(evento.target.value)}
                placeholder="(99)9 99999999"
              />
            </label>
          </div>

          <button className="botao botao-primario" type="submit">
            Cadastrar
          </button>
        </form>

        {mensagem && <p className={`mensagem ${tipoMensagem}`}>{mensagem}</p>}
      </div>

      <div className="acoes-pagina">
        <button
          className="botao"
          type="button"
          onClick={() => setMostrarLista(!mostrarLista)}
        >
          {mostrarLista ? "Ocultar alunos" : "Ver alunos"}
        </button>
      </div>

      {mostrarLista &&
        (alunos.length === 0 ? (
          <div className="cartao">
            <p className="lista-vazia">Nenhum aluno cadastrado.</p>
          </div>
        ) : (
          <table className="tabela">
            <thead>
              <tr>
                <th>Nome</th>
                <th>CPF</th>
                <th>Telefone</th>
                <th>Ações</th>
              </tr>
            </thead>

            <tbody>
              {alunos.map((aluno) => (
                <tr key={aluno.id}>
                  <td>{aluno.nome}</td>
                  <td>{aluno.cpf}</td>
                  <td>{aluno.telefone}</td>

                  <td>
                    <button
                      className="botao botao-pequeno"
                      type="button"
                      onClick={() => handleWhatsApp(aluno)}
                    >
                      Baixar em PDF
                    </button>{" "}
                    <button
                      className="botao botao-perigo botao-pequeno"
                      type="button"
                      onClick={() => handleDelete(aluno)}
                    >
                      Excluir aluno
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ))}
    </div>
  );
}

export default Alunos;
