import { auth } from '@/lib/auth';
import { InternoAccessManager } from '@/lib/auth/interno-access-manager';
import { sessionToAuthzSnapshot } from '@/lib/auth/session-authz-snapshot';
import { filterMainNavEntries } from '@/config/filter-main-nav-entries';
import { MAIN_NAV_ENTRIES } from '@/config/main-nav-config';
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

  const entries = filterMainNavEntries(
    MAIN_NAV_ENTRIES,
    snap,
    new InternoAccessManager(),
  );

  return <ConditionalNavigationClient entries={entries} />;
}
