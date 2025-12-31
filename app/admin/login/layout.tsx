// Layout específico para login que no verifica sesión
// Esto evita que el layout de admin se ejecute para esta página
export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

