import { NextResponse } from "next/server";
import { gravarConfig, lerConfig } from "@/lib/sheets";
import { sessaoAtual } from "@/lib/autorizar";
import { podeEditar } from "@/lib/sessao";
import type { AppConfig } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = await lerConfig();
    return NextResponse.json({ config });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Falha ao ler os ajustes.";
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}

export async function PUT(requisicao: Request) {
  const sessao = await sessaoAtual();
  if (!podeEditar(sessao)) {
    return NextResponse.json({ erro: "Seu acesso é somente de leitura." }, { status: 403 });
  }

  try {
    const corpo = (await requisicao.json()) as Partial<AppConfig>;
    const atual = await lerConfig();

    const numero = (valor: unknown, padrao: number): number => {
      const convertido = Number(valor);
      return Number.isFinite(convertido) ? convertido : padrao;
    };

    const novo: AppConfig = {
      taxaCredito: numero(corpo.taxaCredito, atual.taxaCredito),
      taxaDebito: numero(corpo.taxaDebito, atual.taxaDebito),
      taxaPix: numero(corpo.taxaPix, atual.taxaPix),
      janelaSemanas: Math.max(1, Math.round(numero(corpo.janelaSemanas, atual.janelaSemanas))),
      reservaMinima: numero(corpo.reservaMinima, atual.reservaMinima),
      diasSaldoDesatualizado: Math.max(
        1,
        Math.round(numero(corpo.diasSaldoDesatualizado, atual.diasSaldoDesatualizado))
      ),
      percentualComissao: numero(corpo.percentualComissao, atual.percentualComissao),
      percentualComissaoAVista: numero(
        corpo.percentualComissaoAVista,
        atual.percentualComissaoAVista
      ),
      diaComissao: Math.min(
        6,
        Math.max(0, Math.round(numero(corpo.diaComissao, atual.diaComissao)))
      ),
      diaInsumos: Math.min(
        6,
        Math.max(0, Math.round(numero(corpo.diaInsumos, atual.diaInsumos)))
      ),
    };

    await gravarConfig(novo);
    return NextResponse.json({ config: novo });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Falha ao gravar os ajustes.";
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}
