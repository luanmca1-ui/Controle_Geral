export type StatusRisco = "ok" | "atencao" | "risco";

/** Um dia de faturamento de uma unidade, ja convertido para numeros. */
export interface DiaFaturamento {
  unidade: string;
  data: string; // AAAA-MM-DD
  diaSemana: number; // 0 = domingo
  total: number;
  credito: number;
  debito: number;
  dinheiro: number;
  pix: number;
  /** false quando credito + debito + dinheiro + pix nao bate com o total */
  consistente: boolean;
}

export interface Conta {
  id: string;
  categoria: string;
  favorecido: string;
  valor: number;
  vencimento: string | null; // AAAA-MM-DD
  pagamento: string | null;
  boletoDisponibilizado: boolean;
  /** texto cru da coluna I, "Controle de Status" */
  controle: string;
  statusPagamento: string;
  unidade: string;
  item: string;
}

export interface SaldoUnidade {
  unidade: string;
  saldo: number;
  /** gasto medio semanal com insumos, lancado toda terca */
  insumoSemanal: number;
  atualizadoEm: string | null;
  atualizadoPor: string | null;
  diasDesatualizado: number | null;
  linha: number; // linha real na aba ContaStone, usada para gravar
}

export interface DiaProjecao {
  data: string;
  diaSemana: number;
  /** entrada liquida em conta: credito + debito + pix, sem taxas */
  entrada: number;
  contas: Conta[];
  /** soma das contas fixas que vencem no dia */
  saidaContas: number;
  /** parte da comissao que sai da conta bancaria */
  comissao: number;
  /** parte da comissao paga com o dinheiro em especie, fora da conta */
  comissaoAVista: number;
  insumos: number;
  /** tudo que sai da conta no dia: contas + comissao + insumos */
  saida: number;
  saldoFinal: number;
  baseCurta: boolean;
  /** true quando a entrada veio do faturamento lancado, nao da media */
  real: boolean;
  /** semana fechada que serviu de base para a comissao do dia */
  comissaoBase: {
    inicio: string;
    fim: string;
    diasReais: number;
    /** true quando o valor veio da aba Comissoes, e nao do percentual */
    apurada: boolean;
    diasApurados: number;
  } | null;
}

export interface ProjecaoUnidade {
  unidade: string;
  saldoInicial: number;
  atualizadoEm: string | null;
  diasDesatualizado: number | null;
  dias: DiaProjecao[];
  totalEntradas: number;
  totalContas: number;
  totalComissao: number;
  totalComissaoAVista: number;
  totalInsumos: number;
  totalSaidas: number;
  saldoFinal: number;
  menorSaldo: number;
  primeiroDiaNegativo: string | null;
  faltaNoPior: number;
  pendencias: Conta[];
  totalPendencias: number;
  /** ultimo dia com faturamento lancado na planilha */
  ultimoRealizado: string | null;
  status: StatusRisco;
  avisos: string[];
}

export interface ResumoRede {
  saldoInicial: number;
  totalEntradas: number;
  totalContas: number;
  totalComissao: number;
  totalComissaoAVista: number;
  totalInsumos: number;
  totalSaidas: number;
  saldoFinal: number;
  totalPendencias: number;
  unidadesEmRisco: number;
  unidadesEmAtencao: number;
}

export interface AppConfig {
  taxaCredito: number;
  taxaDebito: number;
  taxaPix: number;
  janelaSemanas: number;
  reservaMinima: number;
  diasSaldoDesatualizado: number;
  /** fatia do faturamento que vira comissao dos barbeiros */
  percentualComissao: number;
  /** quanto da comissao e pago em especie, sem passar pela conta */
  percentualComissaoAVista: number;
  /** dia da semana em que a comissao e lancada (0 = domingo) */
  diaComissao: number;
  /** dia da semana em que os insumos sao lancados */
  diaInsumos: number;
}

export interface RespostaProjecao {
  inicio: string;
  fim: string;
  geradoEm: string;
  config: AppConfig;
  resumo: ResumoRede;
  unidades: ProjecaoUnidade[];
  avisosGerais: string[];
}
