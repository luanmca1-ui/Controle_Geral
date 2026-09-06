import { diaSemanaDaData, intervaloDeDatas, somarDias, ROTULO_DIA } from "./parse";
import type {
  AppConfig,
  Conta,
  DiaFaturamento,
  DiaProjecao,
  ProjecaoUnidade,
  RespostaProjecao,
  ResumoRede,
  SaldoUnidade,
  StatusRisco,
} from "./types";

/**
 * O que cai na conta bancaria: credito, debito e pix, ja sem as taxas.
 * Dinheiro em especie fica de fora porque nao passa pela conta.
 */
export function entradaLiquida(dia: DiaFaturamento, config: AppConfig): number {
  return (
    dia.credito * (1 - config.taxaCredito) +
    dia.debito * (1 - config.taxaDebito) +
    dia.pix * (1 - config.taxaPix)
  );
}

export interface Media {
  /** entrada em conta */
  liquida: number;
  /** faturamento bruto do dia, base do calculo da comissao */
  total: number;
  /** dinheiro em especie, de onde sai a comissao paga a vista */
  dinheiro: number;
  amostras: number;
}

function chave(unidade: string, diaSemana: number): string {
  return `${unidade}|${diaSemana}`;
}

/**
 * Media das ultimas N ocorrencias de cada dia da semana, por unidade.
 * Dias com faturamento zero (unidade fechada) e dias em que as modalidades
 * nao somam o total ficam de fora.
 */
export function calcularMedias(
  faturamento: DiaFaturamento[],
  config: AppConfig
): Map<string, Media> {
  const agrupado = new Map<string, DiaFaturamento[]>();

  for (const dia of faturamento) {
    if (dia.total === 0) continue;
    if (!dia.consistente) continue;
    const k = chave(dia.unidade, dia.diaSemana);
    const lista = agrupado.get(k);
    if (lista) lista.push(dia);
    else agrupado.set(k, [dia]);
  }

  const medias = new Map<string, Media>();

  for (const [k, lista] of agrupado) {
    const recentes = lista.slice(0, config.janelaSemanas);
    if (recentes.length === 0) continue;

    let liquida = 0;
    let total = 0;
    let dinheiro = 0;
    for (const dia of recentes) {
      liquida += entradaLiquida(dia, config);
      total += dia.total;
      dinheiro += dia.dinheiro;
    }

    medias.set(k, {
      liquida: liquida / recentes.length,
      total: total / recentes.length,
      dinheiro: dinheiro / recentes.length,
      amostras: recentes.length,
    });
  }

  return medias;
}

/** Indice do faturamento ja lancado, para consultar um dia especifico. */
function indexarReal(faturamento: DiaFaturamento[]): Map<string, DiaFaturamento> {
  const indice = new Map<string, DiaFaturamento>();
  for (const dia of faturamento) {
    if (!dia.consistente) continue;
    indice.set(`${dia.unidade}|${dia.data}`, dia);
  }
  return indice;
}

/**
 * Faturamento da semana fechada que antecede o dia de pagamento.
 * Para uma comissao paga na segunda 07/09, a base vai de segunda 31/08 a
 * domingo 06/09. Usa o valor lancado quando ele ja existe, e cai na media do
 * dia da semana so para os dias que ainda nao foram fechados.
 */
function semanaBase(
  unidade: string,
  diaPagamento: string,
  real: Map<string, DiaFaturamento>,
  medias: Map<string, Media>,
  config: AppConfig
): {
  faturamento: number;
  dinheiro: number;
  inicio: string;
  fim: string;
  diasReais: number;
} {
  const inicio = somarDias(diaPagamento, -7);
  const fim = somarDias(diaPagamento, -1);

  let faturamento = 0;
  let dinheiro = 0;
  let diasReais = 0;

  for (let deslocamento = 0; deslocamento < 7; deslocamento++) {
    const data = somarDias(inicio, deslocamento);
    const lancado = real.get(`${unidade}|${data}`);

    if (lancado && lancado.total > 0) {
      faturamento += lancado.total;
      dinheiro += lancado.dinheiro;
      diasReais += 1;
      continue;
    }

    const media = medias.get(chave(unidade, diaSemanaDaData(data)));
    if (media) {
      faturamento += media.total;
      dinheiro += media.dinheiro;
    }
  }

  return { faturamento, dinheiro, inicio, fim, diasReais };
}

export interface EntradaProjecao {
  faturamento: DiaFaturamento[];
  contas: Conta[];
  saldos: SaldoUnidade[];
  config: AppConfig;
  inicio: string;
  fim: string;
  hoje: string;
}

function classificar(menorSaldo: number, reservaMinima: number): StatusRisco {
  if (menorSaldo < 0) return "risco";
  if (menorSaldo < reservaMinima) return "atencao";
  return "ok";
}

