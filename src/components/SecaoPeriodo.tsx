"use client";

import Kpi from "./Kpi";
import GraficoJanelas from "./GraficoJanelas";
import { Cartao } from "./ui";
import { formatarDataCompleta, formatarMoeda, formatarMoedaCurta } from "@/lib/parse";
import type { Comparativo } from "@/lib/analise";

/**
 * Seção 01 — O período em números.
 * Responde: como foi o período, e o que mudou de verdade.
 */
export default function SecaoPeriodo({
  dados,
  parcial,
}: {
  dados: Comparativo;
  parcial?: boolean;
}) {
  const semBase = dados.anterior.diasComDado === 0;

  const mediaDiaria = dados.atual.faturamento / Math.max(1, dados.atual.diasComDado);
  const mediaDiariaAnterior =
    dados.anterior.faturamento / Math.max(1, dados.anterior.diasComDado);
  const variacaoMedia =
    mediaDiariaAnterior > 0
      ? ((mediaDiaria - mediaDiariaAnterior) / mediaDiariaAnterior) * 100
      : null;

  const leitura = montarLeitura(dados, variacaoMedia);

  return (
    <section className="mb-9">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b border-ring pb-2">
        <h2 className="flex items-baseline gap-2 text-[20px] font-semibold tracking-tight">
          <span className="rounded bg-chip px-1.5 py-0.5 text-[11px] font-bold text-muted">
            01
          </span>
          Como foi o período?
        </h2>
        <p className="text-[13px] text-muted">
          {formatarDataCompleta(dados.atual.inicio)} a{" "}
          {formatarDataCompleta(dados.atual.fim)}
        </p>
      </div>

      {parcial && (
        <p className="mb-3 rounded border-l-4 border-warn bg-warnSoft px-3 py-2 text-[13px] leading-relaxed text-ink2">
          Período em andamento. A janela termina no último dia que a planilha recebeu, e
          não hoje, para não comparar contra dias ainda não lançados.
        </p>
      )}

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          rotulo="Faturamento"
          valor={formatarMoeda(dados.atual.faturamento)}
          variacao={dados.variacaoFaturamento}
          teste={dados.testes.faturamento}
          contexto={
            semBase
              ? "sem período anterior para comparar"
              : `antes: ${formatarMoedaCurta(dados.anterior.faturamento)}`
          }
        />
        <Kpi
          rotulo="Média por dia"
          valor={formatarMoeda(mediaDiaria)}
          variacao={variacaoMedia}
          teste={dados.testes.faturamento}
          contexto={`${dados.atual.diasComDado} dias com movimento`}
          ajuda="media-diaria"
        />
        <Kpi
          rotulo="Atendimentos"
          valor={dados.atual.atendimentos.toLocaleString("pt-BR")}
          variacao={dados.variacaoAtendimentos}
          contexto={`${dados.atual.clientes.toLocaleString("pt-BR")} clientes atendidos`}
          ajuda="clientes-atendidos"
        />
        <Kpi
          rotulo="Ticket médio"
          valor={formatarMoeda(dados.atual.ticket)}
          variacao={dados.variacaoTicket}
          teste={dados.testes.ticket}
          contexto="faturamento dividido por atendimento"
          ajuda="ticket-medio"
        />
      </div>

      <div className="mb-4 rounded border border-ring bg-surface p-4">
        <p className="mb-3 text-[13px] leading-relaxed text-ink2">
          Cada barra é um dia. As cinzas são o período anterior, as azuis o atual. A linha
          laranja marca a média diária de agora.
        </p>
        <GraficoJanelas dados={dados} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {leitura.map((item, indice) => (
          <Cartao key={indice} tom={item.tom}>
            <div className="px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                {item.etiqueta}
              </p>
              <p className="mt-0.5 font-semibold leading-snug">{item.titulo}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink2">{item.texto}</p>
            </div>
          </Cartao>
        ))}
      </div>
    </section>
  );
}

type Leitura = {
  etiqueta: string;
  titulo: string;
  texto: string;
  tom: "risco" | "folga" | "neutro";
};

/** Cartões de leitura: conclusão no título, número em seguida. */
function montarLeitura(dados: Comparativo, variacaoMedia: number | null): Leitura[] {
  const cartoes: Leitura[] = [];
  const vf = dados.variacaoFaturamento;
  const teste = dados.testes.faturamento;

  if (vf !== null && teste.testavel && !teste.significativo && Math.abs(vf) >= 3) {
    cartoes.push({
      etiqueta: "Como ler",
      titulo: `Os ${Math.abs(vf).toFixed(1)}% de diferença são oscilação, não tendência`,
      texto:
        `O movimento varia muito de um dia para o outro, e uma diferença desse tamanho ` +
        `aparece por acaso com frequência. Só vale tratar como mudança de patamar se ` +
        `o próximo período repetir.`,
      tom: "neutro",
    });
  }

  if (vf !== null && teste.significativo) {
    const subiu = vf > 0;
    cartoes.push({
      etiqueta: subiu ? "Oportunidade" : "Alerta",
      titulo: subiu
        ? `O faturamento subiu ${vf.toFixed(1)}% e a alta é consistente`
        : `O faturamento caiu ${Math.abs(vf).toFixed(1)}% e a queda é consistente`,
      texto: subiu
        ? `A média diária passou de ${formatarMoedaCurta(dados.anterior.faturamento / Math.max(1, dados.anterior.diasComDado))} para ${formatarMoedaCurta(dados.atual.faturamento / Math.max(1, dados.atual.diasComDado))}. Vale olhar o que mudou no mix de serviços e repetir.`
        : `A média diária caiu de ${formatarMoedaCurta(dados.anterior.faturamento / Math.max(1, dados.anterior.diasComDado))} para ${formatarMoedaCurta(dados.atual.faturamento / Math.max(1, dados.atual.diasComDado))}. A diferença aparece na maioria dos dias, não em um dia ruim isolado.`,
      tom: subiu ? "folga" : "risco",
    });
  }

  const vt = dados.variacaoTicket;
  const va = dados.variacaoAtendimentos;
  if (vt !== null && va !== null && va > 3 && vt < -3) {
    cartoes.push({
      etiqueta: "Alerta",
      titulo: "Está vindo mais gente e entrando menos por atendimento",
      texto:
        `Os atendimentos subiram ${va.toFixed(1)}% e o ticket caiu ${Math.abs(vt).toFixed(1)}%. ` +
        `Costuma ser desconto, ou troca de combo por serviço simples.`,
      tom: "risco",
    });
  }

  if (dados.fatiaDinheiro >= 0.25) {
    cartoes.push({
      etiqueta: "Como ler",
      titulo: `${(dados.fatiaDinheiro * 100).toFixed(0)}% do faturamento não passa pela conta`,
      texto:
        `${formatarMoeda(dados.atual.dinheiro)} vieram em espécie. Esse dinheiro não ` +
        `aparece no saldo bancário e não paga boleto, então o caixa da conta fica ` +
        `sempre abaixo do faturamento.`,
      tom: "neutro",
    });
  }

  if (cartoes.length === 0 && variacaoMedia !== null) {
    cartoes.push({
      etiqueta: "Como ler",
      titulo: "O período veio em linha com o anterior",
      texto:
        `A média diária ficou em ${formatarMoedaCurta(dados.atual.faturamento / Math.max(1, dados.atual.diasComDado))}, ` +
        `sem diferença que resista ao teste. Nada aqui pede ação.`,
      tom: "neutro",
    });
  }

  return cartoes.slice(0, 2);
}
