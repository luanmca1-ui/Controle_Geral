import { acharColuna, indexarCabecalho, texto } from "./cabecalho";
import { parseData, parseMoeda } from "./parse";

export interface LancamentoComissao {
  unidade: string;
  data: string;
  profissional: string;
  servico: string;
  valor: number;
  comissao: number;
  volume: number;
  percentual: number;
}

export function lerComissoesDasLinhas(linhas: string[][]): LancamentoComissao[] {
  if (linhas.length === 0) return [];

  const indice = indexarCabecalho(linhas[0]);
  const col = {
    unidade: acharColuna(indice, "Unidade Corrigida", "Unidade"),
    data: acharColuna(indice, "Atendimento/Venda", "Data"),
    profissional: acharColuna(indice, "Profissional"),
    servico: acharColuna(indice, "Serviço/Produto/Pacote", "Servico/Produto/Pacote", "Serviço"),
    valor: acharColuna(indice, "Valor"),
    comissao: acharColuna(indice, "Valor Comissão", "Valor Comissao"),
    volume: acharColuna(indice, "Vol"),
    percentual: acharColuna(indice, "%Comissão", "% Comissão", "%Comissao"),
  };

  return linhas
    .slice(1)
    .map((linha): LancamentoComissao => ({
      unidade: texto(linha, col.unidade),
      data: parseData(texto(linha, col.data)) ?? "",
      profissional: texto(linha, col.profissional),
      servico: texto(linha, col.servico),
      valor: parseMoeda(texto(linha, col.valor)),
      comissao: parseMoeda(texto(linha, col.comissao)),
      volume: Math.max(1, Math.round(parseMoeda(texto(linha, col.volume))) || 1),
      percentual: parseMoeda(texto(linha, col.percentual)),
    }))
    .filter((item) => item.unidade && item.data);
}

/** Comissao realmente apurada por unidade e dia, somando os atendimentos. */
export function comissaoPorDia(lancamentos: LancamentoComissao[]): Map<string, number> {
  const mapa = new Map<string, number>();
  for (const item of lancamentos) {
    const chave = `${item.unidade}|${item.data}`;
    mapa.set(chave, (mapa.get(chave) ?? 0) + item.comissao);
  }
  return mapa;
}

export interface DesempenhoProfissional {
  profissional: string;
  unidade: string;
  faturamento: number;
  comissao: number;
  atendimentos: number;
  ticket: number;
  percentualMedio: number;
  servicos: { nome: string; quantidade: number; valor: number }[];
}

export function apurarDesempenho(
  lancamentos: LancamentoComissao[],
  inicio: string,
  fim: string
): DesempenhoProfissional[] {
  const porPessoa = new Map<string, LancamentoComissao[]>();

  for (const item of lancamentos) {
    if (item.data < inicio || item.data > fim) continue;
    const chave = `${item.unidade}|${item.profissional}`;
    const lista = porPessoa.get(chave);
    if (lista) lista.push(item);
    else porPessoa.set(chave, [item]);
  }

  return [...porPessoa.entries()]
    .map(([chave, itens]) => {
      const [unidade, profissional] = chave.split("|");
      const faturamento = itens.reduce((t, i) => t + i.valor, 0);
      const comissao = itens.reduce((t, i) => t + i.comissao, 0);
      const atendimentos = itens.reduce((t, i) => t + i.volume, 0);

      const porServico = new Map<string, { quantidade: number; valor: number }>();
      for (const item of itens) {
        const atual = porServico.get(item.servico) ?? { quantidade: 0, valor: 0 };
        porServico.set(item.servico, {
          quantidade: atual.quantidade + item.volume,
          valor: atual.valor + item.valor,
        });
      }

      return {
        profissional,
        unidade,
        faturamento,
        comissao,
        atendimentos,
        ticket: atendimentos > 0 ? faturamento / atendimentos : 0,
        percentualMedio: faturamento > 0 ? comissao / faturamento : 0,
        servicos: [...porServico.entries()]
          .map(([nome, dados]) => ({ nome, ...dados }))
          .sort((a, b) => b.valor - a.valor),
      };
    })
    .sort((a, b) => b.faturamento - a.faturamento);
}
