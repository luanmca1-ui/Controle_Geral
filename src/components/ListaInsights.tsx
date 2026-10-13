"use client";

import { Cartao } from "./ui";
import type { Insight } from "@/lib/analise";

const TOM = {
  bom: "folga",
  ruim: "risco",
  neutro: "neutro",
} as const;

export default function ListaInsights({ itens }: { itens: Insight[] }) {
  if (itens.length === 0) return null;

  return (
    <ul className="space-y-2">
      {itens.map((nota, indice) => (
        <li key={indice}>
          <Cartao tom={TOM[nota.tom]}>
            <div className="px-3 py-2.5">
              <p className="font-medium leading-snug">{nota.titulo}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-grafite">{nota.texto}</p>
            </div>
          </Cartao>
        </li>
      ))}
    </ul>
  );
}
