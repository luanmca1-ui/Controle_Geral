import { diaSemanaDaData, somarDias } from "./parse";
import type { DiaFaturamento } from "./types";
import type { LancamentoComissao } from "./comissoes";

/* ------------------------------------------------------------- mês a mês */

export interface MesResumo {
  /** AAAA-MM */
  mes: string;
  faturamento: number;
  atendimentos: number;
  ticket: number;
  dinheiro: number;
  diasComDado: number;
  /** true quando o mês ainda não fechou ou tem poucos dias lançados */
  parcial: boolean;
}

function diasNoMes(mes: string): number {
  const [ano, numero] = mes.split("-").map(Number);
  return new Date(Date.UTC(ano, numero, 0)).getUTCDate();
}

/**
 * Faturamento mês a mês. O último mês com lançamento quase sempre está
 * incompleto, e o painel precisa dizer isso: comparar um mês pela metade com
 * meses cheios faz parecer despencar.
 */
export function resumirMeses(faturamento: DiaFaturamento[], quantos = 6): MesResumo[] {
  const grupos = new Map<string, DiaFaturamento[]>();

  for (const dia of faturamento) {
    if (dia.total === 0) continue;
    const mes = dia.data.slice(0, 7);
    const lista = grupos.get(mes);
    if (lista) lista.push(dia);
    else grupos.set(mes, [dia]);
  }

  return [...grupos.entries()]
    .map(([mes, dias]) => {
      const faturado = dias.reduce((t, d) => t + d.total, 0);
      const atendimentos = dias.reduce((t, d) => t + d.atendimentos, 0);
      // conta dias distintos, porque a rede tem uma linha por unidade
      const distintos = new Set(dias.map((d) => d.data)).size;

      return {
        mes,
        faturamento: faturado,
        atendimentos,
        ticket: atendimentos > 0 ? faturado / atendimentos : 0,
        dinheiro: dias.reduce((t, d) => t + d.dinheiro, 0),
        diasComDado: distintos,
        parcial: distintos < diasNoMes(mes) - 2,
      };
    })
    .sort((a, b) => (a.mes < b.mes ? -1 : 1))
    .slice(-quantos);
}

/* --------------------------------------------------------- semana a semana */

export interface SemanaResumo {
  inicio: string;
  fim: string;
  faturamento: number;
  atendimentos: number;
  diasComDado: number;
  /** o número que permite comparar semanas de tamanhos diferentes */
  mediaDiaria: number;
  completa: boolean;
}

/** Segunda-feira da semana a que a data pertence. */
function segundaDa(data: string): string {
  const diaSemana = diaSemanaDaData(data);
  const recuo = diaSemana === 0 ? 6 : diaSemana - 1;
  return somarDias(data, -recuo);
}

/**
 * Semanas fechadas de segunda a domingo.
 *
 * O número que vale é a média diária, não o total: uma semana com 6 dias de
 * movimento contra outra com 7 teria diferença só pelo tamanho.
 */
export function resumirSemanas(faturamento: DiaFaturamento[], quantas = 8): SemanaResumo[] {
  const grupos = new Map<string, DiaFaturamento[]>();

  for (const dia of faturamento) {
    if (dia.total === 0) continue;
    const chave = segundaDa(dia.data);
    const lista = grupos.get(chave);
    if (lista) lista.push(dia);
    else grupos.set(chave, [dia]);
  }

  const ultimaData = faturamento
    .filter((d) => d.total > 0)
    .reduce((maior, d) => (d.data > maior ? d.data : maior), "");

  return [...grupos.entries()]
    .map(([inicio, dias]) => {
      const fim = somarDias(inicio, 6);
      const faturado = dias.reduce((t, d) => t + d.total, 0);
      const distintos = new Set(dias.map((d) => d.data)).size;

      return {
        inicio,
        fim,
        faturamento: faturado,
        atendimentos: dias.reduce((t, d) => t + d.atendimentos, 0),
        diasComDado: distintos,
        mediaDiaria: distintos > 0 ? faturado / distintos : 0,
        completa: fim <= ultimaData,
      };
    })
    .sort((a, b) => (a.inicio < b.inicio ? -1 : 1))
    .slice(-quantas);
}

