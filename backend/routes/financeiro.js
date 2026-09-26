const express = require("express");

const prisma = require("../prismaClient");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// Todas as rotas do financeiro exigem login
router.use(requireAuth);

// Aceita "1500", "1500.00", "1.500,00" e "250,50"
function parseValor(valor) {
  if (typeof valor === "number") {
    return valor;
  }

  if (typeof valor !== "string") {
    return NaN;
  }

  const texto = valor.trim();

  if (texto.includes(",")) {
    return Number(texto.replace(/\./g, "").replace(",", "."));
  }

  return Number(texto);
}

// Converte "MM" e "AAAA" em intervalo de datas (UTC)
function intervaloDoMes(mes, ano) {
  const inicio = new Date(
    `${ano}-${String(mes).padStart(2, "0")}-01T00:00:00.000Z`,
  );
  const fimMes = mes === 12 ? 1 : mes + 1;
  const fimAno = mes === 12 ? ano + 1 : ano;
  const fim = new Date(
    `${fimAno}-${String(fimMes).padStart(2, "0")}-01T00:00:00.000Z`,
  );

  return { inicio, fim };
}

// ---------------------------------------------------------------
// Resumo financeiro do mês/ano: total do mês, total do ano,
// despesas do mês e totais por veículo.
// ---------------------------------------------------------------

router.get("/resumo", async (req, res) => {
  try {
    const mes = Number(req.query.mes);
    const ano = Number(req.query.ano);

    if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
      return res.status(400).json({
        mensagem: "Informe um mês válido (1 a 12).",
      });
    }

    if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) {
      return res.status(400).json({
        mensagem: "Informe um ano válido.",
      });
    }

    const { inicio, fim } = intervaloDoMes(mes, ano);

    // Despesas do mês (com veículo)
    const despesasMes = await prisma.despesa.findMany({
      where: {
        data: {
          gte: inicio,
          lt: fim,
        },
      },
      include: {
        veiculo: true,
      },
      orderBy: {
        data: "desc",
      },
    });

    const totalMes = despesasMes.reduce(
      (soma, despesa) => soma + Number(despesa.valor),
      0,
    );

    // Total do ano
    const { inicio: inicioAno } = intervaloDoMes(1, ano);
    const fimDoAno = new Date(`${ano + 1}-01-01T00:00:00.000Z`);

    const agregadoAno = await prisma.despesa.aggregate({
      _sum: {
        valor: true,
      },
      where: {
        data: {
          gte: inicioAno,
          lt: fimDoAno,
        },
      },
    });

    // Totais por veículo no mês
    const totaisPorVeiculo = new Map();

    for (const despesa of despesasMes) {
      const atual = totaisPorVeiculo.get(despesa.veiculoId) || 0;

      totaisPorVeiculo.set(despesa.veiculoId, atual + Number(despesa.valor));
    }

    const porVeiculo = [...totaisPorVeiculo.entries()]
      .map(([veiculoId, total]) => {
        const despesa = despesasMes.find((d) => d.veiculoId === veiculoId);

        return {
          veiculoId,
          placa: despesa ? despesa.veiculo.placa : "",
          tipo: despesa ? despesa.veiculo.tipo : null,
          total,
        };
      })
      .sort((a, b) => b.total - a.total);

    res.json({
      mes,
      ano,
      totalMes,
      totalAno: Number(agregadoAno._sum.valor || 0),
      quantidadeDespesasMes: despesasMes.length,
      despesas: despesasMes,
      porVeiculo,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensagem: "Erro ao montar o resumo financeiro.",
    });
  }
});

// ---------------------------------------------------------------
// Lançamentos financeiros (entradas e saídas da autoescola)
// ---------------------------------------------------------------

