import type { Metadata, Viewport } from "next";
import "./globals.css";
import BarraSessao from "@/components/BarraSessao";
import Marca from "@/components/Marca";
import NavegacaoInferior from "@/components/NavegacaoInferior";
import RegistrarServiceWorker from "@/components/RegistrarServiceWorker";

export const metadata: Metadata = {
  title: "Caixa | The Barber Express",
  description: "Projecao de caixa por unidade, alimentada pela planilha BUnificada.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Caixa",
  },
};

export const viewport: Viewport = {
  themeColor: "#f7f6f3",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-dvh pb-20">
        <div className="mx-auto w-full max-w-painel px-4">
          <Marca />
          <BarraSessao />
          {children}
        </div>
        <NavegacaoInferior />
        <RegistrarServiceWorker />
      </body>
    </html>
  );
}
