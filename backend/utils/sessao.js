const crypto = require("crypto");

const NOME_COOKIE = "sid";
const DURACAO_SESSAO_MS = 12 * 60 * 60 * 1000; // 12 horas

// Gera um token aleatório de 32 bytes (256 bits)
function gerarToken() {
  return crypto.randomBytes(32).toString("hex");
}

// No banco guardamos apenas o hash do token.
// Se o banco vazar, ninguém consegue usar as sessões.
function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Converte o cabeçalho Cookie em um objeto simples
function lerCookies(cabecalho) {
  const cookies = {};

  if (!cabecalho) {
    return cookies;
  }

  for (const parte of cabecalho.split(";")) {
    const separador = parte.indexOf("=");

    if (separador === -1) {
      continue;
    }

    const nome = parte.slice(0, separador).trim();
    const valor = parte.slice(separador + 1).trim();

    if (nome) {
      cookies[nome] = decodeURIComponent(valor);
    }
  }

  return cookies;
}

module.exports = {
  NOME_COOKIE,
  DURACAO_SESSAO_MS,
  gerarToken,
  hashToken,
  lerCookies,
};
