const express = require("express");

const alunosRoutes = require("./routes/alunos");

const app = express();

const PORT = 3000;

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend da autoescola funcionando!");
});

app.use("/alunos", alunosRoutes);

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
