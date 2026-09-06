"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function PaginaLogin() {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  async function entrar() {
    if (!codigo.trim()) return;
    setEntrando(true);
    setErro(null);
    try {
      const resposta = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo }),
      });
      const corpo = await resposta.json();
      if (!resposta.ok) throw new Error(corpo?.erro ?? "Não foi possível entrar.");
      router.push("/");
      router.refresh();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível entrar.");
      setEntrando(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col justify-center py-10">
      <h1 className="text-2xl font-bold tracking-tight">Entrar no painel</h1>
      <p className="mt-1 text-sm text-grafite">
        Use o código que você recebeu. Ele identifica quem está acessando.
      </p>

      <div className="mt-6 space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm text-grafite">Código de acesso</span>
          <input
            value={codigo}
            onChange={(evento) => setCodigo(evento.target.value)}
            onKeyDown={(evento) => {
              if (evento.key === "Enter") void entrar();
            }}
            autoFocus
            autoCapitalize="characters"
            autoComplete="one-time-code"
            spellCheck={false}
            className="w-full border border-linha bg-superficie px-3 py-3 text-center font-mono text-lg tracking-widest"
          />
        </label>

        <button
          type="button"
          onClick={() => void entrar()}
          disabled={entrando || !codigo.trim()}
          className="w-full bg-pinho px-4 py-3 font-medium text-papel disabled:bg-linha disabled:text-grafite"
        >
          {entrando ? "Entrando" : "Entrar"}
        </button>

        {erro && <p className="border-l-2 border-risco px-3 py-2 text-sm text-risco">{erro}</p>}
      </div>

      <p className="mt-8 text-sm text-grafite">
        Perdeu o código ou ele parou de funcionar? Fale com quem administra o painel.
      </p>
    </main>
  );
}
