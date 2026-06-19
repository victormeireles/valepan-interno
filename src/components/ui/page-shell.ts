/** Padding horizontal padrão do shell (espelha layout.tsx). */
export const pageShellPaddingX = 'px-4 sm:px-6 lg:px-8';

/** Full-bleed horizontal dentro do shell com padding (toolbar, faixas). */
export const pageShellBreakoutX = '-mx-4 sm:-mx-6 lg:-mx-8';

/** Sticky abaixo da nav (h-[3.75rem]). */
export const belowAppNavStickyTop = 'top-[3.75rem]';

/** Sticky do dashboard abaixo da toolbar (nav 3.75rem + toolbar ~3.625rem). */
export const belowEtapaToolbarStickyTop = 'top-[7.375rem]';

/** Grid worklist + dashboard (mockup EtapaScreen: 960px). */
export const etapaTwoColumnGridClass =
  'grid grid-cols-1 items-start gap-5 transition-opacity duration-200 motion-reduce:transition-none min-[960px]:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]';
