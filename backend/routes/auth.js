const express = require("express");
const bcrypt = require("bcrypt");

const prisma = require("../prismaClient");

const {
  NOME_COOKIE,
  hashToken,
  lerCookies,
} = require("../utils/sessao");

const {
  criarSessao,
  encerrarSessao,
  requireAuth,
  limiteLogin,
  registrarFalhaLogin,
  registrarSucessoLogin,
} = require("../middleware/auth");

const router = express.Router();

const CUSTO_HASH = 12;

// ---------------------------------------------------------------
// Status: informa se o sistema já foi configurado e se há sessão
// ---------------------------------------------------------------

router.get("/status", async (req, res) => {
  try {
    const quantidadeAdmin = await prisma.adminGeral.count();

    // Verifica manualmente se a sessão é válida
    const cookies = lerCookies(req.headers.cookie);
    const token = cookies[NOME_COOKIE];
    let autenticado = false;

    if (token) {
      const sessao = await prisma.sessao.findUnique({
        where: {
          tokenHash: hashToken(token),
        },
      });

      autenticado = Boolean(sessao && sessao.expiraEm >= new Date());
    }

    res.json({
      precisaSetup: quantidadeAdmin === 0,
      autenticado,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensagem: "Erro ao verificar o status do sistema.",
    });
  }
});

// ---------------------------------------------------------------
// Configuração inicial: cria a senha-mestra uma única vez.
// Também cria a primeira senha de acesso (mesma senha), para que
// o administrador consiga entrar logo depois do primeiro acesso.
// ---------------------------------------------------------------

router.post("/setup", async (req, res) => {
  try {
    const { senha } = req.body;

    if (typeof senha !== "string" || senha.length < 6) {
      return res.status(400).json({
        mensagem: "A senha deve ter pelo menos 6 caracteres.",
      });
    }

    const quantidadeAdmin = await prisma.adminGeral.count();

    if (quantidadeAdmin > 0) {
      return res.status(403).json({
        mensagem: "A senha-mestra já foi definida.",
      });
    }

    const senhaHash = await bcrypt.hash(senha, CUSTO_HASH);

    await prisma.$transaction([
      prisma.adminGeral.create({
        data: {
          senhaHash,
        },
      }),
      prisma.senhaAcesso.create({
        data: {
          senhaHash,
        },
      }),
    ]);

    res.status(201).json({
      mensagem: "Senha-mestra criada com sucesso! Agora faça login.",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensagem: "Erro ao criar a senha-mestra.",
    });
  }
});

// ---------------------------------------------------------------
// Login: o usuário é sempre "Admin"; qualquer senha cadastrada
// na área de Segurança dá acesso ao sistema.
// ---------------------------------------------------------------

router.post("/login", limiteLogin, async (req, res) => {
  try {
    const { senha } = req.body;

    if (!senha || typeof senha !== "string") {
      return res.status(400).json({
        mensagem: "Informe a senha.",
      });
    }

    const senhas = await prisma.senhaAcesso.findMany({
      select: {
        senhaHash: true,
      },
    });

    let senhaValida = false;

    for (const registro of senhas) {
      if (await bcrypt.compare(senha, registro.senhaHash)) {
        senhaValida = true;

        break;
      }
    }

    if (!senhaValida) {
      registrarFalhaLogin(req.ip);

      return res.status(401).json({
        mensagem: "Senha incorreta.",
      });
    }

    registrarSucessoLogin(req.ip);

    await criarSessao(res);

    res.json({
      mensagem: "Login realizado com sucesso!",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensagem: "Erro ao realizar o login.",
    });
  }
});

// ---------------------------------------------------------------
// Logout: revoga a sessão no banco
// ---------------------------------------------------------------

router.post("/logout", requireAuth, async (req, res) => {
  try {
    await encerrarSessao(req, res);

    res.json({
      mensagem: "Sessão encerrada com sucesso!",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensagem: "Erro ao encerrar a sessão.",
    });
  }
});

// ---------------------------------------------------------------
// Sessão atual
// ---------------------------------------------------------------

router.get("/me", requireAuth, (req, res) => {
  res.json({
    autenticado: true,
  });
});

module.exports = router;
