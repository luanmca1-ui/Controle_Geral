"use client";

import BarrasRanking, { type ItemBarra } from "./BarrasRanking";
import { SecaoNumerada } from "./ui";
import { formatarMoeda, formatarMoedaCurta } from "@/lib/parse";
import type { BarbeiroAjustado, ServicoResumo } from "@/lib/agregacoes";

/** Seção 05 — o que vende e o que sobra depois da comissão? */
export function SecaoServicos({ servicos }: { servicos: ServicoResumo[] }) {
  if (servicos.length === 0) return null;

  const principais = servicos.slice(0, 8);
  const totalLiquido = servicos.reduce((t, s) => t + s.liquido, 0);
  const lider = servicos[0];

  const itens: ItemBarra[] = principais.map((servico) => ({
    nome: servico.nome,
    valor: servico.faturamento,
    rotulo: formatarMoedaCurta(servico.faturamento),
    apoio:
      `${servico.quantidade} atendimentos, ticket ${formatarMoeda(servico.ticket)}, ` +
      `sobra ${formatarMoedaCurta(servico.liquido)} depois da comissão de ` +
      `${(servico.percentualComissao * 100).toFixed(0)}%`,
  }));

  return (
    <SecaoNumerada
      numero="05"
      titulo="O que vende e o que sobra?"
      apoio={
        <>
          Margem de verdade depende de custo fixo, que a planilha não tem. O que dá para
          calcular é quanto sobra depois de pagar o profissional, e é isso que está aqui.
        </>
      }
      acao={
        <span className="font-mono text-[13px] text-ink2">
          {formatarMoeda(totalLiquido)} líquido
        </span>
      }
    >
      <div className="rounded border border-ring bg-surface p-4">
        <BarrasRanking itens={itens} />
      </div>

      {lider.participacao > 0.5 && (
        <div className="mt-3 rounded border border-ring border-l-4 border-l-s1 bg-surface p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            Como ler
          </p>
          <p className="mt-0.5 font-semibold leading-snug">
            &quot;{lider.nome}&quot; é {(lider.participacao * 100).toFixed(0)}% do
            faturamento
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-ink2">
            Depender de um serviço só deixa o faturamento preso ao ticket dele, que é{" "}
            {formatarMoeda(lider.ticket)}. Combo e serviço adicional são o caminho mais
            curto para subir o ticket sem precisar de mais gente na cadeira.
          </p>
        </div>
      )}
    </SecaoNumerada>
  );
}

/** Seção 06 — quem produz mais, comparado com justiça? */
export function SecaoBarbeiros({ barbeiros }: { barbeiros: BarbeiroAjustado[] }) {
  if (barbeiros.length === 0) return null;

  const comparaveis = barbeiros.filter((b) => !b.amostraPequena);
  const fora = barbeiros.filter((b) => b.amostraPequena);

  const ordenados = [...comparaveis].sort((a, b) => b.indice - a.indice);

  const itens: ItemBarra[] = ordenados.map((barbeiro) => ({
    nome: barbeiro.profissional,
    valor: barbeiro.indice,
    rotulo: `${barbeiro.indice >= 1 ? "+" : ""}${((barbeiro.indice - 1) * 100).toFixed(0)}%`,
    apoio:
      `${formatarMoedaCurta(barbeiro.faturamento)} em ${barbeiro.atendimentos} atendimentos, ` +
      `contra ${formatarMoedaCurta(barbeiro.esperado)} esperados pelo mix dele`,
    cor: barbeiro.indice >= 1 ? "var(--s3-graf)" : "var(--s2-graf)",
  }));

  return (
    <SecaoNumerada
      numero="06"
      titulo="Quem produz mais, comparado com justiça?"
      apoio={
        <>
          Comparar faturamento cru pune quem só faz corte e premia quem pega química. Aqui
          cada profissional é medido contra o que faturaria fazendo os mesmos serviços ao
          preço médio da rede. Zero por cento é exatamente na média.
        </>
      }
    >
      {comparaveis.length === 0 ? (
        <p className="rounded border border-ring bg-surface px-4 py-6 text-center text-[13px] text-ink2">
          Nenhum profissional com atendimentos suficientes para comparar no período.
        </p>
      ) : (
        <div className="rounded border border-ring bg-surface p-4">
          <BarrasRanking itens={itens} media={1} rotuloMedia="a média da rede" />
        </div>
      )}

      {fora.length > 0 && (
        <div className="mt-3 rounded border border-ring bg-surface p-3">
          <p className="text-[13px] font-medium">
            Fora do ranking por amostra pequena
          </p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-ink2">
            Menos de 30 atendimentos no período. Com poucos atendimentos, um serviço caro
            ou uma semana de folga muda o número inteiro.
          </p>
          <ul className="mt-2 space-y-1 opacity-60">
            {fora.map((barbeiro) => (
              <li
                key={`${barbeiro.unidade}-${barbeiro.profissional}`}
                className="flex items-baseline justify-between gap-3 text-[13px]"
              >
                <span className="min-w-0 truncate">{barbeiro.profissional}</span>
                <span className="shrink-0 font-mono">
                  {barbeiro.atendimentos} atend., {formatarMoedaCurta(barbeiro.faturamento)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-2 text-[11px] leading-relaxed text-muted">
        Retorno de cliente e avaliação ainda não entram aqui: a planilha não tem
        identificação de cliente nem nota de atendimento.
      </p>
    </SecaoNumerada>
  );
}
