require("dotenv").config();

const path = require("path");
const express = require("express");
const helmet = require("helmet");

const authRoutes = require("./routes/auth");
const alunosRoutes = require("./routes/alunos");
const instrutoresRoutes = require("./routes/instrutores");
const agendamentosRoutes = require("./routes/agendamentos");
const configuracoesRoutes = require("./routes/configuracoes");

const app = express();

const PORT = process.env.PORT || 3000;

// Segurança
app.disable("x-powered-by");
app.use(helmet());

app.use(express.json({ limit: "100kb" }));

// API
app.use("/api/auth", authRoutes);
app.use("/api/alunos", alunosRoutes);
app.use("/api/instrutores", instrutoresRoutes);
app.use("/api/agendamentos", agendamentosRoutes);
app.use("/api/configuracoes", configuracoesRoutes);

app.get("/api", (req, res) => {
  res.json({
    mensagem: "API da autoescola funcionando!",
  });
});

// Em produção, o Express serve o frontend compilado pelo Vite.
// Em desenvolvimento, o Vite roda em outra porta e usa o proxy.
const distPath = path.join(__dirname, "..", "frontend", "dist");

app.use(express.static(distPath));

// Qualquer rota que não seja da API devolve o index.html (SPA)
app.use((req, res, next) => {
  if (req.method !== "GET" || req.path.startsWith("/api")) {
    return next();
  }

  res.sendFile(path.join(distPath, "index.html"), (erro) => {
    if (erro) {
      next();
    }
  });
});

// 404 para rotas da API que não existem
app.use("/api", (req, res) => {
  res.status(404).json({
    mensagem: "Rota não encontrada.",
  });
});

// Tratamento global de erros
app.use((erro, req, res, next) => {
  console.error(erro);

  res.status(500).json({
    mensagem: "Erro interno no servidor.",
  });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
