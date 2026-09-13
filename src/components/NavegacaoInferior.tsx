"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const ITENS = [
  { href: "/hoje", rotulo: "Hoje", aba: "hoje" },
  { href: "/", rotulo: "Caixa", aba: "caixa" },
  { href: "/contas", rotulo: "Contas", aba: "contas" },
  { href: "/saldos", rotulo: "Saldos", aba: "saldos" },
  { href: "/juridico", rotulo: "Jurídico", aba: "juridico" },
  { href: "/equipe", rotulo: "Equipe", aba: "equipe" },
];

export default function NavegacaoInferior() {
  const caminho = usePathname();
  const [abas, setAbas] = useState<string[] | null>(null);

  useEffect(() => {
    if (caminho === "/login") return;
    fetch("/api/login", { cache: "no-store" })
      .then((resposta) => (resposta.ok ? resposta.json() : null))
      .then((corpo) => setAbas((corpo?.sessao?.abas as string[]) ?? null))
      .catch(() => setAbas(null));
  }, [caminho]);

  if (caminho === "/login") return null;

  // enquanto nao sabe, mostra so o que todo perfil tem
  const visiveis = ITENS.filter((item) =>
    abas ? abas.includes(item.aba) : item.aba === "caixa"
  );

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
                className={`flex h-14 items-center justify-center px-1 text-center text-xs ${
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
