const express = require("express");

const prisma = require("../prismaClient");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// Todas as rotas de veículos exigem login
router.use(requireAuth);

// Normaliza a placa: maiúscula, sem espaços/hífens
function normalizarPlaca(placa) {
  return placa.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

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

function placaValida(placa) {
  // Padrão brasileiro: 3 letras + 4 caracteres (antigo e Mercosul)
  return /^[A-Z]{3}[A-Z0-9]{4}$/.test(placa);
}

// ---------------------------------------------------------------
// Lista todos os veículos (com total de despesas de cada um)
// ---------------------------------------------------------------

router.get("/", async (req, res) => {
  try {
    const veiculos = await prisma.veiculo.findMany({
      orderBy: {
        placa: "asc",
      },
      include: {
        despesas: {
          select: {
            valor: true,
          },
        },
      },
    });

    res.json(veiculos);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensagem: "Erro ao buscar veículos.",
    });
  }
});

// ---------------------------------------------------------------
// Cadastra um veículo (placa única)
// ---------------------------------------------------------------

router.post("/", async (req, res) => {
  try {
    const { placa, cor, tipo } = req.body;

    if (!placa || typeof placa !== "string") {
      return res.status(400).json({
        mensagem: "Informe a placa do veículo.",
      });
    }

    const placaNormalizada = normalizarPlaca(placa);

    if (!placaValida(placaNormalizada)) {
      return res.status(400).json({
        mensagem:
          "Placa inválida. Use 3 letras seguidas de 4 caracteres (ex.: ABC1D23).",
      });
    }

    if (!cor || cor.trim() === "") {
      return res.status(400).json({
        mensagem: "Informe a cor do veículo.",
      });
    }

    if (tipo !== "CARRO" && tipo !== "MOTO") {
      return res.status(400).json({
        mensagem: "Tipo de veículo inválido.",
      });
    }

    const placaJaExiste = await prisma.veiculo.findUnique({
      where: {
        placa: placaNormalizada,
      },
    });

    if (placaJaExiste) {
      return res.status(409).json({
        mensagem: "Já existe um veículo cadastrado com essa placa.",
      });
    }

    const novoVeiculo = await prisma.veiculo.create({
      data: {
        placa: placaNormalizada,
        cor: cor.trim().toUpperCase(),
        tipo,
      },
    });

    res.status(201).json({
      mensagem: "Veículo cadastrado com sucesso!",
      veiculo: novoVeiculo,
    });
  } catch (error) {
    console.error(error);

    // Proteção contra cadastro simultâneo da mesma placa
    if (error.code === "P2002") {
      return res.status(409).json({
        mensagem: "Já existe um veículo cadastrado com essa placa.",
      });
    }

    res.status(500).json({
      mensagem: "Erro ao cadastrar veículo.",
    });
  }
});

// ---------------------------------------------------------------
// Exclui uma despesa específica (usada também pelo Financeiro)
// ---------------------------------------------------------------

router.delete("/despesas/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        mensagem: "ID da despesa inválido.",
      });
    }

    const despesa = await prisma.despesa.findUnique({
      where: { id },
    });

    if (!despesa) {
      return res.status(404).json({
        mensagem: "Despesa não encontrada.",
      });
    }

    await prisma.despesa.delete({
      where: { id },
    });

    res.json({
      mensagem: "Despesa excluída com sucesso!",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensagem: "Erro ao excluir a despesa.",
    });
  }
});

// ---------------------------------------------------------------
// Exclui o veículo e todas as despesas dele (CASCADE)
// ---------------------------------------------------------------

router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        mensagem: "ID do veículo inválido.",
      });
    }

    const veiculo = await prisma.veiculo.findUnique({
      where: {
        id,
      },
    });

    if (!veiculo) {
      return res.status(404).json({
        mensagem: "Veículo não encontrado.",
      });
    }

    await prisma.veiculo.delete({
      where: {
        id,
      },
    });

    res.json({
      mensagem: "Veículo excluído com sucesso!",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensagem: "Erro ao excluir veículo.",
    });
  }
});

// ---------------------------------------------------------------
// Despesas de um veículo
// ---------------------------------------------------------------

// Lista despesas do veículo com filtro opcional de mês (MM) e ano (AAAA)
router.get("/:id/despesas", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        mensagem: "ID do veículo inválido.",
      });
    }

    const veiculo = await prisma.veiculo.findUnique({
      where: {
        id,
      },
    });

    if (!veiculo) {
      return res.status(404).json({
        mensagem: "Veículo não encontrado.",
      });
    }

    const filtro = {
      veiculoId: id,
    };

    // Filtro por mês/ano (AAA-MM-DD no campo DATE)
    if (req.query.mes && req.query.ano) {
      const mes = Number(req.query.mes);
      const ano = Number(req.query.ano);

      if (
        !Number.isInteger(mes) ||
        mes < 1 ||
        mes > 12 ||
        !Number.isInteger(ano) ||
        ano < 2000 ||
        ano > 2100
      ) {
        return res.status(400).json({
          mensagem: "Mês ou ano inválidos.",
        });
      }

      const inicio = new Date(`${ano}-${String(mes).padStart(2, "0")}-01T00:00:00.000Z`);
      const fimMes = mes === 12 ? 1 : mes + 1;
      const fimAno = mes === 12 ? ano + 1 : ano;
      const fim = new Date(`${fimAno}-${String(fimMes).padStart(2, "0")}-01T00:00:00.000Z`);

      filtro.data = {
        gte: inicio,
        lt: fim,
      };
    }

    const despesas = await prisma.despesa.findMany({
      where: filtro,
      orderBy: {
        data: "desc",
      },
    });

    res.json(despesas);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensagem: "Erro ao buscar despesas.",
    });
  }
});

// Cadastra uma despesa no veículo
router.post("/:id/despesas", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        mensagem: "ID do veículo inválido.",
      });
    }

    const { valor, descricao, data } = req.body;

    const valorNumero = parseValor(valor);

    if (!Number.isFinite(valorNumero) || valorNumero <= 0) {
      return res.status(400).json({
        mensagem: "Informe um valor válido para a despesa.",
      });
    }

    if (!descricao || descricao.trim() === "") {
      return res.status(400).json({
        mensagem: "Informe a descrição da despesa.",
      });
    }

    if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      return res.status(400).json({
        mensagem: "Informe a data no formato AAAA-MM-DD.",
      });
    }

    const veiculo = await prisma.veiculo.findUnique({
      where: {
        id,
      },
    });

    if (!veiculo) {
      return res.status(404).json({
        mensagem: "Veículo não encontrado.",
      });
    }

    const novaDespesa = await prisma.despesa.create({
      data: {
        valor: valorNumero,
        descricao: descricao.trim(),
        data: new Date(`${data}T00:00:00.000Z`),
        veiculoId: id,
      },
    });

    res.status(201).json({
      mensagem: "Despesa registrada com sucesso!",
      despesa: novaDespesa,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensagem: "Erro ao registrar despesa.",
    });
  }
});

module.exports = router;
