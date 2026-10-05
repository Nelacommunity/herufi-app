import type { ReactNode } from 'react';
import { router } from 'expo-router';
import { Button, EmptyState } from '@/components/ui';
import { useI18n } from '@/i18n';
import { useStore } from '@/providers/store';

/** Shows a sign-in prompt instead of account-only screens for guests. */
export function RequireUser({ children }: { children: ReactNode }) {
  const { user, authReady } = useStore();
  const { a, t } = useI18n();
  if (!authReady) return null;
  if (!user) return <EmptyState icon="lock" title={a.signInTitle} description={a.signInPrompt} action={<Button title={t.common.signIn} onPress={() => router.push('/auth/sign-in')} />} />;
  return <>{children}</>;
}
