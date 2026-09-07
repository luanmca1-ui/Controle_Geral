"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import GraficoCaixa from "@/components/GraficoCaixa";
import Avisos from "@/components/Avisos";
import SeletorPeriodo from "@/components/SeletorPeriodo";
import { Carregando, Erro, Vazio } from "@/components/Estado";
import { useProjecao } from "@/components/useProjecao";
import {
  formatarDataCurta,
  formatarMoeda,
  formatarMoedaCurta,
  hojeEmSaoPaulo,
  slugDaUnidade,
} from "@/lib/parse";
import type { DiaProjecao, ProjecaoUnidade } from "@/lib/types";

const CORES = {
  ok: "border-folga",
  atencao: "border-atencao",
  risco: "border-risco",
} as const;

const ROTULO_STATUS = {
  ok: "Caixa cobre o período",
  atencao: "Abaixo da reserva",
  risco: "Não cobre",
} as const;

/** Soma o saldo projetado de todas as unidades, dia a dia. */
function consolidar(unidades: ProjecaoUnidade[]): DiaProjecao[] {
  if (unidades.length === 0) return [];
  const base = unidades[0].dias;

  return base.map((dia, indice) => {
    let entrada = 0;
    let saida = 0;
    let saldoFinal = 0;
    // o dia so conta como realizado se todas as unidades ja lancaram
    let real = unidades.length > 0;
    for (const unidade of unidades) {
      const doDia = unidade.dias[indice];
      if (!doDia) continue;
      entrada += doDia.entrada;
      saida += doDia.saida;
      saldoFinal += doDia.saldoFinal;
      if (!doDia.real) real = false;
    }
    return { ...dia, contas: [], entrada, saida, saldoFinal, real };
  });
}

export default function PaginaCaixa() {
  const [periodo, setPeriodo] = useState("sete");
  const [de, setDe] = useState(hojeEmSaoPaulo);
  const { dados, carregando, erro } = useProjecao(periodo, de);

  const consolidado = useMemo(
    () => (dados ? consolidar(dados.unidades) : []),
    [dados]
  );

  return (
    <main className="py-5">
      <header className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Caixa da rede</h1>
        <p className="mt-0.5 text-sm text-grafite">
          Saldo em conta mais o que deve entrar, contra o que vence no período.
        </p>
      </header>

      <div className="mb-5">
        <SeletorPeriodo periodo={periodo} de={de} aoMudar={setPeriodo} aoMudarDe={setDe} />
      </div>

      {carregando && <Carregando />}
      {erro && <Erro mensagem={erro} />}

      {dados && !carregando && (
        <>
          <section className="mb-5 border border-linha bg-superficie p-4">
            <p className="text-sm text-grafite">
              {formatarDataCurta(dados.inicio)} a {formatarDataCurta(dados.fim)}
            </p>
            <p className="mt-1 text-3xl font-bold tracking-tight">
              {formatarMoeda(dados.resumo.saldoFinal)}
            </p>
            <p className="mb-4 text-sm text-grafite">saldo projetado no fim do período</p>

            <GraficoCaixa dias={consolidado} />

            <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-linha pt-3 text-sm">
              <div>
                <dt className="text-grafite">Em conta hoje</dt>
                <dd className="font-mono font-medium">
                  {formatarMoedaCurta(dados.resumo.saldoInicial)}
                </dd>
              </div>
              <div>
                <dt className="text-grafite">Entra</dt>
                <dd className="font-mono font-medium text-folga">
                  {formatarMoedaCurta(dados.resumo.totalEntradas)}
                </dd>
              </div>
              <div>
                <dt className="text-grafite">Sai</dt>
                <dd className="font-mono font-medium text-risco">
                  {formatarMoedaCurta(dados.resumo.totalSaidas)}
                </dd>
              </div>
            </dl>

            <dl className="mt-3 space-y-1 border-t border-linha pt-3 text-sm">
              <div className="flex items-baseline gap-2">
                <dt className="flex-1 text-grafite">Contas fixas</dt>
                <dd className="font-mono">{formatarMoedaCurta(dados.resumo.totalContas)}</dd>
              </div>
              <div className="flex items-baseline gap-2">
                <dt className="flex-1 text-grafite">Comissão da conta (projeção)</dt>
                <dd className="font-mono">{formatarMoedaCurta(dados.resumo.totalComissao)}</dd>
              </div>
              <div className="flex items-baseline gap-2">
                <dt className="flex-1 text-grafite">Insumos (projeção)</dt>
                <dd className="font-mono">{formatarMoedaCurta(dados.resumo.totalInsumos)}</dd>
              </div>
              {dados.resumo.totalComissaoAVista > 0 && (
                <div className="flex items-baseline gap-2 text-grafite">
                  <dt className="flex-1">Comissão à vista, fora da conta</dt>
                  <dd className="font-mono">
                    {formatarMoedaCurta(dados.resumo.totalComissaoAVista)}
                  </dd>
                </div>
              )}
            </dl>

            {dados.resumo.totalPendencias > 0 && (
              <p className="mt-3 border-t border-linha pt-3 text-sm text-grafite">
                Fora disso há{" "}
                <span className="font-mono font-medium text-tinta">
                  {formatarMoeda(dados.resumo.totalPendencias)}
                </span>{" "}
                em contas vencidas e não pagas, somando todos os meses. Elas não entram na
                linha do tempo. Abra a unidade para ver mês a mês.
              </p>
            )}
          </section>

          {dados.avisosGerais.length > 0 && (
            <section className="mb-5">
              <Avisos itens={dados.avisosGerais} />
            </section>
          )}

          <section>
            <h2 className="mb-2 text-lg font-semibold">
              Unidades
              {dados.resumo.unidadesEmRisco > 0 && (
                <span className="ml-2 text-sm font-normal text-risco">
                  {dados.resumo.unidadesEmRisco} sem cobertura
                </span>
              )}
            </h2>

            {dados.unidades.length === 0 ? (
              <Vazio texto="Nenhuma unidade encontrada na aba ContaStone." />
            ) : (
              <ul className="divide-y divide-linha border border-linha bg-superficie">
                {dados.unidades.map((unidade) => (
                  <li key={unidade.unidade}>
                    <Link
                      href={`/unidade/${slugDaUnidade(unidade.unidade)}?periodo=${periodo}&de=${de}`}
                      className={`flex items-center gap-3 border-l-4 px-3 py-3 ${CORES[unidade.status]}`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{unidade.unidade}</span>
                        <span className="block text-sm text-grafite">
                          {unidade.primeiroDiaNegativo
                            ? `Fura em ${formatarDataCurta(unidade.primeiroDiaNegativo)}, faltam ${formatarMoedaCurta(unidade.faltaNoPior)}`
                            : ROTULO_STATUS[unidade.status]}
                        </span>
                      </span>
                      <span className="text-right">
                        <span className="block font-mono font-medium">
                          {formatarMoedaCurta(unidade.saldoFinal)}
                        </span>
                        {unidade.diasDesatualizado !== null &&
                          unidade.diasDesatualizado > dados.config.diasSaldoDesatualizado && (
                            <span className="block text-xs text-atencao">
                              saldo de {unidade.diasDesatualizado} dias atrás
                            </span>
                          )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}
