/**
 * Interpreta a coluna "Controle de Status" da aba BContasFixas.
 *
 * O texto e livre e varia ("Agendado (Confirmado Alan)", "Agendado (Aguard.
 * Alan)", "Aprovado"), entao a classificacao e por palavra-chave e nao por
 * valor exato. Assim uma grafia nova nao quebra a tela: cai em "outro" e
 * aparece com o texto original.
 */
export type ChaveStatus =
  | "aprovado"
  | "confirmado"
  | "aguardando"
  | "semStatus"
  | "outro";

export interface StatusControle {
  chave: ChaveStatus;
  rotulo: string;
  /** texto original da planilha */
  original: string;
}

export const ORDEM_STATUS: ChaveStatus[] = [
  "aguardando",
  "semStatus",
  "confirmado",
  "aprovado",
  "outro",
];

export const ROTULO_STATUS: Record<ChaveStatus, string> = {
  aguardando: "Aguardando aprovação",
  semStatus: "Sem status",
  confirmado: "Agendado e confirmado",
  aprovado: "Aprovado",
  outro: "Outro",
};

export const DESCRICAO_STATUS: Record<ChaveStatus, string> = {
  aguardando: "A gestora agendou e está esperando a aprovação.",
  semStatus: "Ninguém preencheu o Controle de Status na planilha.",
  confirmado: "Agendamento feito e confirmado.",
  aprovado: "Já resolvido.",
  outro: "Texto que não se encaixa nos padrões conhecidos.",
};

export const COR_STATUS: Record<ChaveStatus, string> = {
  aguardando: "border-atencao",
  semStatus: "border-risco",
  confirmado: "border-aco",
  aprovado: "border-folga",
  outro: "border-grafite",
};

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function classificarControle(valor: string | undefined | null): StatusControle {
  const original = String(valor ?? "").trim();
  const texto = normalizar(original);

  if (!texto) return { chave: "semStatus", rotulo: ROTULO_STATUS.semStatus, original };

  const agendado = texto.includes("agendad");

  if (agendado && (texto.includes("aguard") || texto.includes("pendente"))) {
    return { chave: "aguardando", rotulo: ROTULO_STATUS.aguardando, original };
  }
  if (agendado && texto.includes("confirm")) {
    return { chave: "confirmado", rotulo: ROTULO_STATUS.confirmado, original };
  }
  if (texto.includes("aprovad")) {
    return { chave: "aprovado", rotulo: ROTULO_STATUS.aprovado, original };
  }
  // agendado sem detalhe entra como confirmado, que e o caso mais comum
  if (agendado) {
    return { chave: "confirmado", rotulo: ROTULO_STATUS.confirmado, original };
  }
  if (texto.includes("aguard")) {
    return { chave: "aguardando", rotulo: ROTULO_STATUS.aguardando, original };
  }

  return { chave: "outro", rotulo: original, original };
}