export function projetar(entrada: EntradaProjecao): RespostaProjecao {
  const { faturamento, contas, saldos, config, inicio, fim, hoje } = entrada;

  const medias = calcularMedias(faturamento, config);
  const real = indexarReal(faturamento);
  const datas = intervaloDeDatas(inicio, fim);
  const avisosGerais: string[] = [];

  const inconsistentes = new Set<string>();
  for (const dia of faturamento) {
    if (!dia.consistente) inconsistentes.add(dia.unidade);
  }

  const unidadesConhecidas = new Set<string>();
  saldos.forEach((s) => unidadesConhecidas.add(s.unidade));

  const semSaldoCadastrado = new Set<string>();
  contas.forEach((c) => {
    if (!unidadesConhecidas.has(c.unidade)) semSaldoCadastrado.add(c.unidade);
  });
  faturamento.forEach((f) => {
    if (!unidadesConhecidas.has(f.unidade)) semSaldoCadastrado.add(f.unidade);
  });

  if (semSaldoCadastrado.size > 0) {
    avisosGerais.push(
      `Sem saldo cadastrado na ContaStone: ${[...semSaldoCadastrado].join(", ")}. ` +
        `Confira se o nome bate com Faturamento!AB e BContasFixas!P.`
    );
  }

  if (config.taxaCredito === 0 && config.taxaDebito === 0 && config.taxaPix === 0) {
    avisosGerais.push(
      "As taxas da maquininha estao zeradas. A projecao de entradas esta pelo valor bruto, " +
        "portanto otimista. Preencha as taxas em Ajustes."
    );
  }

  const unidades: ProjecaoUnidade[] = saldos.map((saldo) => {
    const contasDaUnidade = contas.filter((c) => c.unidade === saldo.unidade);
    const emAberto = contasDaUnidade.filter((c) => !c.pagamento);

    const pendencias = emAberto
      .filter((c) => c.vencimento !== null && c.vencimento < inicio)
      .sort((a, b) => (a.vencimento! < b.vencimento! ? -1 : 1));

    const doPeriodo = emAberto.filter(
      (c) => c.vencimento !== null && c.vencimento >= inicio && c.vencimento <= fim
    );

    const porDia = new Map<string, Conta[]>();
    for (const conta of doPeriodo) {
      const lista = porDia.get(conta.vencimento!);
      if (lista) lista.push(conta);
      else porDia.set(conta.vencimento!, [conta]);
    }

    const insumoSemanal = saldo.insumoSemanal;

    const daUnidade = faturamento.filter((f) => f.unidade === saldo.unidade && f.total > 0);
    const ultimoRealizado = daUnidade.length > 0 ? daUnidade[0].data : null;

    let saldoCorrente = saldo.saldo;
    let totalEntradas = 0;
    let totalContas = 0;
    let totalComissao = 0;
    let totalComissaoAVista = 0;
    let totalInsumos = 0;
    let algumaBaseCurta = false;
    let faltouEspecie = false;

    let menorSaldo = saldo.saldo;
    let primeiroDiaNegativo: string | null = null;

    const dias: DiaProjecao[] = datas.map((data) => {
      const diaSemana = diaSemanaDaData(data);
      const media = medias.get(chave(saldo.unidade, diaSemana));
      const lancado = real.get(`${saldo.unidade}|${data}`);

      // Dia ja fechado usa o valor lancado. Dia futuro usa a media.
      const ehReal = Boolean(lancado && lancado.total > 0);
      const entradaDoDia = ehReal
        ? entradaLiquida(lancado!, config)
        : (media?.liquida ?? 0);

      const baseCurta = !ehReal && (!media || media.amostras < config.janelaSemanas);
      if (baseCurta && entradaDoDia > 0) algumaBaseCurta = true;

      const contasDoDia = porDia.get(data) ?? [];
      const saidaContas = contasDoDia.reduce((total, c) => total + c.valor, 0);

      const ehDiaComissao = diaSemana === config.diaComissao;
      const ehDiaInsumos = diaSemana === config.diaInsumos;

      let comissao = 0;
      let comissaoAVista = 0;
      let comissaoBase: DiaProjecao["comissaoBase"] = null;

      if (ehDiaComissao) {
        const base = semanaBase(saldo.unidade, data, real, medias, config);
        const total = base.faturamento * config.percentualComissao;

        // A parte em especie nao pode passar do dinheiro daquela semana.
        comissaoAVista = Math.min(total * config.percentualComissaoAVista, base.dinheiro);
        comissao = total - comissaoAVista;

        comissaoBase = { inicio: base.inicio, fim: base.fim, diasReais: base.diasReais };

        if (
          config.percentualComissaoAVista > 0 &&
          comissaoAVista < total * config.percentualComissaoAVista
        ) {
          faltouEspecie = true;
        }
      }

      const insumos = ehDiaInsumos ? insumoSemanal : 0;

      // comissaoAVista sai do dinheiro em especie, entao nao mexe no saldo
      const saida = saidaContas + comissao + insumos;
      saldoCorrente = saldoCorrente + entradaDoDia - saida;

      totalEntradas += entradaDoDia;
      totalContas += saidaContas;
      totalComissao += comissao;
      totalComissaoAVista += comissaoAVista;
      totalInsumos += insumos;

      if (saldoCorrente < menorSaldo) menorSaldo = saldoCorrente;
      if (saldoCorrente < 0 && !primeiroDiaNegativo) primeiroDiaNegativo = data;

      return {
        data,
        diaSemana,
        entrada: entradaDoDia,
        contas: contasDoDia,
        saidaContas,
        comissao,
        comissaoAVista,
        insumos,
        saida,
        saldoFinal: saldoCorrente,
        baseCurta,
        real: ehReal,
        comissaoBase,
      };
    });

    const avisos: string[] = [];

    if (saldo.diasDesatualizado === null) {
      avisos.push("Saldo sem data de atualizacao. A projecao pode estar partindo de um valor velho.");
    } else if (saldo.diasDesatualizado > config.diasSaldoDesatualizado) {
      avisos.push(
        `Saldo atualizado ha ${saldo.diasDesatualizado} dias. Atualize antes de decidir por este numero.`
      );
    }

    if (insumoSemanal === 0) {
      avisos.push(
        "Sem gasto medio de insumos cadastrado. Preencha a coluna E da ContaStone, senao a projecao ignora essa despesa."
      );
    }

    if (faltouEspecie) {
      avisos.push(
        "O dinheiro em especie da semana nao cobre toda a comissao paga a vista. A diferenca foi lancada como saida da conta."
      );
    }

    if (inicio < hoje) {
      avisos.push(
        `O periodo comeca antes de hoje. Os dias ja fechados usam o faturamento lancado, mas o saldo de partida e o informado na ContaStone, que e de ${saldo.atualizadoEm ?? "data desconhecida"}.`
      );
    }

    if (algumaBaseCurta) {
      avisos.push(
        `Alguns dias da semana tem menos de ${config.janelaSemanas} registros no historico. Projecao menos confiavel.`
      );
    }

    if (inconsistentes.has(saldo.unidade)) {
      avisos.push(
        "Ha dias no faturamento em que credito, debito, dinheiro e pix nao somam o total. Esses dias ficaram fora da media."
      );
    }

    const limiteBoleto = somarDias(hoje, 3);
    const boletosPendentes = doPeriodo.filter(
      (c) => !c.boletoDisponibilizado && c.vencimento! <= limiteBoleto
    );
    if (boletosPendentes.length > 0) {
      avisos.push(
        `${boletosPendentes.length} conta(s) vencendo em ate 3 dias sem boleto disponibilizado.`
      );
    }

    const diasSemMedia = dias.filter((d) => d.entrada === 0 && !d.real).map((d) => ROTULO_DIA[d.diaSemana]);
    if (diasSemMedia.length > 0) {
      avisos.push(`Sem historico de faturamento para: ${[...new Set(diasSemMedia)].join(", ")}.`);
    }

    return {
      unidade: saldo.unidade,
      saldoInicial: saldo.saldo,
      atualizadoEm: saldo.atualizadoEm,
      diasDesatualizado: saldo.diasDesatualizado,
      dias,
      totalEntradas,
      totalContas,
      totalComissao,
      totalComissaoAVista,
      totalInsumos,
      totalSaidas: totalContas + totalComissao + totalInsumos,
      saldoFinal: saldoCorrente,
      menorSaldo,
      primeiroDiaNegativo,
      faltaNoPior: menorSaldo < 0 ? Math.abs(menorSaldo) : 0,
      pendencias,
      totalPendencias: pendencias.reduce((total, c) => total + c.valor, 0),
      ultimoRealizado,
      status: classificar(menorSaldo, config.reservaMinima),
      avisos,
    };
  });

  const ordemStatus: Record<StatusRisco, number> = { risco: 0, atencao: 1, ok: 2 };
  unidades.sort((a, b) => {
    const porStatus = ordemStatus[a.status] - ordemStatus[b.status];
    if (porStatus !== 0) return porStatus;
    if (a.primeiroDiaNegativo && b.primeiroDiaNegativo) {
      if (a.primeiroDiaNegativo !== b.primeiroDiaNegativo) {
        return a.primeiroDiaNegativo < b.primeiroDiaNegativo ? -1 : 1;
      }
    }
    return a.menorSaldo - b.menorSaldo;
  });

  const somar = (campo: keyof ProjecaoUnidade): number =>
    unidades.reduce((total, u) => total + (u[campo] as number), 0);

  const resumo: ResumoRede = {
    saldoInicial: somar("saldoInicial"),
    totalEntradas: somar("totalEntradas"),
    totalContas: somar("totalContas"),
    totalComissao: somar("totalComissao"),
    totalComissaoAVista: somar("totalComissaoAVista"),
    totalInsumos: somar("totalInsumos"),
    totalSaidas: somar("totalSaidas"),
    saldoFinal: somar("saldoFinal"),
    totalPendencias: somar("totalPendencias"),
    unidadesEmRisco: unidades.filter((u) => u.status === "risco").length,
    unidadesEmAtencao: unidades.filter((u) => u.status === "atencao").length,
  };

  return {
    inicio,
    fim,
    geradoEm: new Date().toISOString(),
    config,
    resumo,
    unidades,
    avisosGerais,
  };
}
