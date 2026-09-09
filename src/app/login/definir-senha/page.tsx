import { DefinirSenhaForm } from './definir-senha-form';

export default function DefinirSenhaPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center">
      <div className="mb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-vinho">
          Valepan
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-text-strong">
          Definir nova senha
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Por segurança, você precisa criar uma nova senha antes de continuar.
        </p>
      </div>
      <div className="rounded-xl border border-border-default bg-surface p-6 shadow-sm">
        <DefinirSenhaForm />
      </div>
    </div>
  );
}
