import { useState } from "react";

function Alunos() {
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [alunos, setAlunos] = useState([]);

  function handleSubmit(evento) {
    evento.preventDefault();

    if (nome.trim() === "") {
      setMensagem("Informe o nome do aluno!");
      return;
    }
    if (cpf.trim() === "") {
      setMensagem("Informe do CPF do aluno!");
      return;
    }
    if (telefone.trim() === "") {
      setMensagem("Informe o telefone do aluno!");
      return;
    }

    //

    const cpfJaExiste = alunos.some((aluno) => aluno.cpf === cpf);
    if (cpfJaExiste) {
      setMensagem("Já existe um aluno cadastrado com esse CPF!");
      return;
    }

    const novoAluno = {
      nome,
      cpf,
      telefone,
    };

    setAlunos([...alunos, novoAluno]);

    setNome("");
    setCpf("");
    setTelefone("");

    setMensagem("Aluno cadastrado com sucesso!");
    setTimeout(() => {
      // função "setTimeout" serve para colocar tempo em uma ação ou evento.
      setMensagem("");
    }, 2000);
  }
  function handleDelete(cpf) {
    const exculirAluno = alunos.filter((aluno) => aluno.cpf !== cpf);
    setAlunos(exculirAluno);
  }
  return (
    <div>
      <h2>Cadastro de Alunos</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Nome</label>
          <input
            type="text"
            value={nome}
            onChange={(evento) => setNome(evento.target.value)}
          />
        </div>
        <div>
          <label>CPF</label>
          <input
            type="text"
            value={cpf}
            onChange={(evento) => setCpf(evento.target.value)}
          />
        </div>
        <div>
          <label>Telefone</label>
          <input
            type="text"
            value={telefone}
            onChange={(evento) => setTelefone(evento.target.value)}
          />
        </div>
        <button type="submit">Cadastrar aluno</button>
        <p>{mensagem}</p>
      </form>
      <h3>Alunos Cadastrados</h3>
      <ul>
        {alunos.map((aluno) => (
          <li key={aluno.cpf}>
            {aluno.nome} - {aluno.cpf} - {aluno.telefone}
            <button onClick={() => handleDelete(aluno.cpf)}>Excluir</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Alunos;
