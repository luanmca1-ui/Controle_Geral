import { diaSemanaDaData, intervaloDeDatas, ROTULO_DIA, somarDias } from "./parse";
import { compararMedias, compararProporcoes, type Resultado } from "./estatistica";
import type { AppConfig, DiaFaturamento, ProjecaoUnidade } from "./types";

export interface Janela {
  inicio: string;
  fim: string;
  faturamento: number;
  emConta: number;
  dinheiro: number;
  atendimentos: number;
  clientes: number;
  ticket: number;
  diasComDado: number;
  /** faturamento de cada dia com movimento, para o teste de significancia */
  serieDiaria: number[];
  /** ticket medio de cada dia */
  serieTicket: number[];
}

export interface Comparativo {
  unidade: string;
  dias: number;
  atual: Janela;
  anterior: Janela;
  /** null quando nao ha base anterior suficiente */
  variacaoFaturamento: number | null;
  variacaoAtendimentos: number | null;
  variacaoTicket: number | null;
  /**
   * Cada teste diz se a diferenca resiste ao acaso. Sem isso, com 18
   * unidades, alguma sempre varia por ruido e o painel vira alarme falso.
   */
  testes: {
    faturamento: Resultado;
    ticket: Resultado;
    dinheiro: Resultado;
  };
  /** fatia do faturamento recebida em especie */
  fatiaDinheiro: number;
  diaMaisFraco: { dia: number; media: number } | null;
  diaMaisForte: { dia: number; media: number } | null;
}

function janelaVazia(inicio: string, fim: string): Janela {
  return {
    inicio,
    fim,
    faturamento: 0,
    emConta: 0,
    dinheiro: 0,
    atendimentos: 0,
    clientes: 0,
    ticket: 0,
    diasComDado: 0,
    serieDiaria: [],
    serieTicket: [],
  };
}

function somarJanela(
  dias: DiaFaturamento[],
  inicio: string,
  fim: string,
  config: AppConfig
): Janela {
  const janela = janelaVazia(inicio, fim);

  for (const dia of dias) {
    if (dia.data < inicio || dia.data > fim) continue;
    if (dia.total === 0) continue;

    janela.faturamento += dia.total;
    janela.dinheiro += dia.dinheiro;
    janela.emConta +=
      dia.credito * (1 - config.taxaCredito) +
      dia.debito * (1 - config.taxaDebito) +
      dia.pix * (1 - config.taxaPix);
    janela.atendimentos += dia.atendimentos;
    janela.clientes += dia.clientes;
    janela.diasComDado += 1;
    janela.serieDiaria.push(dia.total);
    if (dia.atendimentos > 0) janela.serieTicket.push(dia.total / dia.atendimentos);
  }

  janela.ticket = janela.atendimentos > 0 ? janela.faturamento / janela.atendimentos : 0;
  return janela;
}

function variacao(atual: number, anterior: number): number | null {
  if (anterior <= 0) return null;
  return ((atual - anterior) / anterior) * 100;
}

/**
 * Compara os ultimos N dias ja faturados com os N imediatamente anteriores.
 *
 * A janela termina no ultimo dia lancado, e nao em hoje. Comparar contra dias
 * que a planilha ainda nao recebeu faria o periodo atual parecer sempre pior
 * do que e.
 */
