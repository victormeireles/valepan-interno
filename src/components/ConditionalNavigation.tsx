import { auth } from '@/lib/auth';
import { sessionToAuthzSnapshot } from '@/lib/auth/session-authz-snapshot';
import ConditionalNavigationClient from '@/components/ConditionalNavigationClient';

export default async function ConditionalNavigation() {
  const session = await auth();
  const snap = session?.user?.id
    ? sessionToAuthzSnapshot(session)
    : {
        isSystemOwner: false,
        identidades: [] as string[],
        modulosEfetivos: {},
      };

  return (
    <ConditionalNavigationClient
      isSystemOwner={snap.isSystemOwner}
      modulosEfetivos={snap.modulosEfetivos}
    />
  );
}
