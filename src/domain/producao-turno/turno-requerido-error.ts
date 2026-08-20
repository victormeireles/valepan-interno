export class TurnoRequeridoError extends Error {
  readonly code = 'turno_requerido' as const;

  constructor() {
    super('Turno da etapa não confirmado para este dia');
    this.name = 'TurnoRequeridoError';
  }
}
