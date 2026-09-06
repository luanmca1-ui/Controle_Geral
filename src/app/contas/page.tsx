"use client";

import { useMemo, useState } from "react";
import SeletorPeriodo from "@/components/SeletorPeriodo";
import { Carregando, Erro, Vazio } from "@/components/Estado";
import { useProjecao } from "@/components/useProjecao";
import { formatarDataCurta, formatarMoeda, hojeEmSaoPaulo } from "@/lib/parse";
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
      .filter((conta) => {
        if (!busca.trim()) return true;
        const alvo = `${conta.favorecido} ${conta.categoria} ${conta.item}`.toLowerCase();
        return alvo.includes(busca.trim().toLowerCase());
      })
      .sort((a, b) => (a.vencimento ?? "") < (b.vencimento ?? "") ? -1 : 1);
  }, [dados, filtro, unidadeFiltro, busca]);

  const total = contas.reduce((soma, conta) => soma + conta.valor, 0);

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
                  className={`flex items-baseline gap-3 px-3 py-2.5 text-sm ${
                    conta.vencida ? "border-l-2 border-risco" : ""
                  }`}
                >
                  <span className="w-14 shrink-0 text-grafite">
                    {conta.vencimento ? formatarDataCurta(conta.vencimento) : "—"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{conta.favorecido}</span>
                    <span className="block truncate text-grafite">
                      {conta.unidade} · {conta.categoria}
                      {!conta.boletoDisponibilizado && (
                        <span className="text-atencao"> · sem boleto</span>
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
