import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Button, Input, Logo, Text } from '@/components/ui';
import { useI18n } from '@/i18n';
import { fmt } from '@/i18n/config';
import { authRedirect, friendlyAuthError } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/theme';

export default function SignUp() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const au = t.auth;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit() {
    setError(null);
    if (password.length < 8) return setError(au.errors.short);
    setBusy(true);
    const { data, error: e } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { full_name: name.trim() }, emailRedirectTo: authRedirect() } });
    setBusy(false);
    if (e) return setError(friendlyAuthError(e.message, au.errors));
    if (data.session) router.replace('/account');
    else setSent(true);
  }

  if (sent) {
    return (
      <View style={{ flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: colors.background }}>
        <Feather name="mail" size={40} color={colors.accent} />
        <Text variant="title">{au.checkInbox}</Text>
        <Text tone="muted" style={{ textAlign: 'center' }}>{fmt(au.sentConfirm, { email })}</Text>
        <Button title={au.signIn} onPress={() => router.replace('/auth/sign-in')} style={{ marginTop: 12 }} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }} keyboardShouldPersistTaps="handled">
        <Logo size={26} />
        <View style={{ gap: 6 }}><Text variant="title">{au.createTitle}</Text><Text tone="muted">{au.createDesc}</Text></View>
        <Input label={au.fullName} value={name} onChangeText={setName} autoComplete="name" textContentType="name" />
        <Input label={au.email} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
        <Input label={au.password} value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" textContentType="newPassword" hint={au.passwordHint} />
        {error && <Text tone="sale">{error}</Text>}
        <Button size="lg" title={au.createAccount} loading={busy} disabled={!name || !email || !password} onPress={submit} />
        <Text variant="small" tone="subtle" style={{ textAlign: 'center' }}>{au.agree.replace('{terms}', au.terms).replace('{privacy}', au.privacy)}</Text>
        <Pressable onPress={() => router.replace('/auth/sign-in')} style={{ alignItems: 'center' }}>
          <Text tone="muted">{au.haveAccount} <Text style={{ fontWeight: '700', textDecorationLine: 'underline' }}>{au.signIn}</Text></Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
