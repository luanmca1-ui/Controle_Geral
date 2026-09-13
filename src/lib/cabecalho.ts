/** Localiza colunas pelo nome do cabecalho, sem depender de letra fixa. */
export function normalizarTitulo(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function indexarCabecalho(cabecalho: string[]): Map<string, number> {
  const indice = new Map<string, number>();
  cabecalho.forEach((titulo, posicao) => {
    const chave = normalizarTitulo(String(titulo ?? ""));
    if (chave && !indice.has(chave)) indice.set(chave, posicao);
  });
  return indice;
}

export function acharColuna(indice: Map<string, number>, ...nomes: string[]): number {
  for (const nome of nomes) {
    const posicao = indice.get(normalizarTitulo(nome));
    if (posicao !== undefined) return posicao;
  }
  return -1;
}

export function texto(linha: string[], posicao: number): string {
  return posicao >= 0 ? String(linha[posicao] ?? "").trim() : "";
}
