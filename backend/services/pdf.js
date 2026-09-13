const PDFDocument = require("pdfkit");

// Converte "2026-09-14" em "14/09/2026"
function formatarData(dataISO) {
  if (!dataISO) {
    return "";
  }

  const data = new Date(dataISO);

  if (Number.isNaN(data.getTime())) {
    return "";
  }

  const dia = String(data.getUTCDate()).padStart(2, "0");
  const mes = String(data.getUTCMonth() + 1).padStart(2, "0");
  const ano = data.getUTCFullYear();

  return `${dia}/${mes}/${ano}`;
}

// Gera o PDF com o resumo das aulas agendadas do aluno
function gerarPdfAulas(aluno, aulas) {
  return new Promise((resolve, reject) => {
    const documento = new PDFDocument({
      size: "A4",
      margin: 50,
      info: {
        Title: `Aulas agendadas - ${aluno.nome}`,
        Author: "Auto Escola",
      },
    });

    const pedacos = [];

    documento.on("data", (pedaco) => pedacos.push(pedaco));
    documento.on("end", () => resolve(Buffer.concat(pedacos)));
    documento.on("error", reject);

    // Cabeçalho
    documento.fontSize(20).font("Helvetica-Bold").text("AUTO ESCOLA", {
      align: "center",
    });

    documento
      .moveDown(0.4)
      .fontSize(13)
      .font("Helvetica")
      .text("Resumo das aulas agendadas", {
        align: "center",
      });

    documento.moveDown(1.2);

    // Dados do aluno
    documento
      .fontSize(11)
      .font("Helvetica-Bold")
      .text("Aluno: ", { continued: true })
      .font("Helvetica")
      .text(aluno.nome);

    documento
      .font("Helvetica-Bold")
      .text("CPF: ", { continued: true })
      .font("Helvetica")
      .text(aluno.cpf);

    documento
      .font("Helvetica-Bold")
      .text("Telefone: ", { continued: true })
      .font("Helvetica")
      .text(aluno.telefone);

    documento.moveDown(1.5);

    // Título da tabela
    documento
      .fontSize(12)
      .font("Helvetica-Bold")
      .text(`Aulas agendadas (${aulas.length})`);

    documento.moveDown(0.5);

    const inicioX = 50;
    const colunas = {
      data: 50,
      horario: 150,
      veiculo: 250,
      instrutor: 330,
    };

    const topoY = documento.y;

    // Cabeçalho da tabela
    documento.fontSize(10).font("Helvetica-Bold");

    documento.text("Data", colunas.data, topoY);
    documento.text("Horário", colunas.horario, topoY);
    documento.text("Veículo", colunas.veiculo, topoY);
    documento.text("Instrutor", colunas.instrutor, topoY);

    documento
      .moveTo(inicioX, documento.y + 2)
      .lineTo(545, documento.y + 2)
      .strokeColor("#999999")
      .lineWidth(1)
      .stroke();

    documento.moveDown(0.8);

    // Linhas da tabela
    documento.font("Helvetica");

    if (aulas.length === 0) {
      documento.text("Nenhuma aula agendada.", inicioX, documento.y);
    }

    for (const aula of aulas) {
      documento.text(formatarData(aula.data), colunas.data, documento.y);
      documento.text(aula.horario, colunas.horario, documento.y);
      documento.text(aula.veiculo, colunas.veiculo, documento.y);
      documento.text(aula.instrutor.nome, colunas.instrutor, documento.y);

      documento.moveDown(1);
    }

    documento.end();
  });
}

module.exports = {
  gerarPdfAulas,
};
