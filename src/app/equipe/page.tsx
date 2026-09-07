"use client";

import { useState } from "react";
import EsbocoAviso from "@/components/EsbocoAviso";
import { formatarMoeda } from "@/lib/parse";

const UNIDADES = ["Toda a rede", "Castanheira", "Metrópole", "Marabá"];

interface Profissional {
  nome: string;
  unidade: string;
  faturamento: number;
  atendimentos: number;
  ticket: number;
  retorno: number; // % de clientes que voltaram
  variacao: number; // vs semana anterior
  ocupacao: number; // % da agenda preenchida
}

const RANKING: Profissional[] = [
  { nome: "Diego Martins", unidade: "Metrópole", faturamento: 4820, atendimentos: 112, ticket: 43.04, retorno: 61, variacao: 12.4, ocupacao: 88 },
  { nome: "Andrei Teixeira", unidade: "Castanheira", faturamento: 4310, atendimentos: 104, ticket: 41.44, retorno: 58, variacao: 3.1, ocupacao: 81 },
  { nome: "Thiago Moreira", unidade: "Marabá", faturamento: 3970, atendimentos: 91, ticket: 43.63, retorno: 64, variacao: -2.7, ocupacao: 76 },
  { nome: "Anderson Aires", unidade: "Castanheira", faturamento: 3540, atendimentos: 88, ticket: 40.23, retorno: 49, variacao: 8.9, ocupacao: 72 },
  { nome: "Fernanda Alves", unidade: "Metrópole", faturamento: 3120, atendimentos: 74, ticket: 42.16, retorno: 55, variacao: -11.2, ocupacao: 63 },
  { nome: "Bruno Carvalho", unidade: "Marabá", faturamento: 2280, atendimentos: 61, ticket: 37.38, retorno: 38, variacao: -18.6, ocupacao: 51 },
];

const SERVICOS = [
  { nome: "Corte", participacao: 54, ticket: 35 },
  { nome: "Corte + barba", participacao: 22, ticket: 58 },
  { nome: "Barba", participacao: 12, ticket: 28 },
  { nome: "Química e pigmentação", participacao: 7, ticket: 92 },
  { nome: "Produtos", participacao: 5, ticket: 46 },
];

export default function PaginaEquipe() {
  const [unidade, setUnidade] = useState(UNIDADES[0]);

  const lista =
    unidade === "Toda a rede" ? RANKING : RANKING.filter((p) => p.unidade === unidade);
  const maior = Math.max(...lista.map((p) => p.faturamento), 1);

  return (
    <main className="py-5">
      <header className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Equipe</h1>
        <p className="mt-0.5 text-sm text-grafite">
          Desempenho por profissional, semana a semana, para os líderes acompanharem.
        </p>
      </header>

      <EsbocoAviso>
        Esta tela precisa do faturamento aberto por profissional, que hoje a planilha
        ainda não tem: o Faturamento é por unidade e por dia, sem a coluna de quem
        atendeu.
      </EsbocoAviso>

      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-linha pb-px" role="tablist">
        {UNIDADES.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={item === unidade}
            onClick={() => setUnidade(item)}
            className={`shrink-0 border-b-2 px-3 py-1.5 text-sm ${
              item === unidade
                ? "border-pinho font-semibold text-pinho"
                : "border-transparent text-grafite"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold">Ranking da semana</h2>
        <ol className="divide-y divide-linha border border-linha bg-superficie">
          {lista.map((pessoa, indice) => (
            <li key={pessoa.nome} className="px-3 py-3">
              <div className="flex items-baseline gap-3">
                <span className="w-5 shrink-0 font-mono text-sm text-grafite">
                  {indice + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{pessoa.nome}</span>
                  <span className="block text-sm text-grafite">
                    {pessoa.unidade} · {pessoa.atendimentos} atendimentos · ticket{" "}
                    {formatarMoeda(pessoa.ticket)}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-mono text-sm font-medium">
                    {formatarMoeda(pessoa.faturamento)}
                  </span>
                  <span
                    className={`block text-xs ${
                      pessoa.variacao >= 0 ? "text-folga" : "text-risco"
                    }`}
                  >
                    {pessoa.variacao >= 0 ? "+" : ""}
                    {pessoa.variacao.toFixed(1)}% vs semana anterior
                  </span>
                </span>
              </div>

              <div className="mt-2 h-1.5 w-full bg-papel">
                <div
                  className="h-full bg-pinho"
                  style={{ width: `${(pessoa.faturamento / maior) * 100}%` }}
                />
              </div>

              <dl className="mt-2 flex gap-4 text-xs text-grafite">
                <div className="flex gap-1">
                  <dt>Retorno</dt>
                  <dd className="font-mono text-tinta">{pessoa.retorno}%</dd>
                </div>
                <div className="flex gap-1">
                  <dt>Ocupação</dt>
                  <dd
                    className={`font-mono ${
                      pessoa.ocupacao < 60 ? "text-atencao" : "text-tinta"
                    }`}
                  >
                    {pessoa.ocupacao}%
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ol>
        <p className="mt-2 text-xs text-grafite">
          Retorno é a fatia de clientes daquele profissional que voltaram nos últimos 60
          dias. Ocupação é quanto da agenda dele foi preenchida. Faturamento alto com
          retorno baixo costuma indicar volume sem fidelização.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold">Mix de serviços</h2>
        <ul className="divide-y divide-linha border border-linha bg-superficie">
          {SERVICOS.map((servico) => (
            <li key={servico.nome} className="px-3 py-2.5">
              <div className="flex items-baseline gap-3 text-sm">
                <span className="flex-1">{servico.nome}</span>
                <span className="font-mono text-grafite">
                  ticket {formatarMoeda(servico.ticket)}
                </span>
                <span className="w-10 text-right font-mono font-medium">
                  {servico.participacao}%
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full bg-papel">
                <div className="h-full bg-aco" style={{ width: `${servico.participacao}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="border border-linha bg-superficie p-4 text-sm text-grafite">
        <h2 className="mb-2 text-base font-semibold text-tinta">
          Como sugiro estruturar os dados
        </h2>
        <p className="mb-2">
          Uma aba <strong className="text-tinta">FaturamentoProfissional</strong>, uma
          linha por atendimento ou por profissional/dia:
        </p>
        <p className="mb-3 font-mono text-xs">
          Data · Unidade · Profissional · Serviço · Valor · Forma de pagamento · Cliente ·
          Duração
        </p>
        <p className="mb-2">
          Com a coluna Cliente vem o retorno e a fidelização. Com Duração vem a ocupação
          real da agenda. Sem elas o ranking fica só em faturamento e ticket, que já
          serve, mas mostra bem menos.
        </p>
        <p>
          Se o sistema da barbearia exporta isso, o melhor caminho é jogar a exportação
          numa aba e o painel ler de lá, igual ao que já acontece com o faturamento
          diário. Digitar à mão não se sustenta com 18 unidades.
        </p>
      </section>
    </main>
  );
}
