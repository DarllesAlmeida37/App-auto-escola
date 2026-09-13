const prisma = require("../prismaClient");

const {
  NOME_COOKIE,
  DURACAO_SESSAO_MS,
  gerarToken,
  hashToken,
  lerCookies,
} = require("../utils/sessao");

// ---------------------------------------------------------------
// Sessões
// ---------------------------------------------------------------

// Cria uma sessão no banco e devolve o cookie httpOnly no cabeçalho.
// O cookie fica inacessível via JavaScript (proteção contra XSS).
async function criarSessao(res) {
  const token = gerarToken();
  const expiraEm = new Date(Date.now() + DURACAO_SESSAO_MS);

  await prisma.sessao.create({
    data: {
      tokenHash: hashToken(token),
      expiraEm,
    },
  });

  const seguro = process.env.NODE_ENV === "production" ? "; Secure" : "";

  res.setHeader(
    "Set-Cookie",
    `${NOME_COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${Math.floor(
      DURACAO_SESSAO_MS / 1000,
    )}${seguro}`,
  );
}

// Apaga a sessão do banco e limpa o cookie do navegador
async function encerrarSessao(req, res) {
  const cookies = lerCookies(req.headers.cookie);
  const token = cookies[NOME_COOKIE];

  if (token) {
    await prisma.sessao.deleteMany({
      where: {
        tokenHash: hashToken(token),
      },
    });
  }

  res.setHeader(
    "Set-Cookie",
    `${NOME_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`,
  );
}

// Exige uma sessão válida para acessar a rota
async function requireAuth(req, res, next) {
  const cookies = lerCookies(req.headers.cookie);
  const token = cookies[NOME_COOKIE];

  if (!token) {
    return res.status(401).json({
      mensagem: "Faça login para continuar.",
    });
  }

  const tokenHash = hashToken(token);
  const sessao = await prisma.sessao.findUnique({
    where: {
      tokenHash,
    },
  });

  if (!sessao || sessao.expiraEm < new Date()) {
    if (sessao) {
      await prisma.sessao.delete({
        where: {
          id: sessao.id,
        },
      });
    }

    return res.status(401).json({
      mensagem: "Sessão expirada. Faça login novamente.",
    });
  }

  req.sessao = sessao;

  next();
}

// ---------------------------------------------------------------
// Limite de tentativas de login (5 erros por minuto por IP)
// ---------------------------------------------------------------

const MAX_TENTATIVAS = 5;
const TEMPO_BLOQUEIO_MS = 60 * 1000;

const tentativas = new Map();

function obterRegistro(ip) {
  const agora = Date.now();
  const registro = tentativas.get(ip);

  // Esquece o registro se já passou do tempo de bloqueio
  if (registro && registro.bloqueadoAte <= agora) {
    tentativas.delete(ip);

    return null;
  }

  return registro;
}

function limiteLogin(req, res, next) {
  const registro = obterRegistro(req.ip);

  if (registro) {
    return res.status(429).json({
      mensagem: "Muitas tentativas de login. Aguarde um minuto.",
    });
  }

  next();
}

function registrarFalhaLogin(ip) {
  const registro = obterRegistro(ip);

  if (!registro) {
    tentativas.set(ip, {
      contagem: 1,
      bloqueadoAte: 0,
    });

    return;
  }

  registro.contagem += 1;

  if (registro.contagem >= MAX_TENTATIVAS) {
    registro.bloqueadoAte = Date.now() + TEMPO_BLOQUEIO_MS;
  }
}

function registrarSucessoLogin(ip) {
  tentativas.delete(ip);
}

module.exports = {
  criarSessao,
  encerrarSessao,
  requireAuth,
  limiteLogin,
  registrarFalhaLogin,
  registrarSucessoLogin,
};