// Lista lançamentos com filtros opcionais de período (de/ate) e tipo
router.get("/lancamentos", async (req, res) => {
  try {
    const { de, ate, tipo } = req.query;

    const filtro = {};

    if (de || ate) {
      if (
        (de && !/^\d{4}-\d{2}-\d{2}$/.test(de)) ||
        (ate && !/^\d{4}-\d{2}-\d{2}$/.test(ate))
      ) {
        return res.status(400).json({
          mensagem: "Informe as datas no formato AAAA-MM-DD.",
        });
      }

      filtro.data = {};

      if (de) {
        filtro.data.gte = new Date(`${de}T00:00:00.000Z`);
      }

      if (ate) {
        filtro.data.lte = new Date(`${ate}T00:00:00.000Z`);
      }
    }

    if (tipo) {
      if (tipo !== "ENTRADA" && tipo !== "SAIDA") {
        return res.status(400).json({
          mensagem: "Tipo de lançamento inválido.",
        });
      }

      filtro.tipo = tipo;
    }

    const lancamentos = await prisma.lancamento.findMany({
      where: filtro,
      orderBy: [{ data: "desc" }, { criadoEm: "desc" }],
    });

    // As despesas registradas nos veículos entram como "saídas" do
    // financeiro (origem "despesa": não podem ser excluídas aqui —
    // a exclusão acontece na aba Veículos).
    const incluirDespesas = !tipo || tipo === "SAIDA";

    let despesasComoSaidas = [];

    if (incluirDespesas) {
      const filtroDespesa = {};

      if (filtro.data) {
        filtroDespesa.data = filtro.data;
      }

      const despesas = await prisma.despesa.findMany({
        where: filtroDespesa,
        include: {
          veiculo: true,
        },
        orderBy: [{ data: "desc" }, { createdAt: "desc" }],
      });

      despesasComoSaidas = despesas.map((despesa) => ({
        id: despesa.id,
        origem: "despesa",
        tipo: "SAIDA",
        valor: despesa.valor,
        descricao: `${despesa.descricao} (${despesa.veiculo ? despesa.veiculo.placa : "veículo"})`,
        data: despesa.data,
        criadoEm: despesa.createdAt,
      }));
    }

    const tudo = [...lancamentos, ...despesasComoSaidas].sort((a, b) => {
      const dataA = String(a.data);
      const dataB = String(b.data);

      if (dataA !== dataB) {
        return dataA < dataB ? 1 : -1;
      }

      return new Date(b.criadoEm) - new Date(a.criadoEm);
    });

    res.json(tudo);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensagem: "Erro ao buscar lançamentos.",
    });
  }
});

// Registra uma entrada ou saída
router.post("/lancamentos", async (req, res) => {
  try {
    const { tipo, valor, descricao, data } = req.body;

    if (tipo !== "ENTRADA" && tipo !== "SAIDA") {
      return res.status(400).json({
        mensagem: "Tipo de lançamento inválido (ENTRADA ou SAIDA).",
      });
    }

    const valorNumero = parseValor(valor);

    if (!Number.isFinite(valorNumero) || valorNumero <= 0) {
      return res.status(400).json({
        mensagem: "Informe um valor válido para o lançamento.",
      });
    }

    if (!descricao || descricao.trim() === "") {
      return res.status(400).json({
        mensagem: "Informe a descrição do lançamento.",
      });
    }

    if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      return res.status(400).json({
        mensagem: "Informe a data no formato AAAA-MM-DD.",
      });
    }

    const novoLancamento = await prisma.lancamento.create({
      data: {
        tipo,
        valor: valorNumero,
        descricao: descricao.trim(),
        data: new Date(`${data}T00:00:00.000Z`),
      },
    });

    res.status(201).json({
      mensagem: "Lançamento registrado com sucesso!",
      lancamento: novoLancamento,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensagem: "Erro ao registrar o lançamento.",
    });
  }
});

// Exclui um lançamento
router.delete("/lancamentos/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        mensagem: "ID do lançamento inválido.",
      });
    }

    const lancamento = await prisma.lancamento.findUnique({
      where: { id },
    });

    if (!lancamento) {
      return res.status(404).json({
        mensagem: "Lançamento não encontrado.",
      });
    }

    await prisma.lancamento.delete({
      where: { id },
    });

    res.json({
      mensagem: "Lançamento excluído com sucesso!",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensagem: "Erro ao excluir o lançamento.",
    });
  }
});

module.exports = router;
