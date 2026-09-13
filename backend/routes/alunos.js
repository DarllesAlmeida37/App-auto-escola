const express = require("express");

const prisma = require("../prismaClient");
const { requireAuth } = require("../middleware/auth");
const { gerarPdfAulas } = require("../services/pdf");

const router = express.Router();

// Todas as rotas de alunos exigem login
router.use(requireAuth);

// Somente números, com 11 dígitos (CPF brasileiro)
function normalizarCpf(cpf) {
  return cpf.replace(/\D/g, "");
}

function cpfValido(cpf) {
  return /^\d{11}$/.test(cpf);
}

router.get("/", async (req, res) => {
  try {
    const alunos = await prisma.aluno.findMany({
      orderBy: {
        nome: "asc",
      },
    });

    res.json(alunos);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensagem: "Erro ao buscar alunos.",
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const { nome, cpf, telefone } = req.body;

    if (!nome || nome.trim() === "") {
      return res.status(400).json({
        mensagem: "Informe o nome do aluno.",
      });
    }

    if (!cpf || !cpfValido(normalizarCpf(cpf))) {
      return res.status(400).json({
        mensagem: "Informe um CPF válido com 11 dígitos.",
      });
    }

    if (!telefone || telefone.trim() === "") {
      return res.status(400).json({
        mensagem: "Informe o telefone do aluno.",
      });
    }

    const cpfNormalizado = normalizarCpf(cpf);

    const cpfJaExiste = await prisma.aluno.findUnique({
      where: {
        cpf: cpfNormalizado,
      },
    });

    if (cpfJaExiste) {
      return res.status(409).json({
        mensagem: "Já existe um aluno cadastrado com esse CPF.",
      });
    }

    const novoAluno = await prisma.aluno.create({
      data: {
        nome: nome.trim(),
        cpf: cpfNormalizado,
        telefone: telefone.trim(),
      },
    });

    res.status(201).json({
      mensagem: "Aluno cadastrado com sucesso!",
      aluno: novoAluno,
    });
  } catch (error) {
    console.error(error);

    // Proteção contra cadastro simultâneo do mesmo CPF
    if (error.code === "P2002") {
      return res.status(409).json({
        mensagem: "Já existe um aluno cadastrado com esse CPF.",
      });
    }

    res.status(500).json({
      mensagem: "Erro ao cadastrar aluno.",
    });
  }
});

// PDF com as aulas agendadas do aluno
router.get("/:id/aulas/pdf", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        mensagem: "ID do aluno inválido.",
      });
    }

    const aluno = await prisma.aluno.findUnique({
      where: {
        id,
      },
    });

    if (!aluno) {
      return res.status(404).json({
        mensagem: "Aluno não encontrado.",
      });
    }

    const aulas = await prisma.agendamento.findMany({
      where: {
        alunoId: id,
      },
      include: {
        instrutor: true,
      },
      orderBy: [{ data: "asc" }, { horario: "asc" }],
    });

    const pdf = await gerarPdfAulas(aluno, aulas);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="aulas-${aluno.nome.replace(/\s+/g, "-")}.pdf"`,
    );

    res.send(pdf);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensagem: "Erro ao gerar o PDF das aulas.",
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        mensagem: "ID do aluno inválido.",
      });
    }

    const aluno = await prisma.aluno.findUnique({
      where: {
        id,
      },
    });

    if (!aluno) {
      return res.status(404).json({
        mensagem: "Aluno não encontrado.",
      });
    }

    // Os agendamentos do aluno são removidos junto (ON DELETE CASCADE)
    await prisma.aluno.delete({
      where: {
        id,
      },
    });

    res.json({
      mensagem: "Aluno excluído com sucesso!",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensagem: "Erro ao excluir aluno.",
    });
  }
});

module.exports = router;
