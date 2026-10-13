"use client";

export interface ItemBarra {
  nome: string;
  valor: number;
  /** texto que aparece ao lado da barra */
  rotulo: string;
  apoio?: string;
  /** desenha esmaecido e fora da leitura principal */
  esmaecido?: boolean;
  cor?: string;
}

/**
 * Ranking em barras horizontais, ordenado, com o valor ao lado da barra e
 * uma linha vertical na média geral. O eixo começa no zero.
 */
export default function BarrasRanking({
  itens,
  media,
  rotuloMedia,
}: {
  itens: ItemBarra[];
  media?: number;
  rotuloMedia?: string;
}) {
  if (itens.length === 0) return null;

  const maior = Math.max(...itens.map((item) => item.valor), media ?? 0, 1);

  return (
    <div>
      {media !== undefined && (
        <p className="mb-2 text-[11px] text-muted">
          A linha tracejada marca {rotuloMedia ?? "a média"}.
        </p>
      )}

      <ul className="space-y-2.5">
        {itens.map((item) => {
          const fracao = item.valor / maior;
          const posicaoMedia = media !== undefined ? (media / maior) * 100 : null;

          return (
            <li key={item.nome} className={item.esmaecido ? "opacity-50" : ""}>
              <div className="mb-1 flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-[13px] font-medium">
                  {item.nome}
                </span>
                <span className="shrink-0 font-mono text-[13px]">{item.rotulo}</span>
              </div>

              <div className="relative h-3.5 w-full bg-chip">
                <div
                  className="h-full"
                  style={{
                    width: `${Math.max(0, Math.min(1, fracao)) * 100}%`,
                    background: item.cor ?? "var(--s1-graf)",
                  }}
                />
                {posicaoMedia !== null && (
                  <span
                    className="absolute top-0 h-full border-l border-dashed border-ink2"
                    style={{ left: `${Math.min(100, posicaoMedia)}%` }}
                    aria-hidden="true"
                  />
                )}
              </div>

              {item.apoio && (
                <p className="mt-0.5 text-[11px] text-muted">{item.apoio}</p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
