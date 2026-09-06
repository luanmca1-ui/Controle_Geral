/**
 * Faixa da marca. É o único elemento decorativo do painel: repete o formato
 * da fita vermelha do logo, com as pontas recortadas.
 */
export default function Marca({ legenda }: { legenda?: string }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <span className="fita bg-risco px-4 py-1.5 text-sm font-bold uppercase tracking-[0.18em] text-papel">
        The Barber Express
      </span>
      {legenda && <span className="text-xs text-grafite">{legenda}</span>}
    </div>
  );
}
