import { NextResponse } from "next/server";
import { lerDocumentos } from "@/lib/sheets";
import { sessaoAtual } from "@/lib/autorizar";
import { unidadePermitida } from "@/lib/sessao";

export const dynamic = "force-dynamic";

export async function GET() {
  const sessao = await sessaoAtual();
  if (!sessao) {
    return NextResponse.json({ erro: "Sessão expirada. Entre de novo." }, { status: 401 });
  }

  try {
    const todos = await lerDocumentos();
    const documentos = todos.filter((doc) => unidadePermitida(sessao, doc.unidade));
    return NextResponse.json({ documentos, total: todos.length });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Falha ao ler os documentos.";
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}
