import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Button, Input, Text } from '@/components/ui';
import { useI18n } from '@/i18n';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/providers/toast';
import { useTheme } from '@/theme';

export default function Reset() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const au = t.auth;
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (password.length < 8) return setError(au.errors.short);
    if (password !== confirm) return setError(au.errors.mismatch);
    setBusy(true);
    const { error: e } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (e) return setError(/session/i.test(e.message) ? au.errors.expired : e.message);
    toast({ tone: 'success', title: t.account.passwordUpdated });
    router.replace('/account');
  }

  return (
    <View style={{ flex: 1, padding: 24, gap: 16, backgroundColor: colors.background }}>
      <Text tone="muted">{au.resetDesc}</Text>
      <Input label={au.newPassword} value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
      <Input label={au.confirmPassword} value={confirm} onChangeText={setConfirm} secureTextEntry autoComplete="new-password" />
      {error && <Text tone="sale">{error}</Text>}
      <Button size="lg" title={au.updatePassword} loading={busy} onPress={submit} />
    </View>
  );
}
