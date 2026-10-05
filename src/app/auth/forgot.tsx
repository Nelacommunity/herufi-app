import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Button, Input, Text } from '@/components/ui';
import { useI18n } from '@/i18n';
import { fmt } from '@/i18n/config';
import { authRedirect } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/theme';

export default function Forgot() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const au = t.auth;
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit() {
    setBusy(true);
    await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: authRedirect('/auth/reset') });
    setBusy(false);
    setSent(true); // same message either way, so the form can't be used to discover accounts
  }

  return (
    <View style={{ flex: 1, padding: 24, gap: 16, backgroundColor: colors.background }}>
      {sent ? (
        <View style={{ alignItems: 'center', gap: 12, paddingTop: 40 }}>
          <Feather name="mail" size={40} color={colors.accent} />
          <Text variant="title">{au.checkEmail}</Text>
          <Text tone="muted" style={{ textAlign: 'center' }}>{fmt(au.ifExists, { email })}</Text>
          <Button title={au.backToSignIn} onPress={() => router.back()} style={{ marginTop: 12 }} />
        </View>
      ) : (
        <>
          <Text variant="title">{au.forgotTitle}</Text>
          <Text tone="muted">{au.forgotDesc}</Text>
          <Input label={au.email} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
          <Button size="lg" title={au.sendLink} loading={busy} disabled={!email} onPress={submit} />
        </>
      )}
    </View>
  );
}
