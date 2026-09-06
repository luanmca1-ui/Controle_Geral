"use client";

import { useCallback, useEffect, useState } from "react";
import { Carregando, Erro, Vazio } from "@/components/Estado";
import { formatarDataCurta, formatarMoeda } from "@/lib/parse";
import type { SaldoUnidade } from "@/lib/types";

export default function PaginaSaldos() {
  const [saldos, setSaldos] = useState<SaldoUnidade[]>([]);
  const [rascunho, setRascunho] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState<string | null>(null);
  const [salvo, setSalvo] = useState<string | null>(null);
  const [podeEditar, setPodeEditar] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const resposta = await fetch("/api/saldos", { cache: "no-store" });
      const corpo = await resposta.json();
      if (!resposta.ok) throw new Error(corpo?.erro ?? "Falha ao ler os saldos.");
      setSaldos(corpo.saldos as SaldoUnidade[]);
      setPodeEditar(Boolean(corpo.podeEditar));
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Falha ao ler os saldos.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function salvar(unidade: string) {
    const texto = (rascunho[unidade] ?? "").replace(/\./g, "").replace(",", ".");
    const valor = Number(texto);
    if (!Number.isFinite(valor)) {
      setErro(`Valor inválido para ${unidade}.`);
      return;
    }

    setSalvando(unidade);
    setErro(null);
    try {
      const resposta = await fetch("/api/saldos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unidade, saldo: valor }),
      });
      const corpo = await resposta.json();
      if (!resposta.ok) throw new Error(corpo?.erro ?? "Falha ao gravar.");

      const atualizado = corpo.saldo as SaldoUnidade;
      setSaldos((atual) =>
        atual.map((item) => (item.unidade === unidade ? atualizado : item))
      );
      setRascunho((atual) => {
        const copia = { ...atual };
        delete copia[unidade];
        return copia;
      });
      setSalvo(unidade);
      window.setTimeout(() => setSalvo(null), 2500);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Falha ao gravar.");
    } finally {
      setSalvando(null);
    }
  }

  return (
    <main className="py-5">
      <header className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Saldos em conta</h1>
        <p className="mt-0.5 text-sm text-grafite">
          {podeEditar
            ? "Abra o extrato de cada unidade e informe o saldo. É daqui que a projeção parte."
            : "Saldos informados pela gestão. Seu acesso é somente de leitura."}
        </p>
      </header>

      {carregando && <Carregando texto="Lendo a aba ContaStone" />}
      {erro && (
        <div className="mb-4">
          <Erro mensagem={erro} />
        </div>
      )}

      {!carregando && saldos.length === 0 && (
        <Vazio texto="Nenhuma unidade na aba ContaStone." />
      )}

      <ul className="divide-y divide-linha border border-linha bg-superficie">
        {saldos.map((item) => {
          const editando = rascunho[item.unidade] !== undefined;
          const desatualizado = item.diasDesatualizado === null || item.diasDesatualizado > 7;

          return (
            <li key={item.unidade} className="px-3 py-3">
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <span className="min-w-0 flex-1 truncate font-medium">{item.unidade}</span>
                <span className={`text-xs ${desatualizado ? "text-atencao" : "text-grafite"}`}>
                  {item.atualizadoEm
                    ? `${formatarDataCurta(item.atualizadoEm)}${item.atualizadoPor ? ` · ${item.atualizadoPor}` : ""}`
                    : "nunca atualizado"}
                </span>
              </div>

              {podeEditar ? (
              <div className="flex gap-2">
                <input
                  inputMode="decimal"
                  value={editando ? rascunho[item.unidade] : ""}
                  onChange={(evento) =>
                    setRascunho((atual) => ({ ...atual, [item.unidade]: evento.target.value }))
                  }
                  placeholder={formatarMoeda(item.saldo)}
                  aria-label={`Novo saldo de ${item.unidade}`}
                  className="min-w-0 flex-1 border border-linha px-3 py-2 font-mono text-sm"
                />
                <button
                  type="button"
                  disabled={!editando || salvando === item.unidade}
                  onClick={() => void salvar(item.unidade)}
                  className="shrink-0 bg-pinho px-4 py-2 text-sm font-medium text-papel disabled:bg-linha disabled:text-grafite"
                >
                  {salvando === item.unidade ? "Salvando" : "Salvar"}
                </button>
              </div>
              ) : (
                <p className="font-mono text-sm">{formatarMoeda(item.saldo)}</p>
              )}

              {salvo === item.unidade && (
                <p className="mt-1.5 text-sm text-folga">Saldo salvo na planilha.</p>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
