/**
 * Marca uma tela que ainda nao le dados de verdade. Fica no topo, antes de
 * qualquer numero, para ninguem confundir esboco com informacao.
 */
export default function EsbocoAviso({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5 border-l-4 border-atencao bg-superficie px-3 py-3">
      <p className="text-sm font-semibold uppercase tracking-wide text-atencao">
        Em desenvolvimento
      </p>
      <p className="mt-1 text-sm text-grafite">{children}</p>
      <p className="mt-2 text-sm text-grafite">
        Os números e nomes abaixo são <strong className="text-tinta">fictícios</strong>,
        só para mostrar o formato. Nada aqui vem da planilha ainda.
      </p>
    </div>
  );
}
