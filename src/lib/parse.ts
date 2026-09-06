/** Converte "R$ 1.860,00" ou "1860.5" em numero. Vazio vira 0. */
export function parseMoeda(valor: unknown): number {
  if (typeof valor === "number") return valor;
  if (valor === null || valor === undefined) return 0;
  const texto = String(valor).trim();
  if (!texto) return 0;

  const negativo = texto.includes("(") || texto.trim().startsWith("-");
  const limpo = texto.replace(/[^\d,.]/g, "");
  if (!limpo) return 0;

  const temVirgula = limpo.includes(",");
  const temPonto = limpo.includes(".");

  let normalizado = limpo;
  if (temVirgula && temPonto) {
    normalizado = limpo.replace(/\./g, "").replace(",", ".");
  } else if (temVirgula) {
    normalizado = limpo.replace(",", ".");
  }

  const numero = Number(normalizado);
  if (!Number.isFinite(numero)) return 0;
  return negativo ? -numero : numero;
}

/** Aceita "02/01/2026", "02/01/2026 (sex)" e "2026-01-02". Devolve AAAA-MM-DD. */
export function parseData(valor: unknown): string | null {
  if (valor === null || valor === undefined) return null;
  const texto = String(valor).trim();
  if (!texto) return null;

  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const br = texto.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (br) {
    const dia = br[1].padStart(2, "0");
    const mes = br[2].padStart(2, "0");
    let ano = br[3];
    if (ano.length === 2) ano = `20${ano}`;
    return `${ano}-${mes}-${dia}`;
  }

  return null;
}

const DIAS = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];

export const ROTULO_DIA = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

export const ROTULO_DIA_CURTO = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function semAcento(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/** "segunda-feira" ou "seg" viram 1. Null se nao reconhecer. */
export function parseDiaSemana(valor: unknown): number | null {
  if (valor === null || valor === undefined) return null;
  const texto = semAcento(String(valor).trim());
  if (!texto) return null;
  const indice = DIAS.findIndex((dia) => texto.startsWith(dia.slice(0, 3)));
  return indice >= 0 ? indice : null;
}

/** Dia da semana a partir de AAAA-MM-DD, sem depender de fuso local. */
export function diaSemanaDaData(data: string): number {
  const [ano, mes, dia] = data.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay();
}

export function somarDias(data: string, dias: number): string {
  const [ano, mes, dia] = data.split("-").map(Number);
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export function diferencaEmDias(de: string, ate: string): number {
  const [a1, m1, d1] = de.split("-").map(Number);
  const [a2, m2, d2] = ate.split("-").map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86400000);
}

/** Datas de inicio ate fim, inclusive. */
export function intervaloDeDatas(inicio: string, fim: string): string[] {
  const datas: string[] = [];
  let atual = inicio;
  let limite = 0;
  while (atual <= fim && limite < 400) {
    datas.push(atual);
    atual = somarDias(atual, 1);
    limite += 1;
  }
  return datas;
}

export function hojeEmSaoPaulo(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function fimDoMes(data: string): string {
  const [ano, mes] = data.split("-").map(Number);
  const ultimo = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  return `${ano}-${String(mes).padStart(2, "0")}-${String(ultimo).padStart(2, "0")}`;
}

export function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

/** Versao compacta para caber na tela do celular: R$ 12,4 mil */
export function formatarMoedaCurta(valor: number): string {
  const absoluto = Math.abs(valor);
  if (absoluto >= 1000) {
    const sinal = valor < 0 ? "-" : "";
    return `${sinal}R$ ${(absoluto / 1000).toLocaleString("pt-BR", {
      maximumFractionDigits: 1,
    })} mil`;
  }
  return formatarMoeda(valor);
}

export function formatarDataCurta(data: string): string {
  const [, mes, dia] = data.split("-");
  return `${dia}/${mes}`;
}

export function slugDaUnidade(unidade: string): string {
  return encodeURIComponent(unidade);
}
