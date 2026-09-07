"use client";

import { useMemo, useState } from "react";
import {
  formatarDataCurta,
  formatarMesCurto,
  formatarMesLongo,
  formatarMoeda,
  hojeEmSaoPaulo,
  mesDaData,
} from "@/lib/parse";
import type { Conta } from "@/lib/types";

/**
 * Pendencias separadas por mes de vencimento.
 *
 * O mes corrente abre selecionado e o total do cabecalho segue a aba aberta.
 * Sem isso, uma baixa esquecida de um ano atras entra no mesmo total do que
 * venceu esta semana, e o numero deixa de servir para decidir qualquer coisa.
 */
export default function Pendencias({ contas }: { contas: Conta[] }) {
  const mesAtual = mesDaData(hojeEmSaoPaulo());

  const meses = useMemo(() => {
    const grupos = new Map<string, Conta[]>();
    for (const conta of contas) {
      if (!conta.vencimento) continue;
      const chave = mesDaData(conta.vencimento);
      const lista = grupos.get(chave);
      if (lista) lista.push(conta);
      else grupos.set(chave, [conta]);
    }
    // o mes corrente sempre aparece, mesmo zerado: e a boa noticia
    if (!grupos.has(mesAtual)) grupos.set(mesAtual, []);

    return [...grupos.entries()]
      .map(([chave, lista]) => ({
        chave,
        contas: lista.sort((a, b) => (a.vencimento! < b.vencimento! ? -1 : 1)),
        total: lista.reduce((soma, conta) => soma + conta.valor, 0),
      }))
      .sort((a, b) => (a.chave < b.chave ? -1 : 1));
  }, [contas, mesAtual]);

  const [selecionado, setSelecionado] = useState(mesAtual);
  const aberto = meses.find((mes) => mes.chave === selecionado) ?? meses[meses.length - 1];

  const totalGeral = contas.reduce((soma, conta) => soma + conta.valor, 0);
  const anteriores = meses.filter((mes) => mes.chave < mesAtual);
  const totalAnteriores = anteriores.reduce((soma, mes) => soma + mes.total, 0);

  if (!aberto) return null;

  return (
    <section>
      <h2 className="mb-1 text-lg font-semibold">
        Pendências
        <span
          className={`ml-2 font-mono text-sm font-normal ${
            aberto.total > 0 ? "text-risco" : "text-folga"
          }`}
        >
          {formatarMoeda(aberto.total)}
        </span>
      </h2>
      <p className="mb-2 text-sm text-grafite">
        Venceram e não foram pagas. O valor acima é só de{" "}
        {formatarMesLongo(aberto.chave)}
        {meses.length > 1 && ", troque o mês para ver os outros"}.
      </p>

      {meses.length > 1 && (
        <div
          className="mb-2 flex gap-1 overflow-x-auto border-b border-linha pb-px"
          role="tablist"
          aria-label="Mês de vencimento"
        >
          {meses.map((mes) => {
            const ativo = mes.chave === aberto.chave;
            const ehAtual = mes.chave === mesAtual;
            return (
              <button
                key={mes.chave}
                type="button"
                role="tab"
                aria-selected={ativo}
                onClick={() => setSelecionado(mes.chave)}
                className={`shrink-0 border-b-2 px-3 py-1.5 text-sm ${
                  ativo
                    ? "border-pinho font-semibold text-pinho"
                    : "border-transparent text-grafite"
                }`}
              >
                {formatarMesCurto(mes.chave)}
                {ehAtual && <span className="ml-1 text-[10px] uppercase">atual</span>}
                {mes.contas.length > 0 && (
                  <span className="ml-1 text-xs text-grafite">({mes.contas.length})</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {aberto.contas.length === 0 ? (
        <p className="border border-dashed border-linha px-4 py-6 text-center text-sm text-grafite">
          Nenhuma conta vencida em aberto em {formatarMesLongo(aberto.chave)}.
        </p>
      ) : (
        <ul className="divide-y divide-linha border border-linha bg-superficie">
          {aberto.contas.map((conta) => (
            <li key={conta.id} className="flex items-baseline gap-3 px-3 py-2.5 text-sm">
              <span className="w-14 shrink-0 text-grafite">
                {conta.vencimento ? formatarDataCurta(conta.vencimento) : ""}
              </span>
              <span className="min-w-0 flex-1">
                {conta.favorecido}
                <span className="block truncate text-grafite">{conta.categoria}</span>
              </span>
              <span className="font-mono">{formatarMoeda(conta.valor)}</span>
            </li>
          ))}
        </ul>
      )}

      {totalAnteriores > 0 && aberto.chave === mesAtual && (
        <p className="mt-2 border-l-2 border-atencao bg-superficie px-3 py-2 text-sm text-grafite">
          Há mais {formatarMoeda(totalAnteriores)} em {anteriores.length}{" "}
          {anteriores.length === 1 ? "mês anterior" : "meses anteriores"}, fora deste total.
          Vale conferir se são dívidas mesmo ou baixas que não foram dadas na planilha.
        </p>
      )}

      {meses.length > 1 && (
        <p className="mt-2 text-xs text-grafite">
          Total de todos os meses: {formatarMoeda(totalGeral)}
        </p>
      )}
    </section>
  );
}
