"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import SeletorPeriodo from "@/components/SeletorPeriodo";
import SecaoComoLer from "@/components/SecaoComoLer";
import SecaoPeriodo from "@/components/SecaoPeriodo";
import SecaoDecisoes from "@/components/SecaoDecisoes";
import { SecaoEvolucao, SecaoSemanas } from "@/components/SecoesTempo";
import { SecaoServicos, SecaoBarbeiros } from "@/components/SecoesEquipe";
import {
  Glossario,
  SecaoResumo,
  SecaoUnidades,
  montarResumo,
} from "@/components/SecoesFinais";
import { Carregando, Erro } from "@/components/Estado";
import { SecaoNumerada } from "@/components/ui";
import { useProjecao } from "@/components/useProjecao";
import {
  formatarDataCompleta,
  formatarMoeda,
  formatarMoedaCurta,
  hojeEmSaoPaulo,
  somarDias,
} from "@/lib/parse";
import { montarDecisoes } from "@/lib/decisoes";
import type { Profissional } from "@/lib/profissionais";
import type { DocumentoUnidade } from "@/lib/documentos";
import type { BarbeiroAjustado, ServicoResumo } from "@/lib/agregacoes";

interface DadosEquipe {
  servicos: ServicoResumo[];
  barbeiros: BarbeiroAjustado[];
  temDados: boolean;
}

const ATALHOS: [string, string][] = [
  ["00", "Como ler"],
  ["01", "O período"],
  ["02", "Decisões"],
  ["03", "Tendência"],
  ["04", "Semanas"],
  ["05", "Serviços"],
  ["06", "Barbeiros"],
  ["08", "Unidades"],
  ["09", "Resumo"],
  ["10", "Glossário"],
];

