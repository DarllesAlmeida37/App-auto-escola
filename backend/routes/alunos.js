const express = require("express");

const router = express.Router();

const alunos = [];

router.get("/", (req, res) => {
  res.json(alunos);
});

router.post("/", (req, res) => {
  const { nome, cpf, telefone } = req.body;

  if (!nome || nome.trim() === "") {
    return res.status(400).json({
      mensagem: "Informe o nome do aluno.",
    });
  }

  if (!cpf || cpf.trim() === "") {
    return res.status(400).json({
      mensagem: "Informe o CPF do aluno.",
    });
  }

  if (!telefone || telefone.trim() === "") {
    return res.status(400).json({
      mensagem: "Informe o telefone do aluno.",
    });
  }

  const cpfJaExiste = alunos.some((aluno) => aluno.cpf === cpf);

  if (cpfJaExiste) {
    return res.status(409).json({
      mensagem: "Já existe um aluno cadastrado com esse CPF.",
    });
  }

  const novoAluno = {
    nome,
    cpf,
    telefone,
  };

  alunos.push(novoAluno);

  res.status(201).json({
    mensagem: "Aluno cadastrado com sucesso!",
    aluno: novoAluno,
  });
});

module.exports = router;