export function calcularComparativo(
  faturamento: DiaFaturamento[],
  unidade: string,
  dias: number,
  config: AppConfig
): Comparativo | null {
  const daUnidade = faturamento
    .filter((dia) => dia.unidade === unidade && dia.total > 0)
    .sort((a, b) => (a.data < b.data ? 1 : -1));

  if (daUnidade.length === 0) return null;

  const fimAtual = daUnidade[0].data;
  const inicioAtual = somarDias(fimAtual, -(dias - 1));
  const fimAnterior = somarDias(inicioAtual, -1);
  const inicioAnterior = somarDias(fimAnterior, -(dias - 1));

  const atual = somarJanela(daUnidade, inicioAtual, fimAtual, config);
  const anterior = somarJanela(daUnidade, inicioAnterior, fimAnterior, config);

  const porDiaSemana = new Map<number, { soma: number; quantidade: number }>();
  for (const data of intervaloDeDatas(inicioAtual, fimAtual)) {
    const registro = daUnidade.find((dia) => dia.data === data);
    if (!registro) continue;
    const chave = diaSemanaDaData(data);
    const acumulado = porDiaSemana.get(chave) ?? { soma: 0, quantidade: 0 };
    porDiaSemana.set(chave, {
      soma: acumulado.soma + registro.total,
      quantidade: acumulado.quantidade + 1,
    });
  }

  const medias = [...porDiaSemana.entries()]
    .map(([dia, dados]) => ({ dia, media: dados.soma / dados.quantidade }))
    .sort((a, b) => a.media - b.media);

  return {
    unidade,
    dias,
    atual,
    anterior,
    variacaoFaturamento: variacao(atual.faturamento, anterior.faturamento),
    variacaoAtendimentos: variacao(atual.atendimentos, anterior.atendimentos),
    variacaoTicket: variacao(atual.ticket, anterior.ticket),
    testes: {
      faturamento: compararMedias(atual.serieDiaria, anterior.serieDiaria),
      ticket: compararMedias(atual.serieTicket, anterior.serieTicket),
      dinheiro: compararProporcoes(
        Math.round(atual.dinheiro),
        Math.round(atual.faturamento),
        Math.round(anterior.dinheiro),
        Math.round(anterior.faturamento)
      ),
    },
    fatiaDinheiro: atual.faturamento > 0 ? atual.dinheiro / atual.faturamento : 0,
    diaMaisFraco: medias.length > 1 ? medias[0] : null,
    diaMaisForte: medias.length > 1 ? medias[medias.length - 1] : null,
  };
}

/**
 * Comparativo da rede inteira: soma o faturamento de todas as unidades por
 * dia e trata o resultado como uma unidade só. Somar os comparativos prontos
 * daria errado, porque cada unidade tem um último dia lançado diferente.
 */
export function calcularComparativoRede(
  faturamento: DiaFaturamento[],
  dias: number,
  config: AppConfig
): Comparativo | null {
  const porDia = new Map<string, DiaFaturamento>();

  for (const dia of faturamento) {
    if (dia.total === 0) continue;
    const atual = porDia.get(dia.data);
    if (!atual) {
      porDia.set(dia.data, { ...dia, unidade: "__rede__" });
      continue;
    }
    porDia.set(dia.data, {
      ...atual,
      total: atual.total + dia.total,
      clientes: atual.clientes + dia.clientes,
      atendimentos: atual.atendimentos + dia.atendimentos,
      credito: atual.credito + dia.credito,
      debito: atual.debito + dia.debito,
      dinheiro: atual.dinheiro + dia.dinheiro,
      pix: atual.pix + dia.pix,
    });
  }

  return calcularComparativo([...porDia.values()], "__rede__", dias, config);
}

export type TomInsight = "bom" | "ruim" | "neutro";

export interface Insight {
  tom: TomInsight;
  titulo: string;
  texto: string;
}

/**
 * Observacoes derivadas dos numeros. Cada uma diz o que esta acontecendo e o
 * que fazer a respeito: numero sem leitura nao ajuda ninguem a decidir.
 */
