const express = require("express");
const bcrypt = require("bcrypt");

const prisma = require("../prismaClient");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const CUSTO_HASH = 12;

// Todas as rotas de configurações exigem login
router.use(requireAuth);

// ---------------------------------------------------------------
// Área de Segurança: cadastra uma nova senha de acesso ao sistema.
// Para isso exige a senha do Administrador Geral.
// ---------------------------------------------------------------

router.post("/senhas", async (req, res) => {
  try {
    const { novaSenha, senhaAdmin } = req.body;

    if (typeof novaSenha !== "string" || novaSenha.length < 6) {
      return res.status(400).json({
        mensagem: "A nova senha deve ter pelo menos 6 caracteres.",
      });
    }

    if (!senhaAdmin || typeof senhaAdmin !== "string") {
      return res.status(400).json({
        mensagem: "Informe a senha do Administrador Geral.",
      });
    }

    const adminGeral = await prisma.adminGeral.findFirst();

    if (!adminGeral) {
      return res.status(409).json({
        mensagem: "A senha-mestra ainda não foi configurada.",
      });
    }

    const senhaAdminValida = await bcrypt.compare(
      senhaAdmin,
      adminGeral.senhaHash,
    );

    if (!senhaAdminValida) {
      return res.status(403).json({
        mensagem: "Senha do Administrador Geral incorreta.",
      });
    }

    const senhaHash = await bcrypt.hash(novaSenha, CUSTO_HASH);

    await prisma.senhaAcesso.create({
      data: {
        senhaHash,
      },
    });

    res.status(201).json({
      mensagem: "Nova senha de acesso cadastrada com sucesso!",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensagem: "Erro ao cadastrar a nova senha.",
    });
  }
});

module.exports = router;
