"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import SeletorPeriodo from "@/components/SeletorPeriodo";
import { Carregando, Erro } from "@/components/Estado";
import { useProjecao } from "@/components/useProjecao";
import {
  formatarDataCompleta,
  formatarMoeda,
  formatarMoedaCurta,
  hojeEmSaoPaulo,
  slugDaUnidade,
} from "@/lib/parse";
import { classificarControle } from "@/lib/statusConta";
import { situacaoContrato, type Profissional } from "@/lib/profissionais";

export default function PaginaHoje() {
  const [periodo, setPeriodo] = useState("sete");
  const [de, setDe] = useState(hojeEmSaoPaulo);
  const { dados, carregando, erro } = useProjecao(periodo, de);
  const [equipe, setEquipe] = useState<Profissional[]>([]);

  useEffect(() => {
    fetch("/api/profissionais", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((corpo) => setEquipe((corpo?.profissionais as Profissional[]) ?? []))
      .catch(() => setEquipe([]));
  }, []);

  const mes = new Date().getMonth();

  const painel = useMemo(() => {
    if (!dados) return null;

    const contas = dados.unidades.flatMap((u) => u.dias.flatMap((d) => d.contas));
    const grupo = (chave: string) =>
      contas.filter((c) => classificarControle(c.controle).chave === chave);

    const aguardando = grupo("aguardando");
    const semStatus = grupo("semStatus");
    const confirmado = grupo("confirmado");

    const soma = (lista: typeof contas) => lista.reduce((t, c) => t + c.valor, 0);

    const ativos = equipe.filter((p) => p.status.toLowerCase() !== "inativo");

    return {
      emRisco: dados.unidades.filter((u) => u.status === "risco"),
      aguardando: { itens: aguardando, valor: soma(aguardando) },
      semStatus: { itens: semStatus, valor: soma(semStatus) },
      confirmado: { itens: confirmado, valor: soma(confirmado) },
      totalContas: soma(contas),
      semRetorno: ativos.filter((p) => situacaoContrato(p) === "solicitado").length,
      semContrato: ativos.filter((p) => situacaoContrato(p) === "ausente").length,
      semNota: ativos.filter((p) => !p.notas[mes]).length,
      ativos: ativos.length,
    };
  }, [dados, equipe, mes]);

  return (
    <main className="py-5">
      <header className="mb-3">
        <h1 className="text-2xl font-bold tracking-tight">Hoje</h1>
      </header>

      <div className="mb-4">
        <SeletorPeriodo periodo={periodo} de={de} aoMudar={setPeriodo} aoMudarDe={setDe} />
      </div>

      {carregando && <Carregando />}
      {erro && <Erro mensagem={erro} />}

      {dados && painel && (
        <>
          {/* Saldo projetado da rede */}
          <section
            className={`mb-3 border-l-4 bg-superficie p-4 ${
              painel.emRisco.length > 0 ? "border-risco" : "border-folga"
            }`}
          >
            <p className="text-xs uppercase tracking-wide text-grafite">
              Saldo no fim do período
            </p>
            <p className="text-4xl font-bold tracking-tight">
              {formatarMoeda(dados.resumo.saldoFinal)}
            </p>
            <p
              className={`mt-1 text-sm font-semibold ${
                painel.emRisco.length > 0 ? "text-risco" : "text-folga"
              }`}
            >
              {painel.emRisco.length > 0
                ? `${painel.emRisco.length} unidade(s) sem caixa`
                : "Todas as unidades cobrem o período"}
            </p>

            {painel.emRisco.length > 0 && (
              <ul className="mt-2 divide-y divide-linha border-t border-linha">
                {painel.emRisco.slice(0, 4).map((u) => (
                  <li key={u.unidade}>
                    <Link
                      href={`/unidade/${slugDaUnidade(u.unidade)}?periodo=${periodo}&de=${de}`}
                      className="flex items-baseline gap-2 py-2 text-sm"
                    >
                      <span className="min-w-0 flex-1 truncate">{u.unidade}</span>
                      <span className="shrink-0 text-xs text-grafite">
                        {u.primeiroDiaNegativo && formatarDataCompleta(u.primeiroDiaNegativo)}
                      </span>
                      <span className="shrink-0 font-mono text-risco">
                        −{formatarMoedaCurta(u.faltaNoPior)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Contas a pagar, o bloco principal */}
          <section className="mb-3 border border-linha bg-superficie">
            <div className="flex items-baseline justify-between gap-3 border-b border-linha px-4 pb-2 pt-3">
              <h2 className="text-lg font-semibold">Contas a pagar</h2>
              <span className="font-mono text-lg font-semibold">
                {formatarMoeda(painel.totalContas)}
              </span>
            </div>

            <ul className="divide-y divide-linha">
              <li className="flex items-center gap-3 border-l-4 border-risco px-4 py-3">
                <span className="w-10 shrink-0 text-center font-mono text-2xl font-bold">
                  {painel.aguardando.itens.length}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-risco">Esperando você</span>
                  <span className="block text-xs text-grafite">agendadas, sem aprovação</span>
                </span>
                <span className="shrink-0 font-mono font-medium">
                  {formatarMoedaCurta(painel.aguardando.valor)}
                </span>
              </li>

              <li className="flex items-center gap-3 border-l-4 border-atencao px-4 py-3">
                <span className="w-10 shrink-0 text-center font-mono text-2xl font-bold">
                  {painel.semStatus.itens.length}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-atencao">Sem status</span>
                  <span className="block text-xs text-grafite">ninguém marcou na planilha</span>
                </span>
                <span className="shrink-0 font-mono font-medium">
                  {formatarMoedaCurta(painel.semStatus.valor)}
                </span>
              </li>

              <li className="flex items-center gap-3 border-l-4 border-folga px-4 py-3">
                <span className="w-10 shrink-0 text-center font-mono text-2xl font-bold">
                  {painel.confirmado.itens.length}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-folga">Agendadas</span>
                  <span className="block text-xs text-grafite">nada a fazer</span>
                </span>
                <span className="shrink-0 font-mono font-medium">
                  {formatarMoedaCurta(painel.confirmado.valor)}
                </span>
              </li>
            </ul>

            {painel.aguardando.itens.length > 0 && (
              <div className="border-t border-linha bg-papel px-4 py-2">
                <ul className="space-y-1 text-sm">
                  {painel.aguardando.itens.slice(0, 4).map((conta) => (
                    <li key={`${conta.unidade}-${conta.id}`} className="flex gap-2">
                      <span className="w-20 shrink-0 text-grafite">
                        {conta.vencimento && formatarDataCompleta(conta.vencimento)}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{conta.favorecido}</span>
                      <span className="shrink-0 font-mono">{formatarMoeda(conta.valor)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Link
              href="/contas"
              className="block border-t border-linha px-4 py-2.5 text-sm text-pinho"
            >
              Ver todas as contas
            </Link>
          </section>

          {/* Vencidas */}
          {dados.resumo.totalPendencias > 0 && (
            <Link
              href="/contas"
              className="mb-3 flex items-center gap-3 border-l-4 border-atencao bg-superficie px-4 py-3"
            >
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">Vencidas em aberto</span>
                <span className="block text-xs text-grafite">somando todos os meses</span>
              </span>
              <span className="shrink-0 font-mono text-lg font-semibold">
                {formatarMoedaCurta(dados.resumo.totalPendencias)}
              </span>
            </Link>
          )}

          {/* Equipe, em números */}
          <section className="grid grid-cols-3 gap-2">
            <Link
              href="/juridico"
              className={`border-l-4 bg-superficie p-3 ${
                painel.semRetorno > 0 ? "border-risco" : "border-linha"
              }`}
            >
              <span className="block font-mono text-2xl font-bold">{painel.semRetorno}</span>
              <span className="block text-xs text-grafite">cobrados, sem retorno</span>
            </Link>
            <Link
              href="/juridico"
              className={`border-l-4 bg-superficie p-3 ${
                painel.semContrato > 0 ? "border-atencao" : "border-linha"
              }`}
            >
              <span className="block font-mono text-2xl font-bold">{painel.semContrato}</span>
              <span className="block text-xs text-grafite">sem contrato</span>
            </Link>
            <Link
              href="/juridico"
              className={`border-l-4 bg-superficie p-3 ${
                painel.semNota > 0 ? "border-atencao" : "border-linha"
              }`}
            >
              <span className="block font-mono text-2xl font-bold">
                {painel.semNota}
                <span className="text-sm font-normal text-grafite">/{painel.ativos}</span>
              </span>
              <span className="block text-xs text-grafite">sem NF do mês</span>
            </Link>
          </section>
        </>
      )}
    </main>
  );
}
