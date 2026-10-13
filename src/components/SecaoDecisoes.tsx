"use client";

import { SecaoNumerada } from "./ui";
import type { Decisao } from "@/lib/decisoes";

const BARRA = {
  risco: "border-l-crit",
  atencao: "border-l-warn",
  neutro: "border-l-s1",
} as const;

const NUMERO = {
  risco: "bg-crit",
  atencao: "bg-warn",
  neutro: "bg-s1",
} as const;

export default function SecaoDecisoes({ decisoes }: { decisoes: Decisao[] }) {
  if (decisoes.length === 0) {
    return (
      <SecaoNumerada numero="02" titulo="O que eu faço agora?">
        <p className="rounded border border-ring bg-surface px-4 py-6 text-center text-[13px] text-ink2">
          Nada pede decisão no período. Caixa coberto, contas encaminhadas e equipe em dia.
        </p>
      </SecaoNumerada>
    );
  }

  return (
    <SecaoNumerada
      numero="02"
      titulo="O que eu faço agora?"
      apoio="Em ordem de tamanho do impacto. O rodapé de cada cartão diz o indicador que precisa se mover se a decisão estiver certa."
    >
      <ol className="space-y-3">
        {decisoes.map((decisao, indice) => (
          <li
            key={decisao.titulo}
            className={`rounded border border-ring border-l-4 bg-surface ${BARRA[decisao.tom]}`}
          >
            <div className="p-4">
              <div className="flex items-start gap-3">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white ${NUMERO[decisao.tom]}`}
                >
                  {indice + 1}
                </span>
                <h3 className="text-[15px] font-semibold leading-snug">{decisao.titulo}</h3>
              </div>

              <ul className="mt-2.5 flex flex-wrap gap-1.5">
                <Chip rotulo="Tamanho" valor={decisao.tamanho} destaque />
                {decisao.fatia && <Chip rotulo="Alcance" valor={decisao.fatia} />}
                <Chip rotulo="Dono" valor={decisao.dono} />
                <Chip rotulo="Confiança" valor={decisao.confianca} />
              </ul>

              <p className="mt-2.5 text-[13px] leading-relaxed text-ink2">{decisao.texto}</p>

              <p className="mt-2.5 border-t border-ring pt-2 text-[13px] text-ink2">
                <span className="font-semibold text-ink">Prova em 60 dias:</span>{" "}
                {decisao.prova}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </SecaoNumerada>
  );
}

function Chip({
  rotulo,
  valor,
  destaque,
}: {
  rotulo: string;
  valor: string;
  destaque?: boolean;
}) {
  return (
    <li
      className={`rounded-full px-2.5 py-1 text-[11px] ${
        destaque ? "bg-s1Soft text-s1" : "bg-chip text-ink2"
      }`}
    >
      <span className="text-muted">{rotulo}: </span>
      <span className="font-medium">{valor}</span>
    </li>
  );
}
