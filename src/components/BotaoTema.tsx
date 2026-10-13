"use client";

import { useEffect, useState } from "react";

type Escolha = "claro" | "escuro" | "sistema";

/**
 * Alternador de tema. Sem escolha salva, vale a preferência do sistema, e o
 * CSS resolve sozinho. Escolhendo à mão, grava data-theme no html.
 */
export default function BotaoTema() {
  const [escolha, setEscolha] = useState<Escolha>("sistema");

  useEffect(() => {
    const salvo = window.localStorage.getItem("caixa:tema") as Escolha | null;
    if (salvo === "claro" || salvo === "escuro") aplicar(salvo);
  }, []);

  function aplicar(nova: Escolha) {
    setEscolha(nova);
    const html = document.documentElement;

    if (nova === "sistema") {
      html.removeAttribute("data-theme");
      window.localStorage.removeItem("caixa:tema");
      return;
    }

    html.setAttribute("data-theme", nova === "escuro" ? "dark" : "light");
    window.localStorage.setItem("caixa:tema", nova);
  }

  function alternar() {
    const atual =
      escolha === "sistema"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "escuro"
          : "claro"
        : escolha;

    aplicar(atual === "escuro" ? "claro" : "escuro");
  }

  return (
    <button
      type="button"
      onClick={alternar}
      className="shrink-0 rounded border border-ring px-2 py-1 text-xs text-ink2"
      aria-label="Alternar entre tema claro e escuro"
    >
      {escolha === "escuro" ? "Claro" : "Escuro"}
    </button>
  );
}
