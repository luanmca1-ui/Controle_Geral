import { NextResponse } from "next/server";
import { abasPermitidas, criarToken, NOME_COOKIE, sessaoConfigurada } from "@/lib/sessao";
import { buscarAcesso } from "@/lib/sheets";
import { sessaoAtual } from "@/lib/autorizar";

export const dynamic = "force-dynamic";

export async function GET() {
  const sessao = await sessaoAtual();
  if (!sessao) return NextResponse.json({ erro: "Sem sessão." }, { status: 401 });
  return NextResponse.json({
    sessao: {
      nome: sessao.nome,
      perfil: sessao.perfil,
      unidades: sessao.unidades,
      abas: abasPermitidas(sessao),
    },
  });
}

export async function POST(requisicao: Request) {
  if (!sessaoConfigurada()) {
    return NextResponse.json(
      { erro: "APP_SECRET não configurado no ambiente." },
      { status: 500 }
    );
  }

  const corpo = await requisicao.json().catch(() => null);
  const codigo = String(corpo?.codigo ?? "").trim();

  if (!codigo) {
    return NextResponse.json({ erro: "Informe o código." }, { status: 400 });
  }

  let acesso;
  try {
    acesso = await buscarAcesso(codigo);
  } catch {
    return NextResponse.json(
      { erro: "Não foi possível conferir o código agora. Tente de novo." },
      { status: 503 }
    );
  }

  if (!acesso) {
    return NextResponse.json({ erro: "Código inválido ou desativado." }, { status: 401 });
  }

  const token = await criarToken({
    codigo: acesso.codigo,
    nome: acesso.nome,
    perfil: acesso.perfil,
    unidades: acesso.unidades,
    abas: acesso.abas,
  });

  const resposta = NextResponse.json({
    sessao: {
      nome: acesso.nome,
      perfil: acesso.perfil,
      unidades: acesso.unidades,
      abas: abasPermitidas({ ...acesso, codigo: acesso.codigo, exp: 0 }),
    },
  });

  resposta.cookies.set(NOME_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return resposta;
}

export async function DELETE() {
  const resposta = NextResponse.json({ ok: true });
  resposta.cookies.set(NOME_COOKIE, "", { path: "/", maxAge: 0 });
  return resposta;
}
