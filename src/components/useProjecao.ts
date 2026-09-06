"use client";

import { useCallback, useEffect, useState } from "react";
import type { RespostaProjecao } from "@/lib/types";

export function useProjecao(periodo: string, de: string) {
  const [dados, setDados] = useState<RespostaProjecao | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const resposta = await fetch(`/api/projecao?periodo=${periodo}&de=${de}`, {
        cache: "no-store",
      });
      const corpo = await resposta.json();
      if (!resposta.ok) throw new Error(corpo?.erro ?? "Falha ao carregar a projeção.");
      setDados(corpo as RespostaProjecao);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Falha ao carregar a projeção.");
    } finally {
      setCarregando(false);
    }
  }, [periodo, de]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return { dados, carregando, erro, recarregar: carregar };
}