export function gerarInsights(
  projecao: ProjecaoUnidade,
  comparativo: Comparativo | null,
  config: AppConfig
): Insight[] {
  const notas: Insight[] = [];

  if (comparativo && comparativo.anterior.diasComDado > 0) {
    const vf = comparativo.variacaoFaturamento;
    const vt = comparativo.variacaoTicket;
    const va = comparativo.variacaoAtendimentos;

    // so vira alerta o que passa no teste: variacao grande com muito ruido
    // no dia a dia nao significa mudanca de patamar
    if (vf !== null && Math.abs(vf) >= 5 && comparativo.testes.faturamento.significativo) {
      notas.push({
        tom: vf > 0 ? "bom" : "ruim",
        titulo: `Faturamento ${vf > 0 ? "subiu" : "caiu"} ${Math.abs(vf).toFixed(1)}%`,
        texto: `Últimos ${comparativo.dias} dias lançados contra os ${comparativo.dias} anteriores. A diferença é consistente dia a dia, não é oscilação.`,
      });
    }

    if (va !== null && vf !== null && va > 3 && vf < 0) {
      notas.push({
        tom: "ruim",
        titulo: "Mais atendimentos, menos dinheiro",
        texto:
          "O volume subiu e o faturamento caiu. Costuma ser desconto ou troca por serviço mais barato.",
      });
    } else if (vt !== null && Math.abs(vt) >= 5 && comparativo.testes.ticket.significativo) {
      notas.push({
        tom: vt > 0 ? "bom" : "ruim",
        titulo: `Ticket médio ${vt > 0 ? "subiu" : "caiu"} ${Math.abs(vt).toFixed(1)}%`,
        texto:
          vt > 0
            ? "Cada atendimento está rendendo mais que no período anterior."
            : "O mesmo volume de atendimentos rende menos que antes.",
      });
    }
  }

  if (comparativo && comparativo.fatiaDinheiro >= 0.25) {
    notas.push({
      tom: "neutro",
      titulo: `${(comparativo.fatiaDinheiro * 100).toFixed(0)}% do faturamento é dinheiro`,
      texto:
        "Espécie não entra na conta e não paga boleto. Quanto maior essa fatia, mais o saldo bancário fica abaixo do faturamento.",
    });
  }

  if (comparativo?.diaMaisFraco && comparativo.diaMaisForte) {
    const { diaMaisFraco: fraco, diaMaisForte: forte } = comparativo;
    if (forte.media > 0 && fraco.media / forte.media < 0.5) {
      notas.push({
        tom: "neutro",
        titulo: `${ROTULO_DIA[fraco.dia]} rende menos da metade de ${ROTULO_DIA[forte.dia].toLowerCase()}`,
        texto: "Dia fraco aceita promoção, horário reduzido ou folga concentrada da equipe.",
      });
    }
  }

  const gastoMedio =
    projecao.dias.length > 0 ? projecao.totalSaidas / projecao.dias.length : 0;
  if (gastoMedio > 0 && projecao.saldoInicial > 0) {
    const folego = Math.floor(projecao.saldoInicial / gastoMedio);
    if (folego < 15) {
      notas.push({
        tom: folego < 7 ? "ruim" : "neutro",
        titulo: `Saldo cobre ${folego} ${folego === 1 ? "dia" : "dias"} de saída`,
        texto: "No ritmo de gasto do período, sem contar o que ainda vai entrar.",
      });
    }
  }

  const maiorDia = [...projecao.dias].sort((a, b) => b.saidaContas - a.saidaContas)[0];
  if (maiorDia && maiorDia.saidaContas > 0 && projecao.totalContas > 0) {
    const fatia = maiorDia.saidaContas / projecao.totalContas;
    if (fatia > 0.5) {
      notas.push({
        tom: "neutro",
        titulo: `${(fatia * 100).toFixed(0)}% das contas vencem num dia só`,
        texto: `Tudo em ${maiorDia.data.slice(8, 10)}/${maiorDia.data.slice(5, 7)}. Negociar datas espalha o impacto no caixa.`,
      });
    }
  }

  if (comparativo && comparativo.atual.faturamento > 0 && projecao.totalComissao > 0) {
    const semanas = Math.max(1, projecao.dias.length / 7);
    const comissaoSemanal = projecao.totalComissao / semanas;
    const faturamentoSemanal =
      comparativo.atual.faturamento / Math.max(1, comparativo.dias / 7);
    const peso = faturamentoSemanal > 0 ? comissaoSemanal / faturamentoSemanal : 0;

    if (peso > config.percentualComissao * 1.15) {
      notas.push({
        tom: "ruim",
        titulo: `Comissão pesa ${(peso * 100).toFixed(0)}% do faturamento`,
        texto: `Acima dos ${(config.percentualComissao * 100).toFixed(0)}% configurados. Confira os percentuais individuais na aba Comissões.`,
      });
    }
  }

  return notas;
}
