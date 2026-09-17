const prisma = require("../prismaClient");

const {
  NOME_COOKIE,
  DURACAO_SESSAO_MS,
  gerarToken,
  hashToken,
  lerCookies,
} = require("../utils/sessao");

// Quando a aba é fechada, a sessão entra em "fechando" com esta
// carência. Se nenhuma página viva fizer uma requisição nesse tempo,
// a sessão expira. O F5 restaura automaticamente (a página recarregada
// faz chamadas autenticadas dentro da carência).
const GRACE_FECHANDO_MS = 5 * 60 * 1000;

// ---------------------------------------------------------------
// Sessões
// ---------------------------------------------------------------

// Cria uma sessão no banco e devolve o cookie httpOnly no cabeçalho.
// O cookie fica inacessível via JavaScript (proteção contra XSS).
//
// Sem Max-Age o cookie é "de sessão": o navegador o apaga quando é
// fechado — assim, fechar o site exige novo login na próxima visita.
// A expiração de 12h continua valendo no servidor (tabela sessoes).
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
    `${NOME_COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/${seguro}`,
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

  // Uma página viva acabou de usar a sessão: desfaz o "fechando"
  // (marcado quando outra aba foi fechada) e renova a validade.
  if (sessao.fechando) {
    await prisma.sessao.update({
      where: { id: sessao.id },
      data: {
        fechando: false,
        expiraEm: new Date(Date.now() + DURACAO_SESSAO_MS),
      },
    });

    sessao.fechando = false;
    sessao.expiraEm = new Date(Date.now() + DURACAO_SESSAO_MS);
  } else {
    // Renovação deslizante: estende apenas quando falta menos de 1h
    const restante = sessao.expiraEm.getTime() - Date.now();

    if (restante < 60 * 60 * 1000) {
      await prisma.sessao.update({
        where: { id: sessao.id },
        data: {
          expiraEm: new Date(Date.now() + DURACAO_SESSAO_MS),
        },
      });
    }
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
  GRACE_FECHANDO_MS,
};
