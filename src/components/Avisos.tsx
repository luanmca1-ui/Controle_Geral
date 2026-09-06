export default function Avisos({ itens }: { itens: string[] }) {
  if (itens.length === 0) return null;

  return (
    <ul className="space-y-2">
      {itens.map((texto, indice) => (
        <li
          key={indice}
          className="border-l-2 border-atencao bg-superficie px-3 py-2 text-sm text-grafite"
        >
          {texto}
        </li>
      ))}
    </ul>
  );
}
