"use client";

import { useEffect, useState } from "react";
import { Carregando, Erro } from "@/components/Estado";
import type { AppConfig } from "@/lib/types";

const CAMPOS: {
  chave: keyof AppConfig;
  rotulo: string;
  ajuda: string;
  sufixo: string;
  percentual?: boolean;
}[] = [
  {
    chave: "taxaCredito",
    rotulo: "Taxa do crédito",
    ajuda: "Quanto a maquininha desconta do crédito antecipado.",
    sufixo: "%",
    percentual: true,
  },
  {
    chave: "taxaDebito",
    rotulo: "Taxa do débito",
    ajuda: "Desconto aplicado sobre as vendas no débito.",
    sufixo: "%",
    percentual: true,
  },
  {
    chave: "taxaPix",
    rotulo: "Taxa do pix",
    ajuda: "Deixe zero se o pix não tem custo.",
    sufixo: "%",
    percentual: true,
  },
  {
    chave: "percentualComissao",
    rotulo: "Comissão dos barbeiros",
    ajuda: "Fatia do faturamento da semana que vira comissão.",
    sufixo: "%",
    percentual: true,
  },
  {
    chave: "percentualComissaoAVista",
    rotulo: "Comissão paga à vista",
    ajuda: "Quanto da comissão sai do dinheiro em espécie, sem passar pela conta. Se o dinheiro do período não cobrir, a diferença volta para a conta.",
    sufixo: "%",
    percentual: true,
  },
  {
    chave: "diaComissao",
    rotulo: "Dia da comissão",
    ajuda: "0 domingo, 1 segunda, 2 terça, e assim por diante.",
    sufixo: "dia da semana",
  },
  {
    chave: "diaInsumos",
    rotulo: "Dia dos insumos",
    ajuda: "O valor médio de cada unidade fica na coluna E da aba ContaStone.",
    sufixo: "dia da semana",
  },
  {
    chave: "janelaSemanas",
    rotulo: "Semanas na média",
    ajuda: "Quantas ocorrências de cada dia da semana entram no cálculo.",
    sufixo: "semanas",
  },
  {
    chave: "reservaMinima",
    rotulo: "Reserva mínima",
    ajuda: "Abaixo disso a unidade fica em atenção, mesmo com saldo positivo.",
    sufixo: "R$",
  },
  {
    chave: "diasSaldoDesatualizado",
    rotulo: "Saldo velho depois de",
    ajuda: "Dias sem atualizar até o painel avisar que o número não é confiável.",
    sufixo: "dias",
  },
];

export default function PaginaConfig() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    async function carregar() {
      try {
        const resposta = await fetch("/api/config", { cache: "no-store" });
        const corpo = await resposta.json();
        if (!resposta.ok) throw new Error(corpo?.erro ?? "Falha ao ler os ajustes.");
        setConfig(corpo.config as AppConfig);
      } catch (falha) {
        setErro(falha instanceof Error ? falha.message : "Falha ao ler os ajustes.");
      } finally {
        setCarregando(false);
      }
    }
    void carregar();
  }, []);

  async function salvar() {
    if (!config) return;
    setSalvando(true);
    setErro(null);
    try {
      const resposta = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const corpo = await resposta.json();
      if (!resposta.ok) throw new Error(corpo?.erro ?? "Falha ao gravar.");
      setSalvo(true);
      window.setTimeout(() => setSalvo(false), 2500);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Falha ao gravar.");
    } finally {
      setSalvando(false);
    }
  }

  function alterar(chave: keyof AppConfig, texto: string, percentual: boolean) {
    const numero = Number(texto.replace(",", "."));
    if (!Number.isFinite(numero)) return;
    setConfig((atual) =>
      atual ? { ...atual, [chave]: percentual ? numero / 100 : numero } : atual
    );
  }

  return (
    <main className="py-5">
      <header className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Ajustes</h1>
        <p className="mt-0.5 text-sm text-grafite">
          Gravados na aba AppConfig da planilha, criada automaticamente na primeira gravação.
        </p>
      </header>

      {carregando && <Carregando texto="Lendo os ajustes" />}
      {erro && (
        <div className="mb-4">
          <Erro mensagem={erro} />
        </div>
      )}

      {config && (
        <>
          <ul className="divide-y divide-linha border border-linha bg-superficie">
            {CAMPOS.map((campo) => {
              const bruto = config[campo.chave];
              const exibido = campo.percentual ? Number((bruto * 100).toFixed(4)) : bruto;
              return (
                <li key={campo.chave} className="px-3 py-3">
                  <label className="block">
                    <span className="block font-medium">{campo.rotulo}</span>
                    <span className="mb-2 block text-sm text-grafite">{campo.ajuda}</span>
                    <span className="flex items-center gap-2">
                      <input
                        inputMode="decimal"
                        defaultValue={String(exibido)}
                        onChange={(evento) =>
                          alterar(campo.chave, evento.target.value, campo.percentual ?? false)
                        }
                        className="w-32 border border-linha px-3 py-2 font-mono text-sm"
                      />
                      <span className="text-sm text-grafite">{campo.sufixo}</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            onClick={() => void salvar()}
            disabled={salvando}
            className="mt-4 w-full bg-pinho px-4 py-3 font-medium text-papel disabled:bg-linha disabled:text-grafite"
          >
            {salvando ? "Salvando" : "Salvar ajustes"}
          </button>

          {salvo && <p className="mt-2 text-sm text-folga">Ajustes salvos na planilha.</p>}
        </>
      )}
    </main>
  );
}
