"use client";

import { formatarDataCurta, formatarMoedaCurta } from "@/lib/parse";
import type { Comparativo } from "@/lib/analise";

/**
 * Faturamento diário das duas janelas, lado a lado na mesma escala.
 *
 * O eixo começa no zero, como manda o briefing: em barras, cortar a base
 * multiplica visualmente qualquer diferença pequena.
 */
export default function GraficoJanelas({ dados }: { dados: Comparativo }) {
  const serieAnterior = dados.anterior.serieDiaria;
  const serieAtual = dados.atual.serieDiaria;

  if (serieAtual.length === 0) return null;

  const largura = 700;
  const altura = 150;
  const base = altura - 22;
  const maior = Math.max(...serieAnterior, ...serieAtual, 1);

  const total = serieAnterior.length + serieAtual.length;
  const passo = largura / total;
  const corte = passo * serieAnterior.length;

  const mediaAtual = dados.atual.faturamento / Math.max(1, serieAtual.length);
  const yMedia = base - (mediaAtual / maior) * base;

  function barras(serie: number[], deslocamento: number, cor: string, opacidade: number) {
    return serie.map((valor, indice) => {
      const h = (valor / maior) * base;
      return (
        <rect
          key={`${cor}-${indice}`}
          x={passo * (deslocamento + indice) + passo * 0.15}
          y={base - h}
          width={passo * 0.7}
          height={Math.max(h, valor > 0 ? 1 : 0)}
          fill={cor}
          opacity={opacidade}
        >
          <title>{formatarMoedaCurta(valor)}</title>
        </rect>
      );
    });
  }

  return (
    <figure>
      <svg
        viewBox={`0 0 ${largura} ${altura}`}
        className="h-auto w-full"
        role="img"
        aria-label="Faturamento diário do período atual contra o anterior"
      >
        {barras(serieAnterior, 0, "var(--muted)", 0.55)}
        {barras(serieAtual, serieAnterior.length, "var(--s1-graf)", 1)}

        {/* linha da base, onde o eixo começa */}
        <line x1="0" x2={largura} y1={base} y2={base} stroke="var(--ring)" strokeWidth="1" />

        {/* divisa entre as duas janelas */}
        {serieAnterior.length > 0 && (
          <line
            x1={corte}
            x2={corte}
            y1="0"
            y2={base}
            stroke="var(--ink2)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        )}

        {/* média diária da janela atual */}
        <line
          x1={corte}
          x2={largura}
          y1={yMedia}
          y2={yMedia}
          stroke="var(--s2)"
          strokeWidth="1.5"
          strokeDasharray="5 3"
        />
        <text x={largura - 4} y={yMedia - 5} fontSize="10" textAnchor="end" fill="var(--s2)">
          média {formatarMoedaCurta(mediaAtual)} por dia
        </text>

        <text x="2" y={altura - 6} fontSize="10" fill="var(--muted)">
          {formatarDataCurta(dados.anterior.inicio)}
        </text>
        <text x={corte + 4} y={altura - 6} fontSize="10" fill="var(--ink2)">
          {formatarDataCurta(dados.atual.inicio)}
        </text>
        <text x={largura - 2} y={altura - 6} fontSize="10" textAnchor="end" fill="var(--ink2)">
          {formatarDataCurta(dados.atual.fim)}
        </text>
      </svg>

      <figcaption className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-4 bg-muted opacity-60" />
          período anterior
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-4 bg-s1" />
          período atual
        </span>
        <span>cada barra é um dia com movimento</span>
      </figcaption>
    </figure>
  );
}
