// Converte "2026-09-14" em "14/09/2026"
export function formatarData(dataISO) {
  if (!dataISO) {
    return "";
  }

  const [ano, mes, dia] = dataISO.slice(0, 10).split("-");

  return `${dia}/${mes}/${ano}`;
}

// Data de hoje no formato AAAA-MM-DD (fuso local)
export function hojeISO() {
  const agora = new Date();
  const dia = String(agora.getDate()).padStart(2, "0");
  const mes = String(agora.getMonth() + 1).padStart(2, "0");

  return `${agora.getFullYear()}-${mes}-${dia}`;
}

// Segunda-feira da semana de uma data (AAAA-MM-DD)
export function segundaDaSemana(dataISO) {
  const data = new Date(`${dataISO}T12:00:00`);
  const diaSemana = data.getDay(); // 0 = domingo
  const deslocamento = diaSemana === 0 ? 6 : diaSemana - 1;

  data.setDate(data.getDate() - deslocamento);

  return paraISO(data);
}

// Domingo da semana de uma data
export function domingoDaSemana(dataISO) {
  const data = new Date(`${segundaDaSemana(dataISO)}T12:00:00`);

  data.setDate(data.getDate() + 6);

  return paraISO(data);
}

// Primeiro e último dia do mês de uma data
export function intervaloDoMes(dataISO) {
  const data = new Date(`${dataISO}T12:00:00`);

  const inicio = new Date(data.getFullYear(), data.getMonth(), 1);
  const fim = new Date(data.getFullYear(), data.getMonth() + 1, 0);

  return {
    de: paraISO(inicio),
    ate: paraISO(fim),
  };
}

function paraISO(data) {
  const dia = String(data.getDate()).padStart(2, "0");
  const mes = String(data.getMonth() + 1).padStart(2, "0");

  return `${data.getFullYear()}-${mes}-${dia}`;
}

// Agrupa agendamentos por data (AAAA-MM-DD)
export function agruparPorData(agendamentos) {
  const grupos = new Map();

  for (const agendamento of agendamentos) {
    const chave = agendamento.data.slice(0, 10);

    if (!grupos.has(chave)) {
      grupos.set(chave, []);
    }

    grupos.get(chave).push(agendamento);
  }

  return [...grupos.entries()].sort(([a], [b]) => a.localeCompare(b));
}
