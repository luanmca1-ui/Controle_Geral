"use client";

import Sparkline from "./Sparkline";
import { SecaoNumerada } from "./ui";
import { formatarDataCurta, formatarMoeda, formatarMoedaCurta } from "@/lib/parse";
import type { MesResumo, SemanaResumo } from "@/lib/agregacoes";

const MES_CURTO = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

function rotuloMes(chave: string): string {
  const [ano, mes] = chave.split("-");
  return `${MES_CURTO[Number(mes) - 1]}/${ano.slice(2)}`;
}

/** Seção 03 — a tendência é de alta ou de queda? */
export function SecaoEvolucao({ meses }: { meses: MesResumo[] }) {
  if (meses.length < 2) return null;

  const rotulos = meses.map((m) => rotuloMes(m.mes));
  const parciais = meses.map((m) => m.parcial);
  const ultimo = meses[meses.length - 1];
  const temParcial = parciais.some(Boolean);

  const painéis = [
    {
      titulo: "Faturamento",
      valores: meses.map((m) => m.faturamento),
      atual: formatarMoeda(ultimo.faturamento),
      formatar: formatarMoedaCurta,
    },
    {
      titulo: "Atendimentos",
      valores: meses.map((m) => m.atendimentos),
      atual: ultimo.atendimentos.toLocaleString("pt-BR"),
      formatar: (v: number) => v.toLocaleString("pt-BR"),
    },
    {
      titulo: "Ticket médio",
      valores: meses.map((m) => m.ticket),
      atual: formatarMoeda(ultimo.ticket),
      formatar: formatarMoeda,
    },
    {
      titulo: "Recebido em dinheiro",
      valores: meses.map((m) => (m.faturamento > 0 ? (m.dinheiro / m.faturamento) * 100 : 0)),
      atual: `${ultimo.faturamento > 0 ? ((ultimo.dinheiro / ultimo.faturamento) * 100).toFixed(0) : 0}%`,
      formatar: (v: number) => `${v.toFixed(0)}%`,
    },
  ];

  return (
    <SecaoNumerada
      numero="03"
      titulo="A tendência é de alta ou de queda?"
      apoio={
        temParcial
          ? "Últimos meses lançados. O ponto vazado é mês incompleto, então não vale como queda."
          : "Últimos meses lançados."
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {painéis.map((painel) => (
          <div key={painel.titulo} className="rounded border border-ring bg-surface p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              {painel.titulo}
            </p>
            <p className="mb-1 text-lg font-bold tracking-tight tabular">{painel.atual}</p>
            <Sparkline
              valores={painel.valores}
              parciais={parciais}
              rotulos={rotulos}
              formatar={painel.formatar}
            />
            <p className="mt-1 flex justify-between text-[11px] text-muted">
              <span>{rotulos[0]}</span>
              <span>{rotulos[rotulos.length - 1]}</span>
            </p>
          </div>
        ))}
      </div>
    </SecaoNumerada>
  );
}

/** Seção 04 — que semana foi melhor, de verdade? */
export function SecaoSemanas({ semanas }: { semanas: SemanaResumo[] }) {
  if (semanas.length < 2) return null;

  const maior = Math.max(...semanas.map((s) => s.mediaDiaria), 1);
  const fechadas = semanas.filter((s) => s.completa);
  const media =
    fechadas.length > 0
      ? fechadas.reduce((t, s) => t + s.mediaDiaria, 0) / fechadas.length
      : 0;

  const largura = 700;
  const altura = 160;
  const base = altura - 30;
  const passo = largura / semanas.length;

  return (
    <SecaoNumerada
      numero="04"
      titulo="Que semana foi melhor, de verdade?"
      apoio="Média por dia, e não total da semana. Semana com menos dias lançados teria total menor mesmo rendendo igual."
    >
      <div className="rounded border border-ring bg-surface p-4">
        <svg
          viewBox={`0 0 ${largura} ${altura}`}
          className="h-auto w-full"
          role="img"
          aria-label="Média diária de faturamento por semana"
        >
          {semanas.map((semana, indice) => {
            const h = (semana.mediaDiaria / maior) * base;
            return (
              <g key={semana.inicio}>
                <rect
                  x={passo * indice + passo * 0.18}
                  y={base - h}
                  width={passo * 0.64}
                  height={Math.max(h, 1)}
                  fill={semana.completa ? "var(--s1-graf)" : "var(--muted)"}
                  opacity={semana.completa ? 1 : 0.45}
                >
                  <title>
                    {formatarDataCurta(semana.inicio)} a {formatarDataCurta(semana.fim)}:{" "}
                    {formatarMoedaCurta(semana.mediaDiaria)} por dia em{" "}
                    {semana.diasComDado} dias
                    {semana.completa ? "" : " (semana em aberto)"}
                  </title>
                </rect>
                <text
                  x={passo * (indice + 0.5)}
                  y={altura - 16}
                  fontSize="10"
                  textAnchor="middle"
                  fill="var(--muted)"
                >
                  {formatarDataCurta(semana.inicio)}
                </text>
                <text
                  x={passo * (indice + 0.5)}
                  y={altura - 4}
                  fontSize="9"
                  textAnchor="middle"
                  fill="var(--muted)"
                >
                  {semana.diasComDado}d
                </text>
              </g>
            );
          })}

          <line x1="0" x2={largura} y1={base} y2={base} stroke="var(--ring)" strokeWidth="1" />

          {media > 0 && (
            <>
              <line
                x1="0"
                x2={largura}
                y1={base - (media / maior) * base}
                y2={base - (media / maior) * base}
                stroke="var(--s2)"
                strokeWidth="1.5"
                strokeDasharray="5 3"
              />
              <text
                x={largura - 4}
                y={base - (media / maior) * base - 5}
                fontSize="10"
                textAnchor="end"
                fill="var(--s2)"
              >
                média das semanas fechadas: {formatarMoedaCurta(media)} por dia
              </text>
            </>
          )}
        </svg>

        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-4 bg-s1" />
            semana fechada
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-4 bg-muted opacity-50" />
            semana em aberto, não comparável
          </span>
          <span>o número embaixo é quantos dias tiveram movimento</span>
        </p>
      </div>
    </SecaoNumerada>
  );
}
