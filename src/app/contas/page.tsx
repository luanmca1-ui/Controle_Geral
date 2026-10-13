"use client";

import { useMemo, useState } from "react";
import SeletorPeriodo from "@/components/SeletorPeriodo";
import { Carregando, Erro, Vazio } from "@/components/Estado";
import { useProjecao } from "@/components/useProjecao";
import { formatarDataCompleta, formatarMoeda, hojeEmSaoPaulo } from "@/lib/parse";
import {
  classificarControle,
  COR_STATUS,
  DESCRICAO_STATUS,
  ORDEM_STATUS,
  ROTULO_STATUS,
  type ChaveStatus,
} from "@/lib/statusConta";
import type { Conta } from "@/lib/types";

type Filtro = "periodo" | "pendencias";

interface ContaListada extends Conta {
  vencida: boolean;
}

export default function PaginaContas() {
  const [periodo, setPeriodo] = useState("sete");
  const [de, setDe] = useState(hojeEmSaoPaulo);
  const [filtro, setFiltro] = useState<Filtro>("periodo");
  const [unidadeFiltro, setUnidadeFiltro] = useState("");
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<ChaveStatus | "">("");
  const { dados, carregando, erro } = useProjecao(periodo, de);

  const contas = useMemo<ContaListada[]>(() => {
    if (!dados) return [];
    const lista: ContaListada[] = [];

    for (const unidade of dados.unidades) {
      if (filtro === "periodo") {
        for (const dia of unidade.dias) {
          for (const conta of dia.contas) lista.push({ ...conta, vencida: false });
        }
      } else {
        for (const conta of unidade.pendencias) lista.push({ ...conta, vencida: true });
      }
    }

    return lista
      .filter((conta) => !unidadeFiltro || conta.unidade === unidadeFiltro)
      .filter(
        (conta) => !statusFiltro || classificarControle(conta.controle).chave === statusFiltro
      )
      .filter((conta) => {
        if (!busca.trim()) return true;
        const alvo = `${conta.favorecido} ${conta.categoria} ${conta.item}`.toLowerCase();
        return alvo.includes(busca.trim().toLowerCase());
      })
      .sort((a, b) => (a.vencimento ?? "") < (b.vencimento ?? "") ? -1 : 1);
  }, [dados, filtro, unidadeFiltro, busca, statusFiltro]);

  const total = contas.reduce((soma, conta) => soma + conta.valor, 0);

  // a contagem ignora o filtro de status, senao os chips zerariam ao clicar
  const porStatus = useMemo(() => {
    if (!dados) return new Map<ChaveStatus, { quantidade: number; valor: number }>();
    const mapa = new Map<ChaveStatus, { quantidade: number; valor: number }>();

    for (const unidade of dados.unidades) {
      const fonte =
        filtro === "periodo" ? unidade.dias.flatMap((dia) => dia.contas) : unidade.pendencias;
      for (const conta of fonte) {
        if (unidadeFiltro && conta.unidade !== unidadeFiltro) continue;
        const chave = classificarControle(conta.controle).chave;
        const atual = mapa.get(chave) ?? { quantidade: 0, valor: 0 };
        mapa.set(chave, {
          quantidade: atual.quantidade + 1,
          valor: atual.valor + conta.valor,
        });
      }
    }
    return mapa;
  }, [dados, filtro, unidadeFiltro]);

  return (
    <main className="py-5">
      <header className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Contas a pagar</h1>
        <p className="mt-0.5 text-sm text-grafite">
          Somente contas ainda sem data de pagamento na planilha.
        </p>
      </header>

      <div className="mb-3">
        <SeletorPeriodo periodo={periodo} de={de} aoMudar={setPeriodo} aoMudarDe={setDe} />
      </div>

      <div className="mb-3 flex border border-linha bg-superficie" role="group">
        <button
          type="button"
          onClick={() => setFiltro("periodo")}
          aria-pressed={filtro === "periodo"}
          className={`flex-1 px-3 py-2 text-sm ${filtro === "periodo" ? "bg-pinho font-medium text-papel" : "text-grafite"}`}
        >
          Vencem no período
        </button>
        <button
          type="button"
          onClick={() => setFiltro("pendencias")}
          aria-pressed={filtro === "pendencias"}
          className={`flex-1 px-3 py-2 text-sm ${filtro === "pendencias" ? "bg-pinho font-medium text-papel" : "text-grafite"}`}
        >
          Vencidas em aberto
        </button>
      </div>

      <div className="mb-4 space-y-2">
        <label className="block">
          <span className="sr-only">Filtrar por unidade</span>
          <select
            value={unidadeFiltro}
            onChange={(evento) => setUnidadeFiltro(evento.target.value)}
            className="w-full border border-linha bg-superficie px-3 py-2 text-sm"
          >
            <option value="">Todas as unidades</option>
            {dados?.unidades.map((unidade) => (
              <option key={unidade.unidade} value={unidade.unidade}>
                {unidade.unidade}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="sr-only">Buscar</span>
          <input
            type="search"
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder="Buscar favorecido ou categoria"
            className="w-full border border-linha bg-superficie px-3 py-2 text-sm"
          />
        </label>
      </div>

      {dados && porStatus.size > 0 && (
        <div className="mb-4">
          <p className="mb-1.5 text-sm text-grafite">Controle de agendamento</p>
          <ul className="flex flex-wrap gap-2">
            {ORDEM_STATUS.filter((chave) => porStatus.has(chave)).map((chave) => {
              const dado = porStatus.get(chave)!;
              const ativo = statusFiltro === chave;
              return (
                <li key={chave}>
                  <button
                    type="button"
                    aria-pressed={ativo}
                    title={DESCRICAO_STATUS[chave]}
                    onClick={() => setStatusFiltro(ativo ? "" : chave)}
                    className={`border-l-4 ${COR_STATUS[chave]} px-3 py-1.5 text-left text-xs ${
                      ativo ? "bg-pinho text-papel" : "bg-superficie text-tinta"
                    }`}
                  >
                    <span className="block font-medium">{ROTULO_STATUS[chave]}</span>
                    <span className={`block font-mono ${ativo ? "" : "text-grafite"}`}>
                      {dado.quantidade} · {formatarMoeda(dado.valor)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {porStatus.has("semStatus") && (
            <p className="mt-2 border-l-2 border-risco bg-superficie px-3 py-2 text-sm text-grafite">
              {porStatus.get("semStatus")!.quantidade} conta(s) sem Controle de Status
              preenchido. O painel não edita esse campo: a correção é na planilha, na coluna
              I da aba BContasFixas.
            </p>
          )}
        </div>
      )}

      {carregando && <Carregando />}
      {erro && <Erro mensagem={erro} />}

      {dados && !carregando && (
        <>
          <p className="mb-2 text-sm text-grafite">
            {contas.length} conta(s), total{" "}
            <span className="font-mono font-medium text-tinta">{formatarMoeda(total)}</span>
          </p>

          {contas.length === 0 ? (
            <Vazio texto="Nenhuma conta com esses filtros." />
          ) : (
            <ul className="divide-y divide-linha border border-linha bg-superficie">
              {contas.map((conta) => (
                <li
                  key={`${conta.unidade}-${conta.id}`}
                  className={`flex items-baseline gap-3 border-l-4 px-3 py-2.5 text-sm ${
                    COR_STATUS[classificarControle(conta.controle).chave]
                  }`}
                >
                  <span className="w-20 shrink-0 text-grafite">
                    {conta.vencimento ? formatarDataCompleta(conta.vencimento) : "—"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{conta.favorecido}</span>
                    <span className="block truncate text-xs text-grafite">
                      {conta.unidade}
                      {conta.categoria ? `, ${conta.categoria}` : ""}
                    </span>
                    <span className="block truncate text-xs text-grafite">
                      {classificarControle(conta.controle).original ||
                        "sem Controle de Status"}
                      {!conta.boletoDisponibilizado && (
                        <span className="text-atencao"> · boleto não disponibilizado</span>
                      )}
                    </span>
                  </span>
                  <span className="font-mono">{formatarMoeda(conta.valor)}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  );
}
