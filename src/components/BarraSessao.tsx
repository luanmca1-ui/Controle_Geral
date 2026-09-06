"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Dados {
  nome: string;
  perfil: string;
  unidade: string;
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
          {dados.unidade || ROTULO_PERFIL[dados.perfil] || dados.perfil}
        </span>
      </span>
      <button type="button" onClick={() => void sair()} className="shrink-0 underline underline-offset-2">
        Sair
      </button>
    </div>
  );
}
