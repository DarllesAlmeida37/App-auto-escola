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

// Exclui várias aulas de uma vez (seleção múltipla)
router.post("/excluir-lote", async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        mensagem: "Informe as aulas que deseja excluir.",
      });
    }

    if (ids.length > 100) {
      return res.status(400).json({
        mensagem: "Selecione no máximo 100 aulas por vez.",
      });
    }

    const idsNumeros = ids.map(Number);

    if (idsNumeros.some((id) => !Number.isInteger(id) || id <= 0)) {
      return res.status(400).json({
        mensagem: "Lista de aulas inválida.",
      });
    }

    const resultado = await prisma.agendamento.deleteMany({
      where: {
        id: {
          in: idsNumeros,
        },
      },
    });

    res.json({
      mensagem: `${resultado.count} aula(s) excluída(s) com sucesso!`,
      quantidade: resultado.count,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensagem: "Erro ao excluir as aulas.",
    });
  }
});

// ---------------------------------------------------------------
// Agendamento em lote (múltiplas datas em uma única ação)
// ---------------------------------------------------------------

// Rate limit básico: 10 requisições por minuto por IP
const loteTentativas = new Map();

function limiteLote(req, res, next) {
  const ip = req.ip || "local";
  const agora = Date.now();
  const registro = loteTentativas.get(ip);

  if (registro && agora - registro.inicio < 60000) {
    if (registro.contagem >= 10) {
      return res.status(429).json({
        mensagem:
          "Muitas requisições de agendamento em lote. Aguarde um minuto.",
      });
    }

    registro.contagem += 1;
  } else {
    loteTentativas.set(ip, { inicio: agora, contagem: 1 });
  }

  next();
}

// Converte "AAAA-MM-DD" para a data de hoje (fuso local do servidor)
function hojeLocalISO() {
  const hoje = new Date();
  const dia = String(hoje.getDate()).padStart(2, "0");
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");

  return `${hoje.getFullYear()}-${mes}-${dia}`;
}

