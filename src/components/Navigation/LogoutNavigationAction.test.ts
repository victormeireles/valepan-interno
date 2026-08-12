import { describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { signOut } from 'next-auth/react';
import LogoutNavigationAction, {
  LOGOUT_REDIRECT_URL,
  type LogoutNavigationActionVariant,
} from './LogoutNavigationAction';

vi.mock('next-auth/react', () => ({
  signOut: vi.fn(),
}));

type LogoutButtonElement = ReactElement<{
  'aria-label': string;
  className: string;
  onClick: () => void;
}>;

function buildLogoutButton(variant: LogoutNavigationActionVariant): LogoutButtonElement {
  return LogoutNavigationAction({ variant }) as LogoutButtonElement;
}

describe('LogoutNavigationAction', () => {
  it('aciona logout redirecionando para login', () => {
    const button = buildLogoutButton('desktop');

    button.props.onClick();

    expect(signOut).toHaveBeenCalledWith({ redirectTo: LOGOUT_REDIRECT_URL });
  });

  it('expõe botão acessível no desktop e no mobile', () => {
    const desktopButton = buildLogoutButton('desktop');
    const mobileButton = buildLogoutButton('mobile');

    expect(desktopButton.props['aria-label']).toBe('Sair do sistema');
    expect(desktopButton.props.className).toContain('lg:inline-flex');
    expect(mobileButton.props['aria-label']).toBe('Sair do sistema');
    expect(mobileButton.props.className).toContain('w-full');
  });
});
