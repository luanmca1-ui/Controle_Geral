"use client";

import type { ReactNode } from "react";
import type { Resultado } from "@/lib/estatistica";

/**
 * Cartão de KPI no padrão do briefing.
 *
 * A variação só aparece colorida quando o teste diz que a diferença resiste
 * ao acaso. Quando não resiste, vai em cinza e escrito "variação normal":
 * o número continua à vista, mas sem sugerir que houve mudança.
 */
export default function Kpi({
  rotulo,
  valor,
  contexto,
  variacao,
  teste,
  /** true quando subir é ruim, como a fatia recebida em dinheiro */
  inverso = false,
  ajuda,
}: {
  rotulo: string;
  valor: string;
  contexto?: ReactNode;
  variacao?: number | null;
  teste?: Resultado;
  inverso?: boolean;
  ajuda?: string;
}) {
  const temVariacao = variacao !== null && variacao !== undefined;
  const significativo = teste ? teste.significativo : true;
  const subiu = (variacao ?? 0) >= 0;
  const melhorou = inverso ? !subiu : subiu;

  return (
    <div className="rounded border border-ring bg-surface p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
        {rotulo}
        {ajuda && (
          <a
            href={`#glossario-${ajuda}`}
            className="ml-1 text-muted underline underline-offset-2"
            aria-label={`O que é ${rotulo}`}
          >
            ?
          </a>
        )}
      </p>

      <p className="mt-0.5 text-[30px] font-bold leading-10 tracking-tight tabular">
        {valor}
      </p>

      {temVariacao &&
        (significativo ? (
          <p
            className={`text-[13px] font-medium ${melhorou ? "text-good" : "text-crit"}`}
          >
            {subiu ? "▲" : "▼"} {Math.abs(variacao).toFixed(1)}%{" "}
            <span className="font-normal text-muted">vs período anterior</span>
          </p>
        ) : (
          <p className="text-[13px] text-muted">
            {subiu ? "▲" : "▼"} {Math.abs(variacao).toFixed(1)}%, variação normal
          </p>
        ))}

      {temVariacao && teste && !teste.testavel && (
        <p className="text-[13px] text-muted">amostra pequena demais para comparar</p>
      )}

      {contexto && <p className="mt-1 text-[13px] leading-snug text-ink2">{contexto}</p>}
    </div>
  );
}
