"use client";

import Link from "next/link";
import { use, useState } from "react";
import GraficoCaixa from "@/components/GraficoCaixa";
import Pendencias from "@/components/Pendencias";
import Avisos from "@/components/Avisos";
import ListaInsights from "@/components/ListaInsights";
import ComparativoFaturamento from "@/components/ComparativoFaturamento";
import { Pilula, Secao } from "@/components/ui";
import SeletorPeriodo from "@/components/SeletorPeriodo";
import { Carregando, Erro, Vazio } from "@/components/Estado";
import { useProjecao } from "@/components/useProjecao";
import {
  formatarDataCompleta,
  formatarDataCurta,
  formatarMoeda,
  hojeEmSaoPaulo,
  ROTULO_DIA,
} from "@/lib/parse";

export default function PaginaUnidade({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const nomeUnidade = decodeURIComponent(slug);
  const [periodo, setPeriodo] = useState("sete");
  const [de, setDe] = useState(hojeEmSaoPaulo);
  const [diaAberto, setDiaAberto] = useState<string | null>(null);
  const { dados, carregando, erro } = useProjecao(periodo, de);

  const unidade = dados?.unidades.find((item) => item.unidade === nomeUnidade) ?? null;

  return (
    <main className="py-5">
      <Link href="/" className="text-sm text-pinho underline underline-offset-4">
        Voltar para a rede
      </Link>

      <header className="mb-4 mt-3">
        <h1 className="text-2xl font-bold tracking-tight">{nomeUnidade}</h1>
      </header>

      <div className="mb-5">
        <SeletorPeriodo periodo={periodo} de={de} aoMudar={setPeriodo} aoMudarDe={setDe} />
      </div>

      {carregando && <Carregando />}
      {erro && <Erro mensagem={erro} />}
      {dados && !carregando && !unidade && (
        <Vazio texto="Esta unidade não está na aba ContaStone." />
      )}

      {unidade && dados && (
        <>
          <section className="mb-6 border border-linha bg-superficie p-4">
            <p className="text-sm text-grafite">
              Saldo previsto em {formatarDataCompleta(dados.fim)}
            </p>
            <p
              className={`text-[30px] font-bold leading-9 tracking-tight ${
                unidade.saldoFinal < 0 ? "text-risco" : ""
              }`}
            >
              {formatarMoeda(unidade.saldoFinal)}
            </p>
            <p className="mb-3 text-sm leading-relaxed text-grafite">
              {unidade.primeiroDiaNegativo ? (
                <>
                  Falta dinheiro a partir de{" "}
                  <span className="font-medium text-risco">
                    {formatarDataCompleta(unidade.primeiroDiaNegativo)}
                  </span>
                  . No pior dia o buraco chega a {formatarMoeda(unidade.faltaNoPior)}.
                </>
              ) : (
                "O saldo cobre todas as contas do período."
              )}
            </p>

            <p className="mb-4 flex flex-wrap items-center gap-2 text-xs text-grafite">
              <span>
                Parte de {formatarMoeda(unidade.saldoInicial)} em conta
                {unidade.atualizadoEm
                  ? `, informado em ${formatarDataCompleta(unidade.atualizadoEm)}`
                  : ", sem data de atualização"}
              </span>
              {unidade.diasDesatualizado !== null &&
                unidade.diasDesatualizado > dados.config.diasSaldoDesatualizado && (
                  <Pilula tom="atencao">
                    {unidade.diasDesatualizado} dias sem atualizar
                  </Pilula>
                )}
            </p>

            <GraficoCaixa
              dias={unidade.dias}
              reservaMinima={dados.config.reservaMinima}
              aoSelecionar={(data) => setDiaAberto(data === diaAberto ? null : data)}
              selecionado={diaAberto}
            />

            {unidade.ultimoRealizado && (
              <p className="mt-2 text-xs text-grafite">
                Faturamento lançado até {formatarDataCurta(unidade.ultimoRealizado)}. Depois
                dessa data o gráfico passa a usar a média por dia da semana.
              </p>
            )}
          </section>

          {unidade.insights.length > 0 && (
            <Secao
              titulo="O que os números dizem"
              apoio="Leitura automática do que mudou e do que merece atenção."
            >
              <ListaInsights itens={unidade.insights} />
            </Secao>
          )}

          {unidade.comparativo && unidade.comparativo.atual.diasComDado > 0 && (
            <Secao
              titulo="Faturamento"
              apoio={`Últimos ${unidade.comparativo.dias} dias lançados, contra os ${unidade.comparativo.dias} anteriores. A janela termina no último dia que a planilha recebeu, não em hoje.`}
            >
              <ComparativoFaturamento dados={unidade.comparativo} />
            </Secao>
          )}

          {unidade.avisos.length > 0 && (
            <Secao titulo="Avisos">
              <Avisos itens={unidade.avisos} />
            </Secao>
          )}

          <section className="mb-6">
            <h2 className="mb-2 text-lg font-semibold">Dia a dia</h2>

            <div className="border border-linha bg-superficie">
              <div className="flex items-end gap-2 border-b border-linha px-3 py-2 text-[10px] leading-tight text-grafite">
                <span className="w-16 shrink-0">Dia</span>
                <span className="flex-1">Recebimento projetado</span>
                <span className="flex-1">Contas e projeções</span>
                <span className="w-24 shrink-0 text-right sm:w-28">Acumulado</span>
              </div>

              <div className="flex items-baseline gap-2 border-b border-linha bg-papel px-3 py-2.5">
                <span className="w-16 shrink-0 text-xs text-grafite">Saldo</span>
                <span className="flex-1 text-xs text-grafite">
                  em conta hoje
                  {unidade.atualizadoEm
                    ? `, informado em ${formatarDataCurta(unidade.atualizadoEm)}`
                    : ", sem data"}
                </span>
                <span className="w-24 shrink-0 text-right font-mono text-xs font-semibold sm:w-28 sm:text-sm">
                  {formatarMoeda(unidade.saldoInicial)}
                </span>
              </div>

              <ul className="divide-y divide-linha">
                {unidade.dias.map((dia) => {
                  const aberto = diaAberto === dia.data;
                  const negativo = dia.saldoFinal < 0;
                  const temProjecao = dia.comissao > 0 || dia.insumos > 0;

                  return (
                    <li key={dia.data}>
                      <button
                        type="button"
                        onClick={() => setDiaAberto(aberto ? null : dia.data)}
                        className="flex w-full items-baseline gap-2 px-3 py-2.5 text-left"
                        aria-expanded={aberto}
                      >
                        <span className="w-16 shrink-0 text-xs text-grafite sm:text-sm">
                          {ROTULO_DIA[dia.diaSemana].slice(0, 3)} {formatarDataCurta(dia.data)}
                        </span>
                        <span className="flex-1 font-mono text-xs text-folga sm:text-sm">
                          {dia.entrada > 0 ? `+${formatarMoeda(dia.entrada)}` : "—"}
                        </span>
                        <span className="flex-1 font-mono text-xs text-risco sm:text-sm">
                          {dia.saida > 0 ? `−${formatarMoeda(dia.saida)}` : ""}
                        </span>
                        <span
                          className={`w-24 shrink-0 text-right font-mono text-xs font-medium sm:w-28 sm:text-sm ${
                            negativo ? "text-risco" : ""
                          }`}
                        >
                          {formatarMoeda(dia.saldoFinal)}
                        </span>
                      </button>

                      {aberto && (
                        <div className="border-t border-linha bg-papel px-3 py-2">
                          {dia.contas.length === 0 && !temProjecao && dia.comissaoAVista === 0 ? (
                            <p className="text-sm text-grafite">Nada sai da conta neste dia.</p>
                          ) : (
                            <ul className="space-y-1.5">
                              {dia.contas.map((conta) => (
                                <li key={conta.id} className="flex items-baseline gap-2 text-sm">
                                  <span className="flex-1">
                                    {conta.favorecido}
                                    <span className="text-grafite"> · {conta.categoria}</span>
                                    {!conta.boletoDisponibilizado && (
                                      <span className="text-atencao"> · sem boleto</span>
                                    )}
                                  </span>
                                  <span className="font-mono">{formatarMoeda(conta.valor)}</span>
                                </li>
                              ))}

                              {dia.comissao > 0 && (
                                <li className="projetado flex items-baseline gap-2 border-l-2 border-pinho px-2 py-1 text-sm">
                                  <span className="flex-1">
                                    Comissão dos barbeiros
                                    <span className="block text-xs text-grafite">
                                      {Math.round(dados.config.percentualComissao * 100)}% do
                                      faturamento de{" "}
                                      {dia.comissaoBase
                                        ? `${formatarDataCurta(dia.comissaoBase.inicio)} a ${formatarDataCurta(dia.comissaoBase.fim)}`
                                        : "uma semana"}
                                      {dia.comissaoBase &&
                                        (dia.comissaoBase.diasReais === 7
                                          ? " · semana fechada"
                                          : dia.comissaoBase.diasReais === 0
                                            ? " · toda projetada"
                                            : ` · ${dia.comissaoBase.diasReais} de 7 dias lançados`)}
                                    </span>
                                  </span>
                                  <span className="font-mono">{formatarMoeda(dia.comissao)}</span>
                                </li>
                              )}

                              {dia.comissaoAVista > 0 && (
                                <li className="flex items-baseline gap-2 px-2 py-1 text-sm text-grafite">
                                  <span className="flex-1">
                                    Comissão paga à vista
                                    <span className="block text-xs">
                                      sai do dinheiro em espécie, não da conta
                                    </span>
                                  </span>
                                  <span className="font-mono line-through decoration-muted">
                                    {formatarMoeda(dia.comissaoAVista)}
                                  </span>
                                </li>
                              )}

                              {dia.insumos > 0 && (
                                <li className="projetado flex items-baseline gap-2 border-l-2 border-pinho px-2 py-1 text-sm">
                                  <span className="flex-1">
                                    Insumos
                                    <span className="text-grafite">
                                      {" · projeção, média semanal da unidade"}
                                    </span>
                                  </span>
                                  <span className="font-mono">{formatarMoeda(dia.insumos)}</span>
                                </li>
                              )}
                            </ul>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>

              <div className="flex items-baseline gap-2 border-t border-linha bg-papel px-3 py-2.5">
                <span className="w-16 shrink-0 text-xs text-grafite">Total</span>
                <span className="flex-1 font-mono text-xs text-folga sm:text-sm">
                  +{formatarMoeda(unidade.totalEntradas)}
                </span>
                <span className="flex-1 font-mono text-xs text-risco sm:text-sm">
                  −{formatarMoeda(unidade.totalSaidas)}
                </span>
                <span className="w-24 shrink-0 text-right font-mono text-xs font-semibold sm:w-28 sm:text-sm">
                  {formatarMoeda(unidade.saldoFinal)}
                </span>
              </div>
            </div>

            <dl className="mt-3 divide-y divide-linha border border-linha bg-superficie text-sm">
              <div className="flex items-baseline gap-3 px-3 py-2">
                <dt className="flex-1">Contas fixas da planilha</dt>
                <dd className="font-mono">{formatarMoeda(unidade.totalContas)}</dd>
              </div>
              <div className="flex items-baseline gap-3 px-3 py-2">
                <dt className="flex-1">
                  Comissão que sai da conta
                  <span className="block text-xs text-grafite">
                    projeção lançada toda {ROTULO_DIA[dados.config.diaComissao].toLowerCase()}
                  </span>
                </dt>
                <dd className="font-mono">{formatarMoeda(unidade.totalComissao)}</dd>
              </div>
              <div className="flex items-baseline gap-3 px-3 py-2 text-grafite">
                <dt className="flex-1">
                  Comissão paga à vista
                  <span className="block text-xs">
                    descontada do dinheiro em espécie, fora do acumulado acima
                  </span>
                </dt>
                <dd className="font-mono">{formatarMoeda(unidade.totalComissaoAVista)}</dd>
              </div>
              <div className="flex items-baseline gap-3 px-3 py-2">
                <dt className="flex-1">
                  Insumos
                  <span className="block text-xs text-grafite">
                    projeção lançada toda {ROTULO_DIA[dados.config.diaInsumos].toLowerCase()}
                  </span>
                </dt>
                <dd className="font-mono">{formatarMoeda(unidade.totalInsumos)}</dd>
              </div>
            </dl>

            <p className="mt-2 text-xs text-grafite">
              Recebimento projetado é a média das últimas {dados.config.janelaSemanas} ocorrências
              daquele dia da semana, já sem as taxas e sem o dinheiro em espécie. Comissão e
              insumos são projeções, não contas lançadas na planilha, e aparecem com a marca
              hachurada. O acumulado é o saldo anterior mais o recebimento, menos o que sai da
              conta no dia.
            </p>
          </section>

          <Pendencias contas={unidade.pendencias} />

        </>
      )}
    </main>
  );
}
