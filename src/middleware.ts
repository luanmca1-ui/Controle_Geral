import { NextResponse, type NextRequest } from "next/server";
import {
  abaDoCaminho,
  NOME_COOKIE,
  lerSessao,
  podeVerAba,
  sessaoConfigurada,
} from "@/lib/sessao";

const LIVRES = ["/login", "/api/login", "/manifest.json", "/sw.js", "/previa"];

export async function middleware(requisicao: NextRequest) {
  const { pathname } = requisicao.nextUrl;

  if (LIVRES.some((rota) => pathname === rota || pathname.startsWith(`${rota}/`))) {
    return NextResponse.next();
  }

  if (!sessaoConfigurada()) {
    return NextResponse.json(
      { erro: "APP_SECRET não configurado no ambiente." },
      { status: 500 }
    );
  }

  const sessao = await lerSessao(requisicao.cookies.get(NOME_COOKIE)?.value);

  if (sessao) {
    // as rotas de API refazem a checagem com os dados da planilha
    const aba = abaDoCaminho(pathname);
    if (aba && !podeVerAba(sessao, aba)) {
      const destino = requisicao.nextUrl.clone();
      destino.pathname = "/";
      destino.search = "";
      return NextResponse.redirect(destino);
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ erro: "Sessão expirada. Entre de novo." }, { status: 401 });
  }

  const destino = requisicao.nextUrl.clone();
  destino.pathname = "/login";
  destino.search = "";
  return NextResponse.redirect(destino);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icone-192.png|icone-512.png).*)"],
};
