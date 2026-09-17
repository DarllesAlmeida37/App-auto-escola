// Remove tudo que não for número (0-9) de um texto
export function apenasNumeros(valor) {
  return valor.replace(/\D/g, "");
}
