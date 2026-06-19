export function getHubGreeting(now = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return 'Bom dia, equipe';
  if (hour < 18) return 'Boa tarde, equipe';
  return 'Boa noite, equipe';
}

export function formatHubDateSubtitle(now = new Date()): string {
  const formatted = now.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return `Controle da produção em um só lugar — ${formatted}.`;
}
