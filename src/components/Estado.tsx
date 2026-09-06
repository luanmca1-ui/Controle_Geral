export function Carregando({ texto = "Lendo a planilha" }: { texto?: string }) {
  return (
    <p className="border border-linha bg-superficie px-4 py-6 text-center text-sm text-grafite">
      {texto}…
    </p>
  );
}

export function Erro({ mensagem }: { mensagem: string }) {
  return (
    <div className="border-l-2 border-risco bg-superficie px-4 py-3">
      <p className="text-sm font-medium text-risco">Não foi possível carregar</p>
      <p className="mt-1 text-sm text-grafite">{mensagem}</p>
    </div>
  );
}

export function Vazio({ texto }: { texto: string }) {
  return (
    <p className="border border-dashed border-linha px-4 py-6 text-center text-sm text-grafite">
      {texto}
    </p>
  );
}
