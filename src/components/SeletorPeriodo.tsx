"use client";

import { hojeEmSaoPaulo } from "@/lib/parse";

const OPCOES = [
  { valor: "sete", rotulo: "7 dias" },
  { valor: "quinze", rotulo: "15 dias" },
  { valor: "mes", rotulo: "Até o fim do mês" },
];

export default function SeletorPeriodo({
  periodo,
  de,
  aoMudar,
  aoMudarDe,
}: {
  periodo: string;
  de: string;
  aoMudar: (valor: string) => void;
  aoMudarDe: (valor: string) => void;
}) {
  const hoje = hojeEmSaoPaulo();

  return (
    <div className="space-y-2">
      <div className="flex border border-linha bg-superficie" role="group" aria-label="Período">
        {OPCOES.map((opcao) => {
          const ativo = periodo === opcao.valor;
          return (
            <button
              key={opcao.valor}
              type="button"
              onClick={() => aoMudar(opcao.valor)}
              aria-pressed={ativo}
              className={`flex-1 px-2 py-2 text-sm ${
                ativo ? "bg-pinho font-medium text-papel" : "text-grafite"
              }`}
            >
              {opcao.rotulo}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <label className="flex flex-1 items-center gap-2 border border-linha bg-superficie px-3 py-2">
          <span className="shrink-0 text-sm text-grafite">A partir de</span>
          <input
            type="date"
            value={de}
            onChange={(evento) => aoMudarDe(evento.target.value || hoje)}
            className="min-w-0 flex-1 bg-transparent font-mono text-sm"
          />
        </label>
        {de !== hoje && (
          <button
            type="button"
            onClick={() => aoMudarDe(hoje)}
            className="shrink-0 border border-linha bg-superficie px-3 py-2 text-sm text-grafite"
          >
            Hoje
          </button>
        )}
      </div>
    </div>
  );
}
