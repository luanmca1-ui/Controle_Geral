"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const ITENS = [
  { href: "/", rotulo: "Caixa", somenteEditor: false },
  { href: "/contas", rotulo: "Contas", somenteEditor: false },
  { href: "/saldos", rotulo: "Saldos", somenteEditor: false },
  { href: "/config", rotulo: "Ajustes", somenteEditor: true },
];

export default function NavegacaoInferior() {
  const caminho = usePathname();
  const [editor, setEditor] = useState(true);

  useEffect(() => {
    if (caminho === "/login") return;
    fetch("/api/login", { cache: "no-store" })
      .then((resposta) => (resposta.ok ? resposta.json() : null))
      .then((corpo) => {
        const perfil = corpo?.sessao?.perfil;
        setEditor(perfil === "dono" || perfil === "gestora");
      })
      .catch(() => setEditor(true));
  }, [caminho]);

  if (caminho === "/login") return null;

  const visiveis = ITENS.filter((item) => editor || !item.somenteEditor);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 border-t border-linha bg-superficie"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Navegacao principal"
    >
      <ul className="mx-auto flex w-full max-w-2xl">
        {visiveis.map((item) => {
          const ativo =
            item.href === "/" ? caminho === "/" : caminho.startsWith(item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={ativo ? "page" : undefined}
                className={`flex h-14 items-center justify-center text-sm ${
                  ativo ? "font-semibold text-pinho" : "text-grafite"
                }`}
              >
                <span
                  className={
                    ativo ? "border-b-2 border-pinho pb-0.5" : "border-b-2 border-transparent pb-0.5"
                  }
                >
                  {item.rotulo}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
