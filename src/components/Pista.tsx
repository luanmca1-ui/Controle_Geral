"use client";

import { formatarDataCurta, formatarMoedaCurta, ROTULO_DIA_CURTO } from "@/lib/parse";
import type { DiaProjecao } from "@/lib/types";

/**
 * A pista de dias e o elemento central do painel: mostra o saldo projetado
 * dia a dia e onde ele fura. Dias negativos recebem a faixa diagonal.
 */
export default function Pista({
  dias,
  reservaMinima,
  aoSelecionar,
  selecionado,
}: {
  dias: DiaProjecao[];
  reservaMinima: number;
  aoSelecionar?: (data: string) => void;
  selecionado?: string | null;
}) {
  if (dias.length === 0) return null;

  const valores = dias.map((d) => d.saldoFinal);
  const maior = Math.max(...valores, reservaMinima, 0);
  const menor = Math.min(...valores, 0);
  const amplitude = maior - menor || 1;

  const alturaTotal = 132;
  const linhaZero = ((maior - 0) / amplitude) * alturaTotal;

  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute inset-x-0 border-t border-dashed border-grafite/50"
        style={{ top: `${linhaZero}px` }}
        aria-hidden="true"
      />
      <ol
        className="flex items-stretch gap-[3px] overflow-x-auto pb-1"
        style={{ height: `${alturaTotal}px` }}
      >
        {dias.map((dia) => {
          const positivo = dia.saldoFinal >= 0;
          const altura = Math.max(
            3,
            (Math.abs(dia.saldoFinal) / amplitude) * alturaTotal
          );
          const abaixoDaReserva = positivo && dia.saldoFinal < reservaMinima;
          const ativo = selecionado === dia.data;

          return (
            <li key={dia.data} className="flex min-w-[26px] flex-1 flex-col">
              <button
                type="button"
                onClick={() => aoSelecionar?.(dia.data)}
                className="relative flex h-full w-full flex-col justify-start"
                aria-label={`${formatarDataCurta(dia.data)}: saldo ${formatarMoedaCurta(dia.saldoFinal)}`}
                title={`${formatarDataCurta(dia.data)} — ${formatarMoedaCurta(dia.saldoFinal)}`}
              >
                <span
                  className="block w-full"
                  style={{ height: `${positivo ? linhaZero - altura : linhaZero}px` }}
                />
                <span
                  className={`block w-full ${
                    !positivo
                      ? "faixa-risco"
                      : abaixoDaReserva
                        ? "bg-atencao"
                        : "bg-folga"
                  } ${ativo ? "ring-2 ring-tinta ring-offset-1" : ""}`}
                  style={{ height: `${altura}px` }}
                />
              </button>
            </li>
          );
        })}
      </ol>
      <ol className="flex gap-[3px] overflow-x-auto text-[10px] text-grafite">
        {dias.map((dia) => (
          <li key={dia.data} className="min-w-[26px] flex-1 text-center leading-tight">
            <span className="block">{ROTULO_DIA_CURTO[dia.diaSemana]}</span>
            <span className="block">{formatarDataCurta(dia.data).slice(0, 2)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
