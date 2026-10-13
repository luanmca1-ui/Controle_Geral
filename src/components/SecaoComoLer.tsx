"use client";

import { SecaoNumerada } from "./ui";

const CARTOES = [
  {
    termo: "Realizado e projetado",
    texto:
      "Dia já lançado na planilha entra pelo valor real. Dia à frente entra pela média das últimas ocorrências daquele dia da semana. No gráfico, barra cheia é realizado, barra hachurada é projeção.",
  },
  {
    termo: "Entra em conta",
    texto:
      "Crédito, débito e pix, já descontadas as taxas da maquininha. Dinheiro em espécie fica de fora porque não passa pela conta bancária e não paga boleto.",
  },
  {
    termo: "Comissão",
    texto:
      "Quando a semana já foi apurada na aba Comissões, vale o valor real. Enquanto a semana não fecha, vale o percentual configurado sobre o faturamento projetado.",
  },
  {
    termo: "Variação normal",
    texto:
      "Quando a diferença entre dois períodos não resiste ao teste estatístico, o painel mostra o número em cinza com esse aviso. Significa oscilação, não mudança de patamar.",
  },
  {
    termo: "Período parcial",
    texto:
      "As comparações terminam no último dia que a planilha recebeu, e não em hoje. Comparar contra dias ainda não lançados faria o período atual parecer sempre pior.",
  },
  {
    termo: "Média diária",
    texto:
      "Semanas e meses são comparados por média por dia, não por total. Um mês de 28 dias contra um de 31 daria diferença só pelo tamanho.",
  },
];

export default function SecaoComoLer() {
  return (
    <SecaoNumerada
      numero="00"
      titulo="Como leio este painel?"
      apoio="Seis definições que mudam a leitura de todo o resto."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CARTOES.map((cartao) => (
          <div key={cartao.termo} className="rounded border border-ring bg-surface p-3">
            <p className="font-medium">{cartao.termo}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-ink2">{cartao.texto}</p>
          </div>
        ))}
      </div>
    </SecaoNumerada>
  );
}
