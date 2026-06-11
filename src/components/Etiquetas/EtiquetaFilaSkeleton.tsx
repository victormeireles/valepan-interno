export default function EtiquetaFilaSkeleton() {
  return (
    <div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      aria-busy="true"
      aria-label="Carregando fila de etiquetas"
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse bg-gray-200 rounded-xl h-40"
        />
      ))}
    </div>
  );
}
