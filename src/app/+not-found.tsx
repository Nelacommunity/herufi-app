import { router, Stack } from 'expo-router';
import { Button, EmptyState } from '@/components/ui';
import { useI18n } from '@/i18n';

export default function NotFound() {
  const { t } = useI18n();
  return (
    <>
      <Stack.Screen options={{ title: '' }} />
      <EmptyState icon="compass" title={t.errors.notFoundTitle} description={t.errors.notFoundDesc} action={<Button title={t.common.backToHome} onPress={() => router.replace('/')} />} />
    </>
  );
}
