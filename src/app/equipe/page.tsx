"use client";

import { useEffect, useMemo, useState } from "react";
import { Carregando, Erro, Vazio } from "@/components/Estado";
import { formatarDataCompleta, formatarMoeda, hojeEmSaoPaulo, somarDias } from "@/lib/parse";
import type { DesempenhoProfissional } from "@/lib/comissoes";

interface Resposta {
  inicio: string;
  fim: string;
  inicioAnterior: string;
  fimAnterior: string;
  atual: DesempenhoProfissional[];
  anterior: DesempenhoProfissional[];
  temDados: boolean;
}

const JANELAS = [
  { valor: 7, rotulo: "7 dias" },
  { valor: 14, rotulo: "14 dias" },
  { valor: 30, rotulo: "30 dias" },
];

function variacao(atual: number, anterior: number): number | null {
  if (anterior === 0) return null;
  return ((atual - anterior) / anterior) * 100;
}

export default function PaginaEquipe() {
  const [janela, setJanela] = useState(7);
  const [unidade, setUnidade] = useState("");
  const [dados, setDados] = useState<Resposta | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const fim = hojeEmSaoPaulo();
    const inicio = somarDias(fim, -(janela - 1));
    setCarregando(true);
    setErro(null);

    fetch(`/api/equipe?inicio=${inicio}&fim=${fim}`, { cache: "no-store" })
      .then(async (resposta) => {
        const corpo = await resposta.json();
        if (!resposta.ok) throw new Error(corpo?.erro ?? "Falha ao carregar.");
        setDados(corpo as Resposta);
      })
      .catch((falha) =>
        setErro(falha instanceof Error ? falha.message : "Falha ao carregar.")
      )
      .finally(() => setCarregando(false));
  }, [janela]);

  const unidades = useMemo(
    () => [...new Set((dados?.atual ?? []).map((p) => p.unidade))].sort(),
    [dados]
  );

  const lista = useMemo(
    () => (dados?.atual ?? []).filter((p) => !unidade || p.unidade === unidade),
    [dados, unidade]
  );

  const anterior = useMemo(() => {
    const mapa = new Map<string, DesempenhoProfissional>();
    for (const item of dados?.anterior ?? []) {
      mapa.set(`${item.unidade}|${item.profissional}`, item);
    }
    return mapa;
  }, [dados]);

  const totais = useMemo(() => {
    const faturamento = lista.reduce((t, p) => t + p.faturamento, 0);
    const comissao = lista.reduce((t, p) => t + p.comissao, 0);
    const atendimentos = lista.reduce((t, p) => t + p.atendimentos, 0);

    const anteriores = (dados?.anterior ?? []).filter((p) => !unidade || p.unidade === unidade);
    const faturamentoAnterior = anteriores.reduce((t, p) => t + p.faturamento, 0);
    const atendimentosAnterior = anteriores.reduce((t, p) => t + p.atendimentos, 0);

    return {
      faturamento,
      comissao,
      atendimentos,
      ticket: atendimentos > 0 ? faturamento / atendimentos : 0,
      percentual: faturamento > 0 ? comissao / faturamento : 0,
      variacaoFaturamento: variacao(faturamento, faturamentoAnterior),
      variacaoAtendimentos: variacao(atendimentos, atendimentosAnterior),
      ticketAnterior:
        atendimentosAnterior > 0 ? faturamentoAnterior / atendimentosAnterior : 0,
    };
  }, [lista, dados, unidade]);

  /** Observações geradas a partir da comparação entre os dois períodos. */
  const insights = useMemo(() => {
    if (!dados || lista.length === 0) return [];
    const notas: { tom: "bom" | "ruim" | "neutro"; texto: string }[] = [];

    if (totais.variacaoFaturamento !== null) {
      const v = totais.variacaoFaturamento;
      if (Math.abs(v) >= 5) {
        notas.push({
          tom: v > 0 ? "bom" : "ruim",
          texto: `Faturamento ${v > 0 ? "subiu" : "caiu"} ${Math.abs(v).toFixed(1)}% contra os ${janela} dias anteriores.`,
        });
      }
    }

    if (totais.ticketAnterior > 0) {
      const v = variacao(totais.ticket, totais.ticketAnterior);
      if (v !== null && Math.abs(v) >= 4) {
        notas.push({
          tom: v > 0 ? "bom" : "ruim",
          texto:
            v > 0
              ? `Ticket médio subiu ${v.toFixed(1)}%, para ${formatarMoeda(totais.ticket)}. Está vendendo serviço mais caro por atendimento.`
              : `Ticket médio caiu ${Math.abs(v).toFixed(1)}%, para ${formatarMoeda(totais.ticket)}. Mesmo volume rende menos.`,
        });
      }
    }

    if (
      totais.variacaoAtendimentos !== null &&
      totais.variacaoFaturamento !== null &&
      totais.variacaoAtendimentos > 3 &&
      totais.variacaoFaturamento < 0
    ) {
      notas.push({
        tom: "ruim",
        texto:
          "Atendeu mais gente e faturou menos. Sinal de desconto excessivo ou migração para serviços mais baratos.",
      });
    }

    // quem caiu forte
    for (const pessoa of lista) {
      const antes = anterior.get(`${pessoa.unidade}|${pessoa.profissional}`);
      if (!antes) continue;
      const v = variacao(pessoa.faturamento, antes.faturamento);
      if (v !== null && v <= -20) {
        notas.push({
          tom: "ruim",
          texto: `${pessoa.profissional} caiu ${Math.abs(v).toFixed(0)}% no período. Vale entender se foi falta, agenda vazia ou perda de cliente.`,
        });
      } else if (v !== null && v >= 25) {
        notas.push({
          tom: "bom",
          texto: `${pessoa.profissional} cresceu ${v.toFixed(0)}%. Vale olhar o que está fazendo diferente e repetir no resto da equipe.`,
        });
      }
    }

    // concentração
    if (lista.length >= 3) {
      const ordenados = [...lista].sort((a, b) => b.faturamento - a.faturamento);
      const topo = ordenados[0];
      const fatia = totais.faturamento > 0 ? topo.faturamento / totais.faturamento : 0;
      if (fatia > 0.45) {
        notas.push({
          tom: "neutro",
          texto: `${topo.profissional} responde por ${(fatia * 100).toFixed(0)}% do faturamento. Concentração alta: a saída dessa pessoa derruba a unidade.`,
        });
      }
    }

    // mix de serviço
    const porServico = new Map<string, number>();
    for (const pessoa of lista) {
      for (const servico of pessoa.servicos) {
        porServico.set(servico.nome, (porServico.get(servico.nome) ?? 0) + servico.valor);
      }
    }
    const servicos = [...porServico.entries()].sort((a, b) => b[1] - a[1]);
    if (servicos.length > 0 && totais.faturamento > 0) {
      const [nome, valor] = servicos[0];
      const fatia = valor / totais.faturamento;
      if (fatia > 0.55) {
        notas.push({
          tom: "neutro",
          texto: `"${nome}" é ${(fatia * 100).toFixed(0)}% do faturamento. Combos e serviços adicionais são o caminho mais rápido para subir o ticket.`,
        });
      }
    }

    if (totais.percentual > 0 && totais.percentual > 0.45) {
      notas.push({
        tom: "ruim",
        texto: `A comissão está em ${(totais.percentual * 100).toFixed(1)}% do faturamento. Acima de 45% sobra pouco para custo fixo.`,
      });
    }

    return notas;
  }, [dados, lista, anterior, totais, janela]);

  return (
    <main className="py-5">
      <header className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Equipe</h1>
        {dados && (
          <p className="mt-0.5 text-sm text-grafite">
            {formatarDataCompleta(dados.inicio)} a {formatarDataCompleta(dados.fim)}, contra{" "}
            {formatarDataCompleta(dados.inicioAnterior)} a{" "}
            {formatarDataCompleta(dados.fimAnterior)}
          </p>
        )}
      </header>

      <div className="mb-3 flex border border-linha bg-superficie" role="group">
        {JANELAS.map((opcao) => (
          <button
            key={opcao.valor}
            type="button"
            aria-pressed={janela === opcao.valor}
            onClick={() => setJanela(opcao.valor)}
            className={`flex-1 px-2 py-2 text-sm ${
              janela === opcao.valor ? "bg-pinho font-medium text-papel" : "text-grafite"
            }`}
          >
            {opcao.rotulo}
          </button>
        ))}
      </div>

      {unidades.length > 1 && (
        <select
          value={unidade}
          onChange={(evento) => setUnidade(evento.target.value)}
          className="mb-4 w-full border border-linha bg-superficie px-3 py-2 text-sm"
        >
          <option value="">Todas as unidades</option>
          {unidades.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      )}

      {carregando && <Carregando texto="Lendo a aba Comissões" />}
      {erro && <Erro mensagem={erro} />}

      {dados && !carregando && lista.length === 0 && (
        <Vazio
          texto={
            dados.temDados
              ? "Nenhum lançamento de comissão neste período."
              : "A aba Comissões está vazia ou os nomes de unidade não batem com a Unidade Corrigida."
          }
        />
      )}

      {lista.length > 0 && (
        <>
          <section className="mb-4 grid grid-cols-2 gap-2">
            <div className="border border-linha bg-superficie p-3">
              <p className="font-mono text-xl font-bold">{formatarMoeda(totais.faturamento)}</p>
              <p className="text-xs text-grafite">faturamento</p>
              {totais.variacaoFaturamento !== null && (
                <p
                  className={`text-xs font-medium ${
                    totais.variacaoFaturamento >= 0 ? "text-folga" : "text-risco"
                  }`}
                >
                  {totais.variacaoFaturamento >= 0 ? "+" : ""}
                  {totais.variacaoFaturamento.toFixed(1)}%
                </p>
              )}
            </div>
            <div className="border border-linha bg-superficie p-3">
              <p className="font-mono text-xl font-bold">{formatarMoeda(totais.ticket)}</p>
              <p className="text-xs text-grafite">ticket médio</p>
              <p className="text-xs text-grafite">{totais.atendimentos} atendimentos</p>
            </div>
            <div className="col-span-2 border border-linha bg-superficie p-3">
              <p className="font-mono text-xl font-bold">
                {formatarMoeda(totais.comissao)}
                <span className="ml-2 text-sm font-normal text-grafite">
                  {(totais.percentual * 100).toFixed(1)}% do faturamento
                </span>
              </p>
              <p className="text-xs text-grafite">comissão apurada no período</p>
            </div>
          </section>

          {insights.length > 0 && (
            <section className="mb-5">
              <h2 className="mb-2 text-lg font-semibold">O que os números dizem</h2>
              <ul className="space-y-2">
                {insights.map((nota, indice) => (
                  <li
                    key={indice}
                    className={`border-l-4 bg-superficie px-3 py-2 text-sm ${
                      nota.tom === "bom"
                        ? "border-folga"
                        : nota.tom === "ruim"
                          ? "border-risco"
                          : "border-aco"
                    }`}
                  >
                    {nota.texto}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mb-6">
            <h2 className="mb-2 text-lg font-semibold">Ranking</h2>
            <ol className="divide-y divide-linha border border-linha bg-superficie">
              {lista.map((pessoa, indice) => {
                const antes = anterior.get(`${pessoa.unidade}|${pessoa.profissional}`);
                const v = antes ? variacao(pessoa.faturamento, antes.faturamento) : null;
                const maior = lista[0].faturamento || 1;

                return (
                  <li key={`${pessoa.unidade}-${pessoa.profissional}`} className="px-3 py-3">
                    <div className="flex items-baseline gap-3">
                      <span className="w-5 shrink-0 font-mono text-sm text-grafite">
                        {indice + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{pessoa.profissional}</span>
                        <span className="block text-xs text-grafite">
                          {pessoa.unidade} · {pessoa.atendimentos} atend. · ticket{" "}
                          {formatarMoeda(pessoa.ticket)} ·{" "}
                          {(pessoa.percentualMedio * 100).toFixed(0)}% comissão
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block font-mono text-sm font-medium">
                          {formatarMoeda(pessoa.faturamento)}
                        </span>
                        {v !== null && (
                          <span
                            className={`block text-xs ${v >= 0 ? "text-folga" : "text-risco"}`}
                          >
                            {v >= 0 ? "+" : ""}
                            {v.toFixed(1)}%
                          </span>
                        )}
                      </span>
                    </div>

                    <div className="mt-2 h-1.5 w-full bg-papel">
                      <div
                        className="h-full bg-pinho"
                        style={{ width: `${(pessoa.faturamento / maior) * 100}%` }}
                      />
                    </div>

                    {pessoa.servicos.length > 0 && (
                      <p className="mt-1.5 truncate text-xs text-grafite">
                        {pessoa.servicos
                          .slice(0, 3)
                          .map((s) => `${s.nome} (${s.quantidade})`)
                          .join(" · ")}
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        </>
      )}
    </main>
  );
}