// POST /lote — cria até 5 datas × 6 horários (30 aulas) em UMA transação.
//
// Regras aplicadas no backend (o frontend nunca é fonte confiável):
//  1. Máximo de 5 datas distintas por lote.
//  2. Máximo de 6 aulas por data.
//  3. Nenhuma data no passado; domingos fechados; horários da grade oficial.
//  4. Sem conflito de instrutor nem de aluno em cada data+horário.
//  5. Transação atômica + constraints únicas como última defesa de corrida.
//  6. Em conflito, NENHUMA aula é criada e a resposta lista exatamente
//     quais data+horário falharam (para o frontend reexibir só esses).
router.post("/lote", limiteLote, async (req, res) => {
  try {
    const { alunoId, aulas } = req.body;

    if (!Array.isArray(aulas) || aulas.length === 0 || aulas.length > 30) {
      return res.status(400).json({
        mensagem: "O lote deve conter entre 1 e 30 aulas.",
      });
    }

    const alunoIdNumero = Number(alunoId);

    if (!Number.isInteger(alunoIdNumero) || alunoIdNumero <= 0) {
      return res.status(400).json({
        mensagem: "Aluno inválido.",
      });
    }

    // Regra 1: máximo de 5 datas distintas
    const datasDistintas = new Set(aulas.map((aula) => aula.data));

    if (datasDistintas.size > 5) {
      return res.status(400).json({
        mensagem: "O lote permite no máximo 5 datas diferentes.",
      });
    }

    // Regra 2: máximo de 6 aulas por data
    const contagemPorData = {};

    for (const aula of aulas) {
      contagemPorData[aula.data] = (contagemPorData[aula.data] || 0) + 1;

      if (contagemPorData[aula.data] > 6) {
        return res.status(400).json({
          mensagem: `A data ${aula.data} tem mais de 6 horários.`,
        });
      }
    }

    // Regra 3 e validações de cada aula
    const hoje = hojeLocalISO();
    const itens = [];

    for (const aula of aulas) {
      const { data, horario, instrutorId, tipoVeiculo } = aula;

      if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
        return res.status(400).json({
          mensagem: "Informe a data no formato AAAA-MM-DD.",
        });
      }

      if (data < hoje) {
        return res.status(400).json({
          mensagem: `Não é permitido agendar no passado (${data}).`,
        });
      }

      const dataAgendamento = new Date(`${data}T00:00:00.000Z`);
      const diaSemana = dataAgendamento.getUTCDay();

      if (diaSemana === 0) {
        return res.status(400).json({
          mensagem: `Não é permitido agendar aulas aos domingos (${data}).`,
        });
      }

      const horariosPermitidos =
        diaSemana === 6 ? horariosSabado : horariosSemana;

      const slotValido = horariosPermitidos.some(
        (slot) => slot.inicio === horario,
      );

      if (!slotValido) {
        return res.status(400).json({
          mensagem: `Horário ${horario} inválido para ${data}.`,
        });
      }

      if (tipoVeiculo !== "CARRO" && tipoVeiculo !== "MOTO") {
        return res.status(400).json({
          mensagem: "Tipo de veículo inválido (use CARRO ou MOTO).",
        });
      }

      const instrutorIdNumero = Number(instrutorId);

      if (!Number.isInteger(instrutorIdNumero) || instrutorIdNumero <= 0) {
        return res.status(400).json({
          mensagem: "Instrutor inválido.",
        });
      }

      itens.push({
        data: dataAgendamento,
        dataISO: data,
        horario,
        instrutorId: instrutorIdNumero,
        tipoVeiculo,
      });
    }

    // Não permite o mesmo data+horário repetido dentro do próprio lote
    const chaves = new Set();

    for (const item of itens) {
      const chave = `${item.dataISO}|${item.horario}`;

      if (chaves.has(chave)) {
        return res.status(400).json({
          mensagem: `Horário ${item.horario} repetido em ${item.dataISO} dentro do lote.`,
        });
      }

      chaves.add(chave);
    }

    // Aluno e instrutores precisam existir
    const aluno = await prisma.aluno.findUnique({
      where: { id: alunoIdNumero },
    });

    if (!aluno) {
      return res.status(404).json({
        mensagem: "Aluno não encontrado.",
      });
    }

    const instrutorIds = [...new Set(itens.map((item) => item.instrutorId))];
    const instrutores = await prisma.instrutor.findMany({
      where: { id: { in: instrutorIds } },
    });

    if (instrutores.length !== instrutorIds.length) {
      return res.status(404).json({
        mensagem: "Um dos instrutores não foi encontrado.",
      });
    }

    // Regra 4: checagem de conflitos ANTES da gravação, para retornar
    // exatamente quais data+horário estão ocupados.
    const conflitos = [];

    for (const item of itens) {
      const conflitoInstrutor = await prisma.agendamento.findFirst({
        where: {
          instrutorId: item.instrutorId,
          data: item.data,
          horario: item.horario,
        },
      });

      if (conflitoInstrutor) {
        conflitos.push({
          data: item.dataISO,
          horario: item.horario,
          motivo: "O instrutor já possui aula nesse horário.",
        });
        continue;
      }

      const conflitoAluno = await prisma.agendamento.findFirst({
        where: {
          alunoId: alunoIdNumero,
          data: item.data,
          horario: item.horario,
        },
      });

      if (conflitoAluno) {
        conflitos.push({
          data: item.dataISO,
          horario: item.horario,
          motivo: "O aluno já possui aula nesse horário.",
        });
      }
    }

    if (conflitos.length > 0) {
      return res.status(409).json({
        mensagem:
          "Existem horários em conflito no lote. Nenhuma aula foi criada.",
        conflitos,
      });
    }

    // Regra 5: criação atômica — lote + aulas na mesma transação.
    try {
      const resultado = await prisma.$transaction(async (tx) => {
        const lote = await tx.agendamentoLote.create({
          data: { alunoId: alunoIdNumero },
        });

        const aulasCriadas = await Promise.all(
          itens.map((item) =>
            tx.agendamento.create({
              data: {
                alunoId: alunoIdNumero,
                instrutorId: item.instrutorId,
                data: item.data,
                horario: item.horario,
                veiculo: item.tipoVeiculo,
                loteId: lote.id,
              },
            }),
          ),
        );

        return { lote, aulasCriadas };
      });

      return res.status(201).json({
        mensagem: `${resultado.aulasCriadas.length} aula(s) agendada(s) em lote com sucesso!`,
        quantidade: resultado.aulasCriadas.length,
        loteId: resultado.lote.id,
      });
    } catch (erroTransacao) {
      // Violação de constraint única (condição de corrida): identifica
      // quais horários acabaram de ser ocupados e devolve a lista.
      if (erroTransacao.code === "P2002") {
        const conflitosCorrida = [];

        for (const item of itens) {
          const ocupado = await prisma.agendamento.findFirst({
            where: {
              OR: [
                {
                  instrutorId: item.instrutorId,
                  data: item.data,
                  horario: item.horario,
                },
                {
                  alunoId: alunoIdNumero,
                  data: item.data,
                  horario: item.horario,
                },
              ],
            },
          });

          if (ocupado) {
            conflitosCorrida.push({
              data: item.dataISO,
              horario: item.horario,
              motivo: "Horário acabou de ser ocupado por outro agendamento.",
            });
          }
        }

        return res.status(409).json({
          mensagem:
            "Um dos horários acabou de ser ocupado. Nenhuma aula foi criada.",
          conflitos: conflitosCorrida,
        });
      }

      throw erroTransacao;
    }
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensagem: "Erro ao realizar o agendamento em lote.",
    });
  }
});

// DELETE /lote/:id — cancela o lote INTEIRO.
// Comportamento definido: cancelar um lote remove TODAS as aulas
// vinculadas (ON DELETE CASCADE). O cancelamento individual de uma
// aula continua disponível em DELETE /:id.
router.delete("/lote/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        mensagem: "ID do lote inválido.",
      });
    }

    const lote = await prisma.agendamentoLote.findUnique({
      where: { id },
      include: {
        aulas: {
          select: { id: true },
        },
      },
    });

    if (!lote) {
      return res.status(404).json({
        mensagem: "Lote não encontrado.",
      });
    }

    await prisma.agendamentoLote.delete({
      where: { id },
    });

    res.json({
      mensagem: `Lote cancelado com sucesso! ${lote.aulas.length} aula(s) removida(s).`,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensagem: "Erro ao cancelar o lote.",
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
