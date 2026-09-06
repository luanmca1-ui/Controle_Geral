"use client";

import { formatarDataCurta, formatarMoedaCurta, ROTULO_DIA_CURTO } from "@/lib/parse";
import type { DiaProjecao } from "@/lib/types";

/**
 * Dois paineis com o mesmo eixo de dias: em cima o saldo acumulado, embaixo a
 * entrada de cada dia. Escalas separadas de proposito, porque saldo e entrada
 * tem ordens de grandeza diferentes e sobrepor as duas enganaria a leitura.
 *
 * O que ja foi faturado aparece solido. O que e projecao aparece hachurado,
 * com uma divisoria no ponto em que a planilha para.
 */
export default function GraficoCaixa({
  dias,
  reservaMinima = 0,
  aoSelecionar,
  selecionado,
}: {
  dias: DiaProjecao[];
  reservaMinima?: number;
  aoSelecionar?: (data: string) => void;
  selecionado?: string | null;
}) {
  if (dias.length === 0) return null;

  const largura = 700;
  const alturaSaldo = 132;
  const alturaEntrada = 54;
  const espaco = 16;
  const alturaRotulos = 26;
  const alturaTotal = alturaSaldo + espaco + alturaEntrada + alturaRotulos;

  const passo = largura / dias.length;

  // escala do saldo
  const saldos = dias.map((d) => d.saldoFinal);
  const maiorSaldo = Math.max(...saldos, reservaMinima, 0);
  const menorSaldo = Math.min(...saldos, 0);
  const amplitude = maiorSaldo - menorSaldo || 1;
  const y = (valor: number) => ((maiorSaldo - valor) / amplitude) * alturaSaldo;
  const linhaZero = y(0);

  // escala das entradas
  const maiorEntrada = Math.max(...dias.map((d) => d.entrada), 1);
  const baseEntrada = alturaSaldo + espaco + alturaEntrada;

  const pontos = dias.map((dia, indice) => ({
    x: passo * (indice + 0.5),
    y: y(dia.saldoFinal),
    dia,
  }));

  const linha = pontos.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  const ultimoReal = dias.reduce((ultimo, dia, indice) => (dia.real ? indice : ultimo), -1);
  const divisoria = ultimoReal >= 0 && ultimoReal < dias.length - 1
    ? passo * (ultimoReal + 1)
    : null;

  const mostrarRotulo = dias.length <= 16 ? 1 : Math.ceil(dias.length / 12);

  return (
    <figure>
      <svg
        viewBox={`0 0 ${largura} ${alturaTotal}`}
        className="h-auto w-full"
        role="img"
        aria-label="Saldo acumulado e entrada projetada por dia"
      >
        <defs>
          <pattern id="hachura" width="6" height="6" patternTransform="rotate(-45)" patternUnits="userSpaceOnUse">
            <rect width="6" height="6" fill="#F6F1E7" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="#12735C" strokeWidth="3" opacity="0.45" />
          </pattern>
          <pattern id="hachuraRisco" width="6" height="6" patternTransform="rotate(-45)" patternUnits="userSpaceOnUse">
            <rect width="6" height="6" fill="#F6F1E7" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="#C62A38" strokeWidth="3" opacity="0.6" />
          </pattern>
        </defs>

        {/* faixa negativa do saldo */}
        {menorSaldo < 0 && (
          <rect
            x="0"
            y={linhaZero}
            width={largura}
            height={alturaSaldo - linhaZero}
            fill="#C62A38"
            opacity="0.06"
          />
        )}

        {reservaMinima > 0 && (
          <line
            x1="0"
            x2={largura}
            y1={y(reservaMinima)}
            y2={y(reservaMinima)}
            stroke="#E08A1E"
            strokeWidth="1"
            strokeDasharray="2 4"
          />
        )}

        <line x1="0" x2={largura} y1={linhaZero} y2={linhaZero} stroke="#5C6B72" strokeWidth="1" strokeDasharray="4 4" />

        <path d={linha} fill="none" stroke="#16394A" strokeWidth="2.5" strokeLinejoin="round" />

        {pontos.map((p) => (
          <circle
            key={p.dia.data}
            cx={p.x}
            cy={p.y}
            r={selecionado === p.dia.data ? 5 : 3}
            fill={p.dia.saldoFinal < 0 ? "#C62A38" : "#16394A"}
            stroke="#FFFFFF"
            strokeWidth="1.5"
          />
        ))}

        {/* entradas do dia */}
        {dias.map((dia, indice) => {
          const altura = (dia.entrada / maiorEntrada) * alturaEntrada;
          return (
            <rect
              key={dia.data}
              x={passo * indice + passo * 0.18}
              y={baseEntrada - altura}
              width={passo * 0.64}
              height={Math.max(altura, dia.entrada > 0 ? 2 : 0)}
              fill={dia.real ? "#12735C" : "url(#hachura)"}
              stroke={dia.real ? "none" : "#12735C"}
              strokeWidth={dia.real ? 0 : 0.75}
            />
          );
        })}

        <line
          x1="0"
          x2={largura}
          y1={baseEntrada}
          y2={baseEntrada}
          stroke="#DED7C7"
          strokeWidth="1"
        />

        {divisoria !== null && (
          <>
            <line
              x1={divisoria}
              x2={divisoria}
              y1="0"
              y2={baseEntrada}
              stroke="#16394A"
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.6"
            />
            <text x={divisoria + 4} y="11" fontSize="10" fill="#5C6B72">
              projeção
            </text>
          </>
        )}

        {/* areas clicaveis */}
        {aoSelecionar &&
          dias.map((dia, indice) => (
            <rect
              key={dia.data}
              x={passo * indice}
              y="0"
              width={passo}
              height={baseEntrada}
              fill="transparent"
              className="cursor-pointer"
              onClick={() => aoSelecionar(dia.data)}
            >
              <title>{`${formatarDataCurta(dia.data)} — saldo ${formatarMoedaCurta(dia.saldoFinal)}`}</title>
            </rect>
          ))}

        {dias.map((dia, indice) =>
          indice % mostrarRotulo === 0 ? (
            <text
              key={dia.data}
              x={passo * (indice + 0.5)}
              y={baseEntrada + 16}
              fontSize="10"
              textAnchor="middle"
              fill="#5C6B72"
            >
              {ROTULO_DIA_CURTO[dia.diaSemana]} {formatarDataCurta(dia.data).slice(0, 2)}
            </text>
          ) : null
        )}
      </svg>

      <figcaption className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-grafite">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-4 bg-folga" />
          faturamento lançado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-4 border border-folga bg-papel" />
          projeção pela média
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 bg-pinho" />
          saldo acumulado
        </span>
      </figcaption>
    </figure>
  );
}