export default function PaginaHoje() {
  const [periodo, setPeriodo] = useState("sete");
  const [de, setDe] = useState(hojeEmSaoPaulo);
  const { dados, carregando, erro } = useProjecao(periodo, de);

  const [equipe, setEquipe] = useState<Profissional[]>([]);
  const [documentos, setDocumentos] = useState<DocumentoUnidade[]>([]);
  const [analitico, setAnalitico] = useState<DadosEquipe | null>(null);

  useEffect(() => {
    fetch("/api/profissionais", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((corpo) => setEquipe((corpo?.profissionais as Profissional[]) ?? []))
      .catch(() => setEquipe([]));

    fetch("/api/juridico", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((corpo) => setDocumentos((corpo?.documentos as DocumentoUnidade[]) ?? []))
      .catch(() => setDocumentos([]));

    const fim = hojeEmSaoPaulo();
    const inicio = somarDias(fim, -27);
    fetch(`/api/equipe?inicio=${inicio}&fim=${fim}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((corpo) => setAnalitico(corpo ? (corpo as DadosEquipe) : null))
      .catch(() => setAnalitico(null));
  }, []);

  const mes = new Date().getMonth();

  const decisoes = useMemo(
    () =>
      dados
        ? montarDecisoes({ projecao: dados, profissionais: equipe, documentos, mes })
        : [],
    [dados, equipe, documentos, mes]
  );

  const resumo = useMemo(
    () => (dados ? montarResumo(dados, decisoes.map((d) => d.titulo)) : []),
    [dados, decisoes]
  );

  const emRisco = dados?.unidades.filter((u) => u.status === "risco") ?? [];
  const primeiroFuro = emRisco
    .map((u) => u.primeiroDiaNegativo)
    .filter((data): data is string => Boolean(data))
    .sort()[0];
  const faltaTotal = emRisco.reduce((t, u) => t + u.faltaNoPior, 0);

  return (
    <main className="py-4">
      <div className="mb-5">
        <SeletorPeriodo periodo={periodo} de={de} aoMudar={setPeriodo} aoMudarDe={setDe} />
      </div>

      {carregando && <Carregando />}
      {erro && <Erro mensagem={erro} />}

      {dados && (
        <>
          {/* O veredito em palavras, antes de qualquer número */}
          <section className="mb-7">
            <p className="text-[13px] text-muted">
              {formatarDataCompleta(dados.inicio)} a {formatarDataCompleta(dados.fim)}
            </p>
            <h1
              className={`mt-1 text-[28px] font-bold leading-9 tracking-tight ${
                emRisco.length > 0 ? "text-crit" : ""
              }`}
            >
              {emRisco.length === 0
                ? "O caixa cobre tudo no período."
                : emRisco.length === 1
                  ? `${emRisco[0].unidade} não fecha o período.`
                  : `${emRisco.length} unidades não fecham o período.`}
            </h1>
            <p className="mt-1.5 text-[15px] leading-relaxed text-ink2">
              {emRisco.length === 0 ? (
                <>
                  Sobram {formatarMoeda(dados.resumo.saldoFinal)} depois de pagar o que
                  vence.
                </>
              ) : (
                <>
                  Faltam {formatarMoeda(faltaTotal)} no total, e a primeira falha é em{" "}
                  <span className="font-medium text-ink">
                    {primeiroFuro && formatarDataCompleta(primeiroFuro)}
                  </span>
                  .
                </>
              )}
            </p>
          </section>

          <nav className="mb-8 flex flex-wrap gap-1.5 text-[13px]" aria-label="Seções">
            {ATALHOS.map(([numero, rotulo]) => (
              <a
                key={numero}
                href={`#secao-${numero}`}
                className="rounded-full bg-chip px-2.5 py-1 text-ink2"
              >
                <span className="text-muted">{numero}</span> {rotulo}
              </a>
            ))}
          </nav>

          <SecaoComoLer />

          {dados.comparativoRede && dados.comparativoRede.atual.diasComDado > 0 && (
            <SecaoPeriodo dados={dados.comparativoRede} parcial />
          )}

          <SecaoDecisoes decisoes={decisoes} />

          <SecaoEvolucao meses={dados.evolucaoMensal} />
          <SecaoSemanas semanas={dados.semanas} />

          {analitico && analitico.servicos.length > 0 ? (
            <>
              <SecaoServicos servicos={analitico.servicos} />
              <SecaoBarbeiros barbeiros={analitico.barbeiros} />
            </>
          ) : (
            <SecaoNumerada numero="05" titulo="O que vende e quem produz?">
              <p className="rounded border border-ring bg-surface px-4 py-6 text-center text-[13px] leading-relaxed text-ink2">
                A aba Comissões não trouxe lançamentos nos últimos 28 dias. Se ela tem
                dados, confira se a coluna de unidade usa o mesmo nome padronizado das
                outras abas.
              </p>
            </SecaoNumerada>
          )}

          <SecaoNumerada
            numero="07"
            titulo="Onde edito o que está errado?"
            apoio="O painel é de leitura. Estas três telas permitem alterar."
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <Atalho href="/contas" titulo="Contas a pagar">
                {formatarMoedaCurta(dados.resumo.totalContas)} vencem no período
              </Atalho>
              <Atalho href="/saldos" titulo="Saldos em conta">
                {formatarMoedaCurta(dados.resumo.saldoInicial)} informados hoje
              </Atalho>
              <Atalho href="/juridico" titulo="Jurídico">
                contratos, notas fiscais e documentos
              </Atalho>
            </div>
          </SecaoNumerada>

          <SecaoUnidades dados={dados} periodo={periodo} de={de} />
          <SecaoResumo dados={dados} linhas={resumo} />
          <Glossario />
        </>
      )}
    </main>
  );
}

function Atalho({
  href,
  titulo,
  children,
}: {
  href: string;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className="rounded border border-ring bg-surface p-3">
      <p className="font-medium">{titulo}</p>
      <p className="mt-0.5 text-[13px] text-ink2">{children}</p>
    </Link>
  );
}