/* ------------------------------------------------------------- serviços */

export interface ServicoResumo {
  nome: string;
  faturamento: number;
  quantidade: number;
  comissao: number;
  /** o que sobra depois de pagar o profissional */
  liquido: number;
  percentualComissao: number;
  participacao: number;
  ticket: number;
}

export function resumirServicos(lancamentos: LancamentoComissao[]): ServicoResumo[] {
  const grupos = new Map<string, { valor: number; comissao: number; volume: number }>();

  for (const item of lancamentos) {
    const nome = item.servico || "Sem descrição";
    const atual = grupos.get(nome) ?? { valor: 0, comissao: 0, volume: 0 };
    grupos.set(nome, {
      valor: atual.valor + item.valor,
      comissao: atual.comissao + item.comissao,
      volume: atual.volume + item.volume,
    });
  }

  const total = [...grupos.values()].reduce((t, g) => t + g.valor, 0);

  return [...grupos.entries()]
    .map(([nome, g]) => ({
      nome,
      faturamento: g.valor,
      quantidade: g.volume,
      comissao: g.comissao,
      liquido: g.valor - g.comissao,
      percentualComissao: g.valor > 0 ? g.comissao / g.valor : 0,
      participacao: total > 0 ? g.valor / total : 0,
      ticket: g.volume > 0 ? g.valor / g.volume : 0,
    }))
    .sort((a, b) => b.faturamento - a.faturamento);
}

/* ------------------------------------------------------------- barbeiros */

export interface BarbeiroAjustado {
  profissional: string;
  unidade: string;
  faturamento: number;
  comissao: number;
  atendimentos: number;
  ticket: number;
  /** quanto faturaria fazendo esses mesmos serviços ao preço médio da rede */
  esperado: number;
  /** observado dividido pelo esperado; 1 é exatamente a média */
  indice: number;
  amostraPequena: boolean;
  servicos: { nome: string; quantidade: number; valor: number }[];
}

const MINIMO_ATENDIMENTOS = 30;

/**
 * Produção por profissional, descontando o mix de serviços.
 *
 * Comparar faturamento cru pune quem só faz corte e premia quem pega
 * química. O esperado usa o ticket médio da rede em cada serviço aplicado ao
 * que a pessoa de fato atendeu, e o índice mostra quanto ela ficou acima ou
 * abaixo disso. É padronização indireta, o mesmo método usado para comparar
 * taxas entre populações de perfis diferentes.
 */
export function ajustarBarbeirosPeloMix(
  lancamentos: LancamentoComissao[]
): BarbeiroAjustado[] {
  const ticketPorServico = new Map<string, { valor: number; volume: number }>();
  for (const item of lancamentos) {
    const nome = item.servico || "Sem descrição";
    const atual = ticketPorServico.get(nome) ?? { valor: 0, volume: 0 };
    ticketPorServico.set(nome, {
      valor: atual.valor + item.valor,
      volume: atual.volume + item.volume,
    });
  }

  const precoMedio = (servico: string): number => {
    const dados = ticketPorServico.get(servico);
    return dados && dados.volume > 0 ? dados.valor / dados.volume : 0;
  };

  const porPessoa = new Map<string, LancamentoComissao[]>();
  for (const item of lancamentos) {
    if (!item.profissional) continue;
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

      const esperado = itens.reduce(
        (t, i) => t + precoMedio(i.servico || "Sem descrição") * i.volume,
        0
      );

      const porServico = new Map<string, { quantidade: number; valor: number }>();
      for (const item of itens) {
        const nome = item.servico || "Sem descrição";
        const atual = porServico.get(nome) ?? { quantidade: 0, valor: 0 };
        porServico.set(nome, {
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
        esperado,
        indice: esperado > 0 ? faturamento / esperado : 1,
        amostraPequena: atendimentos < MINIMO_ATENDIMENTOS,
        servicos: [...porServico.entries()]
          .map(([nome, dados]) => ({ nome, ...dados }))
          .sort((a, b) => b.valor - a.valor),
      };
    })
    .sort((a, b) => b.faturamento - a.faturamento);
}
