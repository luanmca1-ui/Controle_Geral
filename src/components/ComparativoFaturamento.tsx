"use client";

import { Barra, Delta } from "./ui";
import { formatarDataCurta, formatarMoeda, formatarMoedaCurta } from "@/lib/parse";
import type { Comparativo } from "@/lib/analise";

/**
 * Faturamento dos últimos N dias lançados contra os N anteriores.
 * As duas barras usam a mesma escala, então a diferença de comprimento é a
 * diferença real. Percentual isolado esconde a ordem de grandeza.
 */
export default function ComparativoFaturamento({ dados }: { dados: Comparativo }) {
  const maior = Math.max(dados.atual.faturamento, dados.anterior.faturamento, 1);
  const semBase = dados.anterior.diasComDado === 0;

  return (
    <div className="border border-linha bg-superficie p-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <p className="text-[28px] font-semibold leading-9 tracking-tight">
          {formatarMoeda(dados.atual.faturamento)}
        </p>
        {dados.variacaoFaturamento !== null && (
          <Delta valor={dados.variacaoFaturamento} />
        )}
      </div>

      <div className="space-y-2">
        <div>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
            <span className="text-tinta">
              {formatarDataCurta(dados.atual.inicio)} a {formatarDataCurta(dados.atual.fim)}
            </span>
            <span className="font-mono text-grafite">
              {formatarMoedaCurta(dados.atual.faturamento)}
            </span>
          </div>
          <Barra fracao={dados.atual.faturamento / maior} />
        </div>

        <div>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-xs text-grafite">
            <span>
              {formatarDataCurta(dados.anterior.inicio)} a{" "}
              {formatarDataCurta(dados.anterior.fim)}
            </span>
            <span className="font-mono">
              {semBase ? "sem dados" : formatarMoedaCurta(dados.anterior.faturamento)}
            </span>
          </div>
          <Barra fracao={dados.anterior.faturamento / maior} tom="neutro" />
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-linha pt-3">
        <div>
          <dt className="text-xs text-grafite">Atendimentos</dt>
          <dd className="font-mono text-sm font-medium">{dados.atual.atendimentos}</dd>
          {dados.variacaoAtendimentos !== null && (
            <Delta valor={dados.variacaoAtendimentos} />
          )}
        </div>
        <div>
          <dt className="text-xs text-grafite">Ticket médio</dt>
          <dd className="font-mono text-sm font-medium">
            {formatarMoeda(dados.atual.ticket)}
          </dd>
          {dados.variacaoTicket !== null && <Delta valor={dados.variacaoTicket} />}
        </div>
        <div>
          <dt className="text-xs text-grafite">Em dinheiro</dt>
          <dd className="font-mono text-sm font-medium">
            {(dados.fatiaDinheiro * 100).toFixed(0)}%
          </dd>
          <p className="text-xs text-grafite">fora da conta</p>
        </div>
      </dl>
    </div>
  );
}
