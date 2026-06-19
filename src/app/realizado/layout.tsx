/** Telas Realizado: colado à nav, padding lateral vem do shell raiz. */
export default function RealizadoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="-mt-6 -mb-6 w-full">{children}</div>;
}
