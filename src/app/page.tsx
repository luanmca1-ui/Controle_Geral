"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import GraficoCaixa from "@/components/GraficoCaixa";
import Avisos from "@/components/Avisos";
import SeletorPeriodo from "@/components/SeletorPeriodo";
import { Carregando, Erro, Vazio } from "@/components/Estado";
import { Barra, Cartao, Pilula, Secao } from "@/components/ui";
import { useProjecao } from "@/components/useProjecao";
import {
  formatarDataCompleta,
  formatarMoeda,
  formatarMoedaCurta,
  hojeEmSaoPaulo,
  slugDaUnidade,
} from "@/lib/parse";
import type { DiaProjecao, ProjecaoUnidade, StatusRisco } from "@/lib/types";

const TOM: Record<StatusRisco, "folga" | "atencao" | "risco"> = {
  ok: "folga",
  atencao: "atencao",
  risco: "risco",
};

const EXPLICACAO: Record<StatusRisco, string> = {
  ok: "cobre o período",
  atencao: "abaixo da reserva",
  risco: "falta dinheiro",
};

/** Soma o saldo projetado de todas as unidades, dia a dia. */
function consolidar(unidades: ProjecaoUnidade[]): DiaProjecao[] {
  if (unidades.length === 0) return [];

  return unidades[0].dias.map((dia, indice) => {
    let entrada = 0;
    let saida = 0;
    let saldoFinal = 0;
    // o dia só conta como realizado se todas as unidades já lançaram
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
  const [explicando, setExplicando] = useState(false);
  const { dados, carregando, erro } = useProjecao(periodo, de);

  const consolidado = useMemo(() => (dados ? consolidar(dados.unidades) : []), [dados]);

  return (
    <main className="py-4">
      <div className="mb-4">
        <SeletorPeriodo periodo={periodo} de={de} aoMudar={setPeriodo} aoMudarDe={setDe} />
      </div>

      {carregando && <Carregando />}
      {erro && <Erro mensagem={erro} />}

      {dados && !carregando && (
        <>
          <section className="mb-6 border border-linha bg-superficie p-4">
            <p className="text-sm text-grafite">
              Saldo previsto em {formatarDataCompleta(dados.fim)}
            </p>
            <p className="text-[32px] font-bold leading-10 tracking-tight">
              {formatarMoeda(dados.resumo.saldoFinal)}
            </p>
            <p className="mb-4 text-sm leading-relaxed text-grafite">
              É o que deve sobrar nas contas das {dados.unidades.length} unidades depois de
              pagar tudo que vence até lá.
            </p>

            <GraficoCaixa dias={consolidado} />

            <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-linha pt-3">
              <div>
                <dt className="text-xs text-grafite">Tem hoje</dt>
                <dd className="font-mono text-sm font-medium">
                  {formatarMoedaCurta(dados.resumo.saldoInicial)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-grafite">Deve entrar</dt>
                <dd className="font-mono text-sm font-medium text-folga">
                  +{formatarMoedaCurta(dados.resumo.totalEntradas)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-grafite">Vai sair</dt>
                <dd className="font-mono text-sm font-medium text-risco">
                  −{formatarMoedaCurta(dados.resumo.totalSaidas)}
                </dd>
              </div>
            </dl>

            <button
              type="button"
              onClick={() => setExplicando(!explicando)}
              aria-expanded={explicando}
              className="mt-3 text-sm text-pinho underline underline-offset-4"
            >
              {explicando ? "Fechar explicação" : "Como este número é calculado"}
            </button>

            {explicando && (
              <div className="mt-2 space-y-2 border-t border-linha pt-3 text-sm leading-relaxed text-grafite">
                <p>
                  O ponto de partida é o saldo que a gestão informou em Saldos, unidade por
                  unidade.
                </p>
                <p>
                  A entrada de cada dia é o que cai na conta: crédito, débito e pix, já sem
                  as taxas da maquininha. Dinheiro em espécie fica de fora porque não passa
                  pela conta e não paga boleto.
                </p>
                <p>
                  Para os dias que já foram lançados na planilha, vale o valor real. Para os
                  dias à frente, vale a média das últimas{" "}
                  {dados.config.janelaSemanas} ocorrências daquele dia da semana. No
                  gráfico, barra cheia é realizado e barra hachurada é projeção.
                </p>
                <p>
                  A saída de cada dia soma as contas que vencem, a comissão da semana e os
                  insumos. O saldo então caminha dia a dia, e não só no total, porque um
                  período pode fechar positivo e mesmo assim faltar dinheiro no meio do
                  caminho.
                </p>
              </div>
            )}
          </section>

          {dados.avisosGerais.length > 0 && (
            <section className="mb-6">
              <Avisos itens={dados.avisosGerais} />
            </section>
          )}

          <Secao
            titulo="Unidades"
            apoio="Ordenadas por risco: quem fica sem dinheiro primeiro aparece no topo."
            acao={
              dados.resumo.unidadesEmRisco > 0 ? (
                <Pilula tom="risco">{dados.resumo.unidadesEmRisco} sem caixa</Pilula>
              ) : (
                <Pilula tom="folga">todas cobertas</Pilula>
              )
            }
          >
            {dados.unidades.length === 0 ? (
              <Vazio texto="Nenhuma unidade encontrada na aba ContaStone." />
            ) : (
              <ul className="divide-y divide-linha border border-linha bg-superficie">
                {dados.unidades.map((unidade) => {
                  const desatualizado =
                    unidade.diasDesatualizado !== null &&
                    unidade.diasDesatualizado > dados.config.diasSaldoDesatualizado;

                  return (
                    <li key={unidade.unidade}>
                      <Link
                        href={`/unidade/${slugDaUnidade(unidade.unidade)}?periodo=${periodo}&de=${de}`}
                        className={`block px-3 py-3 border-l-4 ${
                          unidade.status === "risco"
                            ? "border-risco"
                            : unidade.status === "atencao"
                              ? "border-atencao"
                              : "border-folga"
                        }`}
                      >
                        <div className="flex items-baseline gap-3">
                          <span className="min-w-0 flex-1 truncate font-medium">
                            {unidade.unidade}
                          </span>
                          <span className="shrink-0 font-mono font-semibold">
                            {formatarMoedaCurta(unidade.saldoFinal)}
                          </span>
                        </div>

                        <p className="mt-0.5 text-sm text-grafite">
                          {unidade.primeiroDiaNegativo ? (
                            <>
                              Falta {formatarMoedaCurta(unidade.faltaNoPior)} em{" "}
                              {formatarDataCompleta(unidade.primeiroDiaNegativo)}
                            </>
                          ) : (
                            EXPLICACAO[unidade.status]
                          )}
                        </p>

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {unidade.comparativo?.variacaoFaturamento != null && (
                            <span
                              className={`text-xs font-medium ${
                                unidade.comparativo.variacaoFaturamento >= 0
                                  ? "text-folga"
                                  : "text-risco"
                              }`}
                            >
                              {unidade.comparativo.variacaoFaturamento >= 0 ? "▲" : "▼"}{" "}
                              {Math.abs(
                                unidade.comparativo.variacaoFaturamento
                              ).toFixed(0)}
                              % no faturamento
                            </span>
                          )}
                          {desatualizado && (
                            <Pilula tom="atencao">
                              saldo de {unidade.diasDesatualizado} dias atrás
                            </Pilula>
                          )}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Secao>

          <Secao
            titulo="Para onde vai o dinheiro"
            apoio="Soma do que sai das contas no período escolhido."
          >
            <Cartao>
              <ul className="divide-y divide-linha">
                <LinhaGasto
                  nome="Contas fixas"
                  descricao="lançadas na planilha"
                  valor={dados.resumo.totalContas}
                  total={dados.resumo.totalSaidas}
                />
                <LinhaGasto
                  nome="Comissão pela conta"
                  descricao="a parte que sai do banco"
                  valor={dados.resumo.totalComissao}
                  total={dados.resumo.totalSaidas}
                />
                <LinhaGasto
                  nome="Insumos"
                  descricao="média semanal por unidade"
                  valor={dados.resumo.totalInsumos}
                  total={dados.resumo.totalSaidas}
                />
              </ul>
            </Cartao>

            {dados.resumo.totalComissaoAVista > 0 && (
              <p className="mt-2 text-sm leading-relaxed text-grafite">
                Fora disso, {formatarMoeda(dados.resumo.totalComissaoAVista)} de comissão
                sai do dinheiro em espécie. Não passa pela conta, então não entra no saldo
                acima.
              </p>
            )}
          </Secao>

          {dados.resumo.totalPendencias > 0 && (
            <Secao titulo="Contas vencidas">
              <Cartao tom="atencao">
                <div className="px-3 py-3">
                  <p className="font-mono text-xl font-semibold">
                    {formatarMoeda(dados.resumo.totalPendencias)}
                  </p>
                  <p className="mt-0.5 text-sm leading-relaxed text-grafite">
                    Já passaram do vencimento e continuam em aberto, somando todos os meses.
                    Ficam fora da linha do tempo porque a data delas passou. Abra uma
                    unidade para ver mês a mês.
                  </p>
                </div>
              </Cartao>
            </Secao>
          )}
        </>
      )}
    </main>
  );
}

function LinhaGasto({
  nome,
  descricao,
  valor,
  total,
}: {
  nome: string;
  descricao: string;
  valor: number;
  total: number;
}) {
  const fracao = total > 0 ? valor / total : 0;

  return (
    <li className="px-3 py-2.5">
      <div className="flex items-baseline gap-3">
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">{nome}</span>
          <span className="block text-xs text-grafite">{descricao}</span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block font-mono text-sm font-medium">
            {formatarMoeda(valor)}
          </span>
          <span className="block text-xs text-grafite">
            {(fracao * 100).toFixed(0)}% do total
          </span>
        </span>
      </div>
      <div className="mt-1.5">
        <Barra fracao={fracao} />
      </div>
    </li>
  );
}
