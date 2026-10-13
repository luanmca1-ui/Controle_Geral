import { formatarDataCompleta, formatarMoeda, formatarMoedaCurta } from "./parse";
import { classificarControle } from "./statusConta";
import { situacaoContrato, type Profissional } from "./profissionais";
import type { DocumentoUnidade } from "./documentos";
import type { RespostaProjecao } from "./types";

export type Confianca = "Alta" | "Média" | "Baixa";

export interface Decisao {
  /** o que fazer, em voz ativa */
  titulo: string;
  tamanho: string;
  fatia: string | null;
  dono: string;
  confianca: Confianca;
  texto: string;
  /** o indicador que tem de se mover se a decisão estiver certa */
  prova: string;
  /** em reais, só para ordenar por impacto */
  impacto: number;
  tom: "risco" | "atencao" | "neutro";
}

export interface EntradaDecisoes {
  projecao: RespostaProjecao;
  profissionais: Profissional[];
  documentos: DocumentoUnidade[];
  mes: number;
}

/**
 * Monta as decisões a partir do estado atual, ordenadas pelo tamanho do
 * impacto em reais. O que não tem valor em dinheiro entra depois.
 */
export function montarDecisoes(entrada: EntradaDecisoes): Decisao[] {
  const { projecao, profissionais, documentos, mes } = entrada;
  const decisoes: Decisao[] = [];

  const contas = projecao.unidades.flatMap((u) => u.dias.flatMap((d) => d.contas));
  const totalContas = contas.reduce((t, c) => t + c.valor, 0);
  const porChave = (chave: string) =>
    contas.filter((c) => classificarControle(c.controle).chave === chave);
  const soma = (lista: typeof contas) => lista.reduce((t, c) => t + c.valor, 0);

  const fatiaDe = (valor: number) =>
    totalContas > 0 ? `${((valor / totalContas) * 100).toFixed(0)}% do que vence` : null;

  /* 1. caixa que não fecha */
  const emRisco = projecao.unidades.filter((u) => u.status === "risco");
  if (emRisco.length > 0) {
    const falta = emRisco.reduce((t, u) => t + u.faltaNoPior, 0);
    const primeiro = emRisco
      .map((u) => u.primeiroDiaNegativo)
      .filter((d): d is string => Boolean(d))
      .sort()[0];

    decisoes.push({
      titulo:
        emRisco.length === 1
          ? `Cobrir o caixa de ${emRisco[0].unidade}`
          : `Cobrir o caixa de ${emRisco.length} unidades`,
      tamanho: formatarMoeda(falta),
      fatia: `${emRisco.length} de ${projecao.unidades.length} unidades`,
      dono: "Gestora",
      confianca: "Alta",
      texto:
        `O saldo fica negativo a partir de ${primeiro ? formatarDataCompleta(primeiro) : "um dia do período"}. ` +
        `Dá para resolver remanejando saldo entre unidades, adiando vencimento ou antecipando recebível. ` +
        `Em ${emRisco.map((u) => u.unidade).slice(0, 3).join(", ")} o buraco soma ${formatarMoedaCurta(falta)}.`,
      prova: "Nenhuma unidade com saldo projetado negativo no próximo período.",
      impacto: falta,
      tom: "risco",
    });
  }

  /* 2. agendamentos parados esperando aprovação */
  const aguardando = porChave("aguardando");
  if (aguardando.length > 0) {
    const valor = soma(aguardando);
    decisoes.push({
      titulo: `Aprovar ${aguardando.length} agendamento${aguardando.length > 1 ? "s" : ""}`,
      tamanho: formatarMoeda(valor),
      fatia: fatiaDe(valor),
      dono: "Dono",
      confianca: "Alta",
      texto:
        `A gestora já agendou e está esperando o aval. Enquanto não sai a aprovação, ` +
        `o pagamento fica parado e corre risco de virar juro. ` +
        `A conta mais antiga vence em ${
          aguardando
            .map((c) => c.vencimento)
            .filter((d): d is string => Boolean(d))
            .sort()[0]
            ? formatarDataCompleta(
                aguardando
                  .map((c) => c.vencimento)
                  .filter((d): d is string => Boolean(d))
                  .sort()[0]
              )
            : "breve"
        }.`,
      prova: "Zero contas no status aguardando aprovação.",
      impacto: valor,
      tom: "risco",
    });
  }

  /* 3. contas vencidas em aberto */
  if (projecao.resumo.totalPendencias > 0) {
    decisoes.push({
      titulo: "Limpar as contas vencidas em aberto",
      tamanho: formatarMoeda(projecao.resumo.totalPendencias),
      fatia: null,
      dono: "Gestora",
      confianca: "Média",
      texto:
        `São contas que passaram do vencimento e continuam sem data de pagamento na ` +
        `planilha. Parte costuma ser baixa que ninguém deu, e parte é dívida real. ` +
        `Enquanto não se separa uma coisa da outra, o número não serve para decidir nada.`,
      prova: "O total de vencidas cai, e o que sobrar tem data de pagamento prevista.",
      impacto: projecao.resumo.totalPendencias * 0.5,
      tom: "atencao",
    });
  }

  /* 4. contas sem controle de status */
  const semStatus = porChave("semStatus");
  if (semStatus.length > 0) {
    const valor = soma(semStatus);
    decisoes.push({
      titulo: `Preencher o status de ${semStatus.length} conta${semStatus.length > 1 ? "s" : ""}`,
      tamanho: formatarMoeda(valor),
      fatia: fatiaDe(valor),
      dono: "Gestora",
      confianca: "Alta",
      texto:
        `Essas contas vencem no período e ninguém marcou se foram agendadas. ` +
        `Não dá para saber se estão encaminhadas ou esquecidas. ` +
        `A correção é na coluna I da aba BContasFixas, porque o painel não edita esse campo.`,
      prova: "Nenhuma conta do período sem Controle de Status preenchido.",
      impacto: valor * 0.3,
      tom: "atencao",
    });
  }

  /* 5. documentos vencidos */
  const vencidos = documentos.filter((doc) => doc.situacao === "vencido");
  if (vencidos.length > 0) {
    const custo = vencidos.reduce((t, d) => t + d.custo, 0);
    const responsaveis = [...new Set(vencidos.map((d) => d.responsavel).filter(Boolean))];

    decisoes.push({
      titulo: `Renovar ${vencidos.length} documento${vencidos.length > 1 ? "s" : ""} vencido${vencidos.length > 1 ? "s" : ""}`,
      tamanho: custo > 0 ? formatarMoeda(custo) : `${vencidos.length} documentos`,
      fatia: null,
      dono: responsaveis[0] ?? "Jurídico",
      confianca: "Alta",
      texto:
        `${vencidos.map((d) => d.documento).slice(0, 3).join(", ")} estão fora da validade. ` +
        `Documento vencido é risco de multa e de interdição, e o custo de renovar é conhecido: ` +
        `${custo > 0 ? formatarMoeda(custo) : "a confirmar"}.`,
      prova: "Nenhum documento com data de validade no passado.",
      impacto: Math.max(custo, 1500),
      tom: "risco",
    });
  }

  /* 6. comissão acima do configurado */
  const comparativo = projecao.comparativoRede;
  if (comparativo && comparativo.atual.faturamento > 0 && projecao.resumo.totalComissao > 0) {
    const semanas = Math.max(1, (projecao.unidades[0]?.dias.length ?? 7) / 7);
    const comissaoSemanal = projecao.resumo.totalComissao / semanas;
    const faturamentoSemanal = comparativo.atual.faturamento / (comparativo.dias / 7);
    const peso = faturamentoSemanal > 0 ? comissaoSemanal / faturamentoSemanal : 0;
    const alvo = projecao.config.percentualComissao;

    if (peso > alvo * 1.15) {
      const excesso = (peso - alvo) * faturamentoSemanal * 4;
      decisoes.push({
        titulo: "Revisar os percentuais de comissão",
        tamanho: `${formatarMoeda(excesso)} por mês`,
        fatia: `${(peso * 100).toFixed(0)}% do faturamento`,
        dono: "Dono",
        confianca: "Média",
        texto:
          `A comissão apurada está em ${(peso * 100).toFixed(0)}% do faturamento, contra ` +
          `${(alvo * 100).toFixed(0)}% configurados. A diferença pode ser percentual individual ` +
          `acima do combinado, ou mix puxado para serviços com comissão maior. ` +
          `A coluna %Comissão da aba Comissões mostra caso a caso.`,
        prova: `A comissão apurada volta para perto de ${(alvo * 100).toFixed(0)}% do faturamento.`,
        impacto: excesso,
        tom: "atencao",
      });
    }
  }

  /* 7. contratos cobrados sem retorno */
  const ativos = profissionais.filter((p) => p.status.toLowerCase() !== "inativo");
  const semRetorno = ativos.filter((p) => situacaoContrato(p) === "solicitado");
  if (semRetorno.length > 0) {
    decisoes.push({
      titulo: `Fechar ${semRetorno.length} contrato${semRetorno.length > 1 ? "s" : ""} já cobrado${semRetorno.length > 1 ? "s" : ""}`,
      tamanho: `${semRetorno.length} de ${ativos.length} profissionais`,
      fatia: `${((semRetorno.length / Math.max(1, ativos.length)) * 100).toFixed(0)}% da equipe`,
      dono: "Jurídico",
      confianca: "Alta",
      texto:
        `${semRetorno.map((p) => p.apelido || p.nome.split(" ")[0]).slice(0, 4).join(", ")} ` +
        `já foram procurados e não devolveram o contrato assinado. Trabalhar sem contrato ` +
        `expõe a empresa em reclamação trabalhista e em fiscalização.`,
      prova: "Todos os ativos com contrato assinado e data preenchida.",
      impacto: 800,
      tom: "risco",
    });
  }

  /* 8. nota fiscal do mês */
  const semNota = ativos.filter((p) => !p.notas[mes]);
  if (semNota.length > 0 && ativos.length > 0) {
    const fatia = semNota.length / ativos.length;
    if (fatia >= 0.3) {
      decisoes.push({
        titulo: `Cobrar a nota fiscal de ${semNota.length} parceiros`,
        tamanho: `${semNota.length} de ${ativos.length}`,
        fatia: `${(fatia * 100).toFixed(0)}% da equipe`,
        dono: "Gestora",
        confianca: "Alta",
        texto:
          `Sem a nota, a despesa com comissão não tem documento que a sustente. ` +
          `A cobrança é mais fácil agora do que no fechamento do mês.`,
        prova: "Mais de 90% dos ativos com NF do mês marcada como entregue.",
        impacto: 500,
        tom: "atencao",
      });
    }
  }

  return decisoes.sort((a, b) => b.impacto - a.impacto).slice(0, 5);
}
