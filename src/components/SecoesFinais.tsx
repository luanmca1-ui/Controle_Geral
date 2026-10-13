"use client";

import Link from "next/link";
import BarrasRanking, { type ItemBarra } from "./BarrasRanking";
import { SecaoNumerada } from "./ui";
import {
  formatarDataCompleta,
  formatarMoeda,
  formatarMoedaCurta,
  slugDaUnidade,
} from "@/lib/parse";
import type { RespostaProjecao } from "@/lib/types";

/** Seção 08 — qual unidade está fora da curva? */
export function SecaoUnidades({
  dados,
  periodo,
  de,
}: {
  dados: RespostaProjecao;
  periodo: string;
  de: string;
}) {
  if (dados.unidades.length === 0) return null;

  const comFaturamento = dados.unidades.filter(
    (u) => u.comparativo && u.comparativo.atual.faturamento > 0
  );

  const media =
    comFaturamento.length > 0
      ? comFaturamento.reduce((t, u) => t + (u.comparativo?.atual.faturamento ?? 0), 0) /
        comFaturamento.length
      : 0;

  const itens: ItemBarra[] = comFaturamento
    .map((unidade) => {
      const faturamento = unidade.comparativo?.atual.faturamento ?? 0;
      const variacao = unidade.comparativo?.variacaoFaturamento;
      const significativo = unidade.comparativo?.testes.faturamento.significativo;

      return {
        nome: unidade.unidade,
        valor: faturamento,
        rotulo: formatarMoedaCurta(faturamento),
        apoio:
          variacao == null
            ? "sem período anterior para comparar"
            : significativo
              ? `${variacao >= 0 ? "▲" : "▼"} ${Math.abs(variacao).toFixed(1)}% contra o período anterior`
              : `${variacao >= 0 ? "▲" : "▼"} ${Math.abs(variacao).toFixed(1)}%, variação normal`,
        cor:
          unidade.status === "risco"
            ? "var(--crit)"
            : unidade.status === "atencao"
              ? "var(--warn)"
              : "var(--s1-graf)",
      };
    })
    .sort((a, b) => b.valor - a.valor);

  const emRisco = dados.unidades.filter((u) => u.status === "risco");

  return (
    <SecaoNumerada
      numero="08"
      titulo="Qual unidade está fora da curva?"
      apoio="Faturamento dos últimos dias lançados. A cor da barra é a situação do caixa, não do faturamento: vermelho é unidade que não fecha o período."
    >
      {itens.length > 0 && (
        <div className="rounded border border-ring bg-surface p-4">
          <BarrasRanking itens={itens} media={media} rotuloMedia="a média das unidades" />
        </div>
      )}

      {emRisco.length > 0 && (
        <ul className="mt-3 divide-y divide-ring rounded border border-ring bg-surface">
          {emRisco.map((unidade) => (
            <li key={unidade.unidade}>
              <Link
                href={`/unidade/${slugDaUnidade(unidade.unidade)}?periodo=${periodo}&de=${de}`}
                className="flex items-center gap-3 border-l-4 border-crit px-3 py-2.5"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">
                    {unidade.unidade}
                  </span>
                  <span className="block text-[11px] text-muted">
                    caixa negativo a partir de{" "}
                    {unidade.primeiroDiaNegativo &&
                      formatarDataCompleta(unidade.primeiroDiaNegativo)}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-[13px] font-semibold text-crit">
                  −{formatarMoedaCurta(unidade.faltaNoPior)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SecaoNumerada>
  );
}

/** Seção 09 — se eu só ler uma coisa, o que é? */
export function SecaoResumo({
  dados,
  linhas,
}: {
  dados: RespostaProjecao;
  linhas: string[];
}) {
  return (
    <SecaoNumerada
      numero="09"
      titulo="Se eu só ler uma coisa, o que é?"
      apoio={`Período de ${formatarDataCompleta(dados.inicio)} a ${formatarDataCompleta(dados.fim)}.`}
    >
      <ol className="space-y-2 rounded border border-ring bg-surface p-4">
        {linhas.map((linha, indice) => (
          <li key={indice} className="flex gap-3 text-[15px] leading-relaxed">
            <span className="shrink-0 font-mono text-muted">{indice + 1}</span>
            <span>{linha}</span>
          </li>
        ))}
      </ol>
    </SecaoNumerada>
  );
}

const TERMOS = [
  {
    id: "media-diaria",
    termo: "Média por dia",
    texto:
      "Faturamento do período dividido pelo número de dias com movimento. Permite comparar períodos de tamanhos diferentes sem confundir volume com duração.",
  },
  {
    id: "clientes-atendidos",
    termo: "Clientes atendidos",
    texto:
      "Soma da coluna Nº Clientes de cada dia. Conta pessoas por dia, então quem veio três vezes no mês aparece três vezes. Não é cliente único: a planilha ainda não identifica cliente.",
  },
  {
    id: "ticket-medio",
    termo: "Ticket médio",
    texto:
      "Faturamento dividido pela quantidade de atendimentos com pagamento. Sobe quando se vende serviço mais caro ou combo, cai quando se dá desconto.",
  },
  {
    id: "variacao-normal",
    termo: "Variação normal",
    texto:
      "A diferença entre os dois períodos não passou no teste estatístico (p abaixo de 0,05). O movimento varia tanto de um dia para o outro que uma diferença desse tamanho aparece por acaso.",
  },
  {
    id: "indice-mix",
    termo: "Índice ajustado pelo mix",
    texto:
      "Faturamento do profissional dividido pelo que ele faturaria fazendo os mesmos serviços ao preço médio da rede. Zero por cento é na média. Remove a vantagem de quem pega serviço mais caro.",
  },
  {
    id: "entra-em-conta",
    termo: "Entra em conta",
    texto:
      "Crédito, débito e pix menos as taxas. Dinheiro em espécie fica de fora porque não passa pela conta bancária.",
  },
  {
    id: "semana-aberta",
    termo: "Semana em aberto",
    texto:
      "Semana que ainda não terminou ou que tem dias sem lançamento. Aparece esmaecida e não entra na média de comparação.",
  },
  {
    id: "prova-60-dias",
    termo: "Prova em 60 dias",
    texto:
      "O indicador que precisa se mover se a decisão estiver certa. Serve para cobrar resultado sem discussão sobre o que era para acontecer.",
  },
];

/** Seção 10 — glossário, alvo dos "?" espalhados pelo painel. */
export function Glossario() {
  return (
    <SecaoNumerada
      numero="10"
      titulo="O que significa cada termo?"
      apoio="Cada ponto de interrogação do painel aponta para cá."
    >
      <dl className="divide-y divide-ring rounded border border-ring bg-surface">
        {TERMOS.map((item) => (
          <div key={item.id} id={`glossario-${item.id}`} className="scroll-mt-4 px-4 py-3">
            <dt className="font-medium">{item.termo}</dt>
            <dd className="mt-0.5 text-[13px] leading-relaxed text-ink2">{item.texto}</dd>
          </div>
        ))}
      </dl>
    </SecaoNumerada>
  );
}

/** Monta as frases do resumo executivo a partir do estado atual. */
export function montarResumo(
  dados: RespostaProjecao,
  decisoesTopo: string[]
): string[] {
  const linhas: string[] = [];
  const comparativo = dados.comparativoRede;

  if (comparativo) {
    const vf = comparativo.variacaoFaturamento;
    const significativo = comparativo.testes.faturamento.significativo;

    if (vf === null) {
      linhas.push(
        `A rede faturou ${formatarMoeda(comparativo.atual.faturamento)} nos últimos ${comparativo.dias} dias lançados. Ainda não há período anterior para comparar.`
      );
    } else if (significativo) {
      linhas.push(
        `A rede faturou ${formatarMoeda(comparativo.atual.faturamento)} nos últimos ${comparativo.dias} dias, ${Math.abs(vf).toFixed(1)}% ${vf > 0 ? "acima" : "abaixo"} do período anterior. A diferença é consistente, não é oscilação.`
      );
    } else {
      linhas.push(
        `A rede faturou ${formatarMoeda(comparativo.atual.faturamento)} nos últimos ${comparativo.dias} dias, em linha com o período anterior. A diferença de ${Math.abs(vf).toFixed(1)}% não resiste ao teste.`
      );
    }
  }

  const emRisco = dados.unidades.filter((u) => u.status === "risco");
  if (emRisco.length === 0) {
    linhas.push(
      `O caixa cobre tudo que vence no período, com ${formatarMoeda(dados.resumo.saldoFinal)} projetados no fim.`
    );
  } else {
    const falta = emRisco.reduce((t, u) => t + u.faltaNoPior, 0);
    linhas.push(
      `${emRisco.length} ${emRisco.length === 1 ? "unidade não fecha" : "unidades não fecham"} o período, faltando ${formatarMoeda(falta)} no total.`
    );
  }

  if (comparativo && comparativo.fatiaDinheiro >= 0.2) {
    linhas.push(
      `${(comparativo.fatiaDinheiro * 100).toFixed(0)}% do faturamento veio em espécie e não passa pela conta, então o saldo bancário fica sempre abaixo do faturamento.`
    );
  }

  for (const decisao of decisoesTopo.slice(0, 2)) {
    linhas.push(decisao);
  }

  return linhas;
}
