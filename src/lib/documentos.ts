import { acharColuna, indexarCabecalho, texto } from "./cabecalho";
import { diferencaEmDias, hojeEmSaoPaulo, parseData, parseMoeda } from "./parse";

export type SituacaoDocumento = "vencido" | "alerta" | "vigente" | "semData";

export interface DocumentoUnidade {
  unidade: string;
  documento: string;
  orgao: string;
  numero: string;
  emissao: string | null;
  vencimento: string | null;
  alertaDias: number;
  protocolo: string;
  custo: number;
  responsavel: string;
  arquivo: string;
  obs: string;
  situacao: SituacaoDocumento;
  /** negativo quando ja venceu */
  diasRestantes: number | null;
}

const ALERTA_PADRAO = 60;

export function lerDocumentosDasLinhas(linhas: string[][]): DocumentoUnidade[] {
  if (linhas.length === 0) return [];

  const indice = indexarCabecalho(linhas[0]);
  const col = {
    unidade: acharColuna(indice, "Unidade Corrigida", "unidade"),
    documento: acharColuna(indice, "documento"),
    orgao: acharColuna(indice, "órgão", "orgao"),
    numero: acharColuna(indice, "número", "numero"),
    emissao: acharColuna(indice, "emissão", "emissao"),
    vencimento: acharColuna(indice, "Vencimento", "validade"),
    alerta: acharColuna(indice, "Alerta (dias)", "alerta dias", "alerta"),
    protocolo: acharColuna(indice, "Protocolo renovação", "protocolo renovacao"),
    custo: acharColuna(indice, "Custo renovação", "custo renovacao"),
    responsavel: acharColuna(indice, "Responsável", "responsavel"),
    arquivo: acharColuna(indice, "Arquivo"),
    obs: acharColuna(indice, "Obs", "observação", "observacao"),
  };

  const hoje = hojeEmSaoPaulo();

  return linhas
    .slice(1)
    .map((linha): DocumentoUnidade => {
      const vencimento = parseData(texto(linha, col.vencimento));
      const alertaBruto = Math.round(parseMoeda(texto(linha, col.alerta)));
      const alertaDias = alertaBruto > 0 ? alertaBruto : ALERTA_PADRAO;

      const diasRestantes = vencimento ? diferencaEmDias(hoje, vencimento) : null;

      let situacao: SituacaoDocumento = "semData";
      if (diasRestantes !== null) {
        if (diasRestantes < 0) situacao = "vencido";
        else if (diasRestantes <= alertaDias) situacao = "alerta";
        else situacao = "vigente";
      }

      return {
        unidade: texto(linha, col.unidade),
        documento: texto(linha, col.documento),
        orgao: texto(linha, col.orgao),
        numero: texto(linha, col.numero),
        emissao: parseData(texto(linha, col.emissao)),
        vencimento,
        alertaDias,
        protocolo: texto(linha, col.protocolo),
        custo: parseMoeda(texto(linha, col.custo)),
        responsavel: texto(linha, col.responsavel),
        arquivo: texto(linha, col.arquivo),
        obs: texto(linha, col.obs),
        situacao,
        diasRestantes,
      };
    })
    .filter((doc) => doc.unidade && doc.documento);
}

export const PESO_SITUACAO: Record<SituacaoDocumento, number> = {
  vencido: 0,
  alerta: 1,
  semData: 2,
  vigente: 3,
};
