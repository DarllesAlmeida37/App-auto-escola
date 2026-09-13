const express = require("express");

const prisma = require("../prismaClient");

const { requireAuth } = require("../middleware/auth");

const { horariosSemana, horariosSabado } = require("../config/horarios");

const router = express.Router();

// Todas as rotas de agendamentos exigem login
router.use(requireAuth);

// Converte "AAAA-MM-DD" em Date sem deslocamento de fuso
function dataParaFiltro(valor) {
  const data = new Date(`${valor}T00:00:00.000Z`);

  return Number.isNaN(data.getTime()) ? null : data;
}

// ---------------------------------------------------------------
// Lista agendamentos com filtros opcionais:
//   data = um dia específico
//   de/ate = intervalo (semana ou mês)
//   instrutorId = apenas um instrutor
//   alunoId = apenas um aluno
// ---------------------------------------------------------------

router.get("/", async (req, res) => {
  try {
    const { data, de, ate, instrutorId, alunoId } = req.query;

    const filtro = {};

    if (data) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
        return res.status(400).json({
          mensagem: "Informe a data no formato AAAA-MM-DD.",
        });
      }

      filtro.data = dataParaFiltro(data);
    } else if (de || ate) {
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
        filtro.data.gte = dataParaFiltro(de);
      }

      if (ate) {
        filtro.data.lte = dataParaFiltro(ate);
      }
    }

    if (instrutorId) {
      const id = Number(instrutorId);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          mensagem: "Instrutor inválido.",
        });
      }

      filtro.instrutorId = id;
    }

    if (alunoId) {
      const id = Number(alunoId);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          mensagem: "Aluno inválido.",
        });
      }

      filtro.alunoId = id;
    }

    const agendamentos = await prisma.agendamento.findMany({
      where: filtro,

      include: {
        aluno: true,
        instrutor: true,
      },

      orderBy: [
        {
          data: "asc",
        },
        {
          horario: "asc",
        },
      ],
    });

    res.json(agendamentos);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensagem: "Erro ao buscar agendamentos.",
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const { alunoId, instrutorId, data, horarios, veiculo } = req.body;

    // Verifica os campos obrigatórios
    if (
      !alunoId ||
      !instrutorId ||
      !data ||
      !Array.isArray(horarios) ||
      horarios.length === 0 ||
      !veiculo
    ) {
      return res.status(400).json({
        mensagem: "Preencha todos os dados do agendamento.",
      });
    }

    // Limite máximo de 5 aulas por vez
    if (horarios.length > 5) {
      return res.status(400).json({
        mensagem: "É permitido selecionar no máximo 5 horários.",
      });
    }

    const alunoIdNumero = Number(alunoId);
    const instrutorIdNumero = Number(instrutorId);

    if (!Number.isInteger(alunoIdNumero) || alunoIdNumero <= 0) {
      return res.status(400).json({
        mensagem: "Aluno inválido.",
      });
    }

    if (!Number.isInteger(instrutorIdNumero) || instrutorIdNumero <= 0) {
      return res.status(400).json({
        mensagem: "Instrutor inválido.",
      });
    }

    if (veiculo !== "CARRO" && veiculo !== "MOTO") {
      return res.status(400).json({
        mensagem: "Tipo de veículo inválido.",
      });
    }

    // Verifica o formato da data
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      return res.status(400).json({
        mensagem: "Informe a data no formato AAAA-MM-DD.",
      });
    }

    const dataAgendamento = new Date(`${data}T00:00:00.000Z`);

    if (Number.isNaN(dataAgendamento.getTime())) {
      return res.status(400).json({
        mensagem: "Data inválida.",
      });
    }

    const diaSemana = dataAgendamento.getUTCDay();

    if (diaSemana === 0) {
      return res.status(400).json({
        mensagem: "Não é permitido agendar aulas aos domingos.",
      });
    }

    const horariosPermitidos =
      diaSemana === 6 ? horariosSabado : horariosSemana;

    // Evita que o mesmo horário seja enviado duas vezes
    const horariosSemDuplicacao = [...new Set(horarios)];

    if (horariosSemDuplicacao.length !== horarios.length) {
      return res.status(400).json({
        mensagem: "Existem horários repetidos na seleção.",
      });
    }

    // Verifica se todos os horários pertencem ao expediente
    const todosHorariosValidos = horarios.every((horario) =>
      horariosPermitidos.some((item) => item.inicio === horario),
    );

    if (!todosHorariosValidos) {
      return res.status(400).json({
        mensagem: "Um ou mais horários são inválidos para esse dia.",
      });
    }

    // Tudo abaixo será executado como uma única operação
    const novosAgendamentos = await prisma.$transaction(async (tx) => {
      const aluno = await tx.aluno.findUnique({
        where: {
          id: alunoIdNumero,
        },
      });

      if (!aluno) {
        const erro = new Error("Aluno não encontrado.");
        erro.status = 404;
        throw erro;
      }

      const instrutor = await tx.instrutor.findUnique({
        where: {
          id: instrutorIdNumero,
        },
      });

      if (!instrutor) {
        const erro = new Error("Instrutor não encontrado.");
        erro.status = 404;
        throw erro;
      }

      // Verifica se o aluno já possui alguma aula
      // em qualquer horário selecionado
      const conflitoAluno = await tx.agendamento.findFirst({
        where: {
          alunoId: alunoIdNumero,
          data: dataAgendamento,
          horario: {
            in: horarios,
          },
        },
      });

      if (conflitoAluno) {
        const erro = new Error(
          `O aluno já possui aula às ${conflitoAluno.horario}.`,
        );

        erro.status = 409;
        throw erro;
      }

      // Verifica os horários do instrutor
      const conflitoInstrutor = await tx.agendamento.findFirst({
        where: {
          instrutorId: instrutorIdNumero,
          data: dataAgendamento,
          horario: {
            in: horarios,
          },
        },
      });

      if (conflitoInstrutor) {
        const erro = new Error(
          `O instrutor já possui aula às ${conflitoInstrutor.horario}.`,
        );

        erro.status = 409;
        throw erro;
      }

      const agendamentosCriados = [];

      // Cria cada aula dentro da mesma transação
      for (const horario of horarios) {
        const agendamento = await tx.agendamento.create({
          data: {
            alunoId: alunoIdNumero,
            instrutorId: instrutorIdNumero,
            data: dataAgendamento,
            horario,
            veiculo,
          },
          include: {
            aluno: true,
            instrutor: true,
          },
        });

        agendamentosCriados.push(agendamento);
      }

      return agendamentosCriados;
    });

    return res.status(201).json({
      mensagem: `${novosAgendamentos.length} aula(s) agendada(s) com sucesso!`,
      agendamentos: novosAgendamentos,
    });
  } catch (error) {
    console.error(error);

    // Erros que nós mesmos lançamos
    if (error.status) {
      return res.status(error.status).json({
        mensagem: error.message,
      });
    }

    // Proteção adicional das constraints do Prisma/PostgreSQL
    if (error.code === "P2002") {
      return res.status(409).json({
        mensagem:
          "Um dos horários acabou de ser ocupado. Atualize os horários e tente novamente.",
      });
    }

    return res.status(500).json({
      mensagem: "Erro ao realizar agendamento.",
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        mensagem: "ID do agendamento inválido.",
      });
    }

    const agendamento = await prisma.agendamento.findUnique({
      where: {
        id: id,
      },
    });

    if (!agendamento) {
      return res.status(404).json({
        mensagem: "Agendamento não encontrado.",
      });
    }

    await prisma.agendamento.delete({
      where: {
        id: id,
      },
    });

    res.json({
      mensagem: "Agendamento cancelado com sucesso!",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensagem: "Erro ao cancelar agendamento.",
    });
  }
});

router.get("/horarios", (req, res) => {
  const { data } = req.query;

  if (!data) {
    return res.status(400).json({
      mensagem: "Informe uma data.",
    });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return res.status(400).json({
      mensagem: "Informe a data no formato AAAA-MM-DD.",
    });
  }

  const dataSelecionada = new Date(`${data}T12:00:00`);
  const diaSemana = dataSelecionada.getDay();

  if (diaSemana === 0) {
    return res.json({
      horarios: [],
      mensagem: "Não há aulas aos domingos.",
    });
  }

  if (diaSemana === 6) {
    return res.json({
      horarios: horariosSabado,
    });
  }

  res.json({
    horarios: horariosSemana,
  });
});

module.exports = router;
