"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Dados {
  nome: string;
  perfil: string;
  unidades: string[];
  abas: string[];
}

const ROTULO_PERFIL: Record<string, string> = {
  dono: "acesso total",
  gestora: "edita saldos",
  gerente: "somente leitura",
};

export default function BarraSessao() {
  const caminho = usePathname();
  const router = useRouter();
  const [dados, setDados] = useState<Dados | null>(null);

  useEffect(() => {
    if (caminho === "/login") {
      setDados(null);
      return;
    }
    fetch("/api/login", { cache: "no-store" })
      .then((resposta) => (resposta.ok ? resposta.json() : null))
      .then((corpo) => setDados(corpo?.sessao ?? null))
      .catch(() => setDados(null));
  }, [caminho]);

  if (!dados) return null;

  async function sair() {
    await fetch("/api/login", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-linha py-2 text-xs text-grafite">
      <span className="min-w-0 truncate">
        {dados.nome}
        <span className="text-grafite/70">
          {" · "}
          {dados.unidades.length === 0
            ? `rede inteira, ${ROTULO_PERFIL[dados.perfil] ?? dados.perfil}`
            : dados.unidades.length === 1
              ? dados.unidades[0]
              : `${dados.unidades.length} unidades`}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-3">
        {dados.abas?.includes("ajustes") && (
          <Link href="/config" className="underline underline-offset-2">
            Ajustes
          </Link>
        )}
        <button type="button" onClick={() => void sair()} className="underline underline-offset-2">
          Sair
        </button>
      </span>
    </div>
  );
}
