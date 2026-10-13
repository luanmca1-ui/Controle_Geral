"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export default function PaginaLogin() {
  const router = useRouter();
  const campo = useRef<HTMLInputElement>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  /**
   * O código é lido do próprio campo, e não de um estado do React.
   *
   * Gerenciador de senha e preenchimento automático escrevem o valor direto no
   * input sem disparar onChange. Guardando em estado, o texto aparece na tela
   * mas o envio sai vazio, e o botão nunca destrava.
   */
  async function entrar() {
    const codigo = campo.current?.value.trim() ?? "";

    if (!codigo) {
      setErro("Digite o código de acesso.");
      campo.current?.focus();
      return;
    }

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
      <p className="mt-1 text-sm leading-relaxed text-grafite">
        Use o código que você recebeu. Ele identifica quem está acessando.
      </p>

      <form
        className="mt-6 space-y-3"
        onSubmit={(evento) => {
          evento.preventDefault();
          void entrar();
        }}
      >
        <label className="block">
          <span className="mb-1 block text-sm text-grafite">Código de acesso</span>
          <input
            ref={campo}
            name="codigo"
            type="text"
            inputMode="text"
            autoFocus
            autoCapitalize="characters"
            autoCorrect="off"
            autoComplete="username"
            spellCheck={false}
            enterKeyHint="go"
            onInput={() => setErro(null)}
            className="w-full border border-linha bg-superficie px-3 py-3 text-center font-mono text-lg tracking-widest"
          />
        </label>

        <button
          type="submit"
          disabled={entrando}
          className="w-full bg-pinho px-4 py-3 font-medium text-papel disabled:bg-linha disabled:text-grafite"
        >
          {entrando ? "Entrando" : "Entrar"}
        </button>

        {erro && (
          <p
            role="alert"
            className="border-l-4 border-risco bg-superficie px-3 py-2 text-sm text-risco"
          >
            {erro}
          </p>
        )}
      </form>

      <p className="mt-8 text-sm leading-relaxed text-grafite">
        Perdeu o código ou ele parou de funcionar? Fale com quem administra o painel.
      </p>
    </main>
  );
}
