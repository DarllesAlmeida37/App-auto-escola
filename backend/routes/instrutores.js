const express = require("express");

const prisma = require("../prismaClient");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// Todas as rotas de instrutores exigem login
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
    const instrutores = await prisma.instrutor.findMany({
      orderBy: {
        nome: "asc",
      },
    });

    res.json(instrutores);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensagem: "Erro ao buscar instrutores.",
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const { nome, cpf } = req.body;

    if (!nome || nome.trim() === "") {
      return res.status(400).json({
        mensagem: "Informe o nome do instrutor.",
      });
    }

    if (!cpf || !cpfValido(normalizarCpf(cpf))) {
      return res.status(400).json({
        mensagem: "Informe um CPF válido com 11 dígitos.",
      });
    }

    const cpfNormalizado = normalizarCpf(cpf);

    const cpfJaExiste = await prisma.instrutor.findUnique({
      where: {
        cpf: cpfNormalizado,
      },
    });

    if (cpfJaExiste) {
      return res.status(409).json({
        mensagem: "Já existe um instrutor cadastrado com esse CPF.",
      });
    }

    const novoInstrutor = await prisma.instrutor.create({
      data: {
        nome: nome.trim(),
        cpf: cpfNormalizado,
      },
    });

    res.status(201).json({
      mensagem: "Instrutor cadastrado com sucesso!",
      instrutor: novoInstrutor,
    });
  } catch (error) {
    console.error(error);

    // Proteção contra cadastro simultâneo do mesmo CPF
    if (error.code === "P2002") {
      return res.status(409).json({
        mensagem: "Já existe um instrutor cadastrado com esse CPF.",
      });
    }

    res.status(500).json({
      mensagem: "Erro ao cadastrar instrutor.",
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        mensagem: "ID do instrutor inválido.",
      });
    }

    const instrutor = await prisma.instrutor.findUnique({
      where: {
        id: id,
      },
    });

    if (!instrutor) {
      return res.status(404).json({
        mensagem: "Instrutor não encontrado.",
      });
    }

    await prisma.instrutor.delete({
      where: {
        id: id,
      },
    });

    res.json({
      mensagem: "Instrutor excluído com sucesso!",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensagem: "Erro ao excluir instrutor.",
    });
  }
});

module.exports = router;
