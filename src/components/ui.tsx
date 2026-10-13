import type { ReactNode } from "react";

/**
 * Peças visuais compartilhadas.
 *
 * Duas regras que valem para o painel inteiro:
 * a barra colorida à esquerda é reservada para status, e nunca para enfeitar
 * um cartão; e o número é o herói, então rótulo vem em corpo pequeno e o
 * valor em tamanho grande com dígitos de largura fixa.
 */

export type Tom = "folga" | "atencao" | "risco" | "neutro";

const BARRA: Record<Tom, string> = {
  folga: "border-l-4 border-folga",
  atencao: "border-l-4 border-atencao",
  risco: "border-l-4 border-risco",
  neutro: "border-l-4 border-aco",
};

const TEXTO: Record<Tom, string> = {
  folga: "text-folga",
  atencao: "text-atencao",
  risco: "text-risco",
  neutro: "text-grafite",
};

const FUNDO_PILULA: Record<Tom, string> = {
  folga: "bg-goodSoft text-folga",
  atencao: "bg-warnSoft text-atencao",
  risco: "bg-critSoft text-risco",
  neutro: "bg-chip text-grafite",
};

export function Secao({
  titulo,
  apoio,
  acao,
  children,
}: {
  titulo: string;
  apoio?: ReactNode;
  acao?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mb-7">
      <div className="mb-2 flex items-baseline justify-between gap-3 border-b border-linha pb-1.5">
        <h2 className="text-base font-semibold tracking-tight">{titulo}</h2>
        {acao}
      </div>
      {apoio && <p className="mb-2.5 text-sm leading-relaxed text-grafite">{apoio}</p>}
      {children}
    </section>
  );
}

/** Seção numerada, no padrão do briefing: número em badge e pergunta como título. */
export function SecaoNumerada({
  numero,
  titulo,
  apoio,
  acao,
  children,
}: {
  numero: string;
  titulo: string;
  apoio?: ReactNode;
  acao?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mb-9" id={`secao-${numero}`}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b border-ring pb-2">
        <h2 className="flex items-baseline gap-2 text-[20px] font-semibold tracking-tight">
          <span className="rounded bg-chip px-1.5 py-0.5 text-[11px] font-bold text-muted">
            {numero}
          </span>
          {titulo}
        </h2>
        {acao}
      </div>
      {apoio && <p className="mb-3 text-[13px] leading-relaxed text-ink2">{apoio}</p>}
      {children}
    </section>
  );
}

export function Cartao({
  tom,
  children,
  className = "",
}: {
  tom?: Tom;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`border border-linha bg-superficie ${tom ? BARRA[tom] : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export function Metrica({
  rotulo,
  valor,
  apoio,
  delta,
  tamanho = "media",
}: {
  rotulo: string;
  valor: string;
  apoio?: ReactNode;
  delta?: number | null;
  tamanho?: "media" | "grande";
}) {
  return (
    <div>
      <p className="text-[13px] leading-snug text-grafite">{rotulo}</p>
      <p
        className={`font-semibold tracking-tight ${
          tamanho === "grande" ? "text-[28px] leading-9" : "text-xl leading-7"
        }`}
      >
        {valor}
      </p>
      {delta !== undefined && delta !== null && <Delta valor={delta} />}
      {apoio && <p className="text-xs leading-snug text-grafite">{apoio}</p>}
    </div>
  );
}

export function Delta({ valor, sufixo = "" }: { valor: number; sufixo?: string }) {
  const subiu = valor >= 0;
  return (
    <p className={`text-xs font-medium ${subiu ? "text-folga" : "text-risco"}`}>
      {subiu ? "▲" : "▼"} {Math.abs(valor).toFixed(1)}%{sufixo}
    </p>
  );
}

export function Pilula({
  tom = "neutro",
  children,
}: {
  tom?: Tom;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${FUNDO_PILULA[tom]}`}
    >
      {children}
    </span>
  );
}

export function TextoTom({ tom, children }: { tom: Tom; children: ReactNode }) {
  return <span className={TEXTO[tom]}>{children}</span>;
}

/** Barra de proporção simples, usada em ranking e percentuais. */
export function Barra({ fracao, tom = "neutro" }: { fracao: number; tom?: Tom }) {
  const cor =
    tom === "folga"
      ? "bg-folga"
      : tom === "atencao"
        ? "bg-atencao"
        : tom === "risco"
          ? "bg-risco"
          : "bg-pinho";

  return (
    <div className="h-1 w-full bg-papel">
      <div
        className={`h-full ${cor}`}
        style={{ width: `${Math.max(0, Math.min(1, fracao)) * 100}%` }}
      />
    </div>
  );
}
