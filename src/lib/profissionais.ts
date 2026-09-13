import { google } from "googleapis";
import { parseData } from "./parse";

export const MESES_NF = [
  "JAN", "FEV", "MAR", "ABR", "MAI", "JUN",
  "JUL", "AGO", "SET", "OUT", "NOV", "DEZ",
] as const;

export interface Profissional {
  /** linha real na planilha, usada para gravar */
  linha: number;
  unidade: string;
  nome: string;
  apelido: string;
  funcao: string;
  relacao: string;
  status: string;
  dataInicio: string | null;
  contrato: boolean;
  dataContrato: string | null;
  pastaParceiro: string;
  obs: string;
  /** data da ultima alteracao feita pelo painel */
  atualizacao: string | null;
  /** uma posicao por mes, de janeiro a dezembro */
  notas: boolean[];
}

export type SituacaoContrato = "assinado" | "semData" | "solicitado" | "ausente";

/**
 * Sem contrato ja e ruim; sem contrato depois de solicitado e pior, porque
 * significa que alguem foi cobrado e nao respondeu. A diferenca sai da coluna
 * obs, que e onde a gestora anota o andamento.
 */
export function situacaoContrato(pessoa: Profissional): SituacaoContrato {
  if (pessoa.contrato) return pessoa.dataContrato ? "assinado" : "semData";

  const obs = pessoa.obs
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const cobrado = ["solicit", "envi", "aguard", "cobrad", "pendente", "reenvi"].some(
    (marca) => obs.includes(marca)
  );

  return cobrado ? "solicitado" : "ausente";
}

export interface MapaColunas {
  unidade: number;
  nome: number;
  apelido: number;
  funcao: number;
  relacao: number;
  status: number;
  dataInicio: number;
  contrato: number;
  dataContrato: number;
  pastaParceiro: number;
  obs: number;
  atualizacao: number;
  notas: number[];
}

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Numero da coluna para letra: 0 vira A, 26 vira AA. */
export function letraDaColuna(indice: number): string {
  let letra = "";
  let n = indice;
  while (n >= 0) {
    letra = String.fromCharCode((n % 26) + 65) + letra;
    n = Math.floor(n / 26) - 1;
  }
  return letra;
}

/**
 * O mapa das colunas vem do cabecalho, e nao de posicoes fixas.
 * A aba de profissionais tem mais de trinta colunas e ganha novas com o
 * tempo; amarrar em letra fixa quebraria na primeira insercao.
 */
export function mapearColunas(cabecalho: string[]): MapaColunas {
  const indice = new Map<string, number>();
  cabecalho.forEach((titulo, posicao) => {
    const chave = normalizar(String(titulo ?? ""));
    if (chave && !indice.has(chave)) indice.set(chave, posicao);
  });

  const achar = (...nomes: string[]): number => {
    for (const nome of nomes) {
      const posicao = indice.get(normalizar(nome));
      if (posicao !== undefined) return posicao;
    }
    return -1;
  };

  const notas = MESES_NF.map((mes) =>
    achar(`NF | ${mes}`, `NF|${mes}`, `NF ${mes}`, `nf ${mes}`)
  );

  return {
    // a unidade padronizada tem prioridade sobre a original
    unidade: achar("Unidade Corrigida", "Unidade"),
    nome: achar("Nome completo", "Nome"),
    apelido: achar("Apelido"),
    funcao: achar("Função", "Funcao"),
    relacao: achar("Forma relação profissional", "Forma relacao profissional"),
    status: achar("Status"),
    dataInicio: achar("Data Inicio", "Data Início"),
    contrato: achar("Contrato"),
    dataContrato: achar("Data Contrato"),
    pastaParceiro: achar("Pasta Parceiro"),
    obs: achar("obs", "observacao", "observação"),
    atualizacao: achar("Atualização", "Atualizacao", "Atualizado em"),
    notas,
  };
}

/** VERDADEIRO, TRUE, sim e 1 viram true. O resto vira false. */
export function parseBooleano(valor: unknown): boolean {
  if (typeof valor === "boolean") return valor;
  const texto = normalizar(String(valor ?? ""));
  return texto === "verdadeiro" || texto === "true" || texto === "sim" || texto === "1";
}

export function montarProfissional(
  linha: string[],
  mapa: MapaColunas,
  numeroDaLinha: number
): Profissional {
  const pegar = (posicao: number): string =>
    posicao >= 0 ? String(linha[posicao] ?? "").trim() : "";

  return {
    linha: numeroDaLinha,
    unidade: pegar(mapa.unidade),
    nome: pegar(mapa.nome),
    apelido: pegar(mapa.apelido),
    funcao: pegar(mapa.funcao),
    relacao: pegar(mapa.relacao),
    status: pegar(mapa.status),
    dataInicio: parseData(pegar(mapa.dataInicio)),
    contrato: mapa.contrato >= 0 ? parseBooleano(linha[mapa.contrato]) : false,
    dataContrato: parseData(pegar(mapa.dataContrato)),
    pastaParceiro: pegar(mapa.pastaParceiro),
    obs: pegar(mapa.obs),
    atualizacao: parseData(pegar(mapa.atualizacao)),
    notas: mapa.notas.map((posicao) =>
      posicao >= 0 ? parseBooleano(linha[posicao]) : false
    ),
  };
}

export type ClienteSheets = ReturnType<typeof google.sheets>;
