"use client";

/**
 * Pequeno múltiplo de 4 a 6 meses.
 * O ponto do mês incompleto é vazado, para não parecer queda o que é só mês
 * pela metade.
 */
export default function Sparkline({
  valores,
  parciais,
  rotulos,
  formatar,
}: {
  valores: number[];
  parciais: boolean[];
  rotulos: string[];
  formatar: (valor: number) => string;
}) {
  if (valores.length < 2) return null;

  const largura = 260;
  const altura = 54;
  const margem = 5;

  const maior = Math.max(...valores);
  const menor = Math.min(...valores);
  const faixa = maior - menor || 1;

  const passo = (largura - margem * 2) / (valores.length - 1);
  const pontos = valores.map((valor, indice) => ({
    x: margem + passo * indice,
    y: margem + (1 - (valor - menor) / faixa) * (altura - margem * 2),
    valor,
    parcial: parciais[indice],
    rotulo: rotulos[indice],
  }));

  const linha = pontos.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const ultimo = pontos[pontos.length - 1];

  return (
    <svg
      viewBox={`0 0 ${largura} ${altura}`}
      className="h-auto w-full"
      role="img"
      aria-label={`Evolução: ${rotulos.map((r, i) => `${r} ${formatar(valores[i])}`).join(", ")}`}
    >
      <path d={linha} fill="none" stroke="var(--s1)" strokeWidth="2" strokeLinejoin="round" />

      {pontos.map((p) => (
        <circle
          key={p.rotulo}
          cx={p.x}
          cy={p.y}
          r={p === ultimo ? 4 : 3}
          fill={p.parcial ? "var(--surface)" : "var(--s1)"}
          stroke="var(--s1)"
          strokeWidth="1.5"
        >
          <title>
            {p.rotulo}: {formatar(p.valor)}
            {p.parcial ? " (mês incompleto)" : ""}
          </title>
        </circle>
      ))}
    </svg>
  );
}
