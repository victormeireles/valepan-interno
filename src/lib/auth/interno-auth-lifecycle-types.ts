export type InternoAuthLifecycleStatus =
  | {
      kind: 'ok';
      ativo: boolean;
      email: string | null;
      passwordMustChange: boolean;
    }
  | { kind: 'unavailable' };

export type InternoAuthLifecycleDecision =
  | 'allow'
  | { redirect: string; clearSession?: boolean }
  | {
      json: { error: 'EmailRequired'; redirectTo: string };
      status: 409;
    };

export type InternoAuthLifecycleInput = {
  pathname: string;
  search?: string;
  method?: string;
  status: InternoAuthLifecycleStatus;
};
