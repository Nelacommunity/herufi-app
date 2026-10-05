import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Input, Logo, Text } from '@/components/ui';
import { useI18n } from '@/i18n';
import { fmt } from '@/i18n/config';
import { authRedirect, friendlyAuthError } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { radius, useTheme } from '@/theme';

export default function SignIn() {
  const { colors } = useTheme();
  const { t, a } = useI18n();
  const au = t.auth;
  const [method, setMethod] = useState<'password' | 'link'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const done = () => (router.canGoBack() ? router.back() : router.replace('/account'));

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      if (method === 'password') {
        const { error: e } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (e) throw e;
        done();
      } else {
        const { error: e } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: authRedirect(), shouldCreateUser: true } });
        if (e) throw e;
        setSent(true);
      }
    } catch (e) {
      setError(friendlyAuthError((e as Error).message, au.errors));
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
    setBusy(false);
    if (e) return setError(friendlyAuthError(e.message, au.errors));
    done();
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 18 }} keyboardShouldPersistTaps="handled">
        <Logo size={26} />
        <View style={{ gap: 6 }}>
          <Text variant="title">{au.welcomeBack}</Text>
          <Text tone="muted">{au.signInDesc}</Text>
        </View>

        {sent ? (
          <View style={{ gap: 14 }}>
            <Text tone="muted">{fmt(a.codeSent, { email })}</Text>
            <Input label={a.code} value={code} onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" />
            {error && <Text tone="sale">{error}</Text>}
            <Button title={a.verify} loading={busy} disabled={code.length < 6} onPress={verify} />
            <Button variant="ghost" title={au.useDifferent} onPress={() => { setSent(false); setCode(''); }} />
          </View>
        ) : (
          <>
            <View style={[styles.segment, { backgroundColor: colors.surface2 }]}>
              {(['password', 'link'] as const).map((m) => (
                <Pressable key={m} onPress={() => { setMethod(m); setError(null); }} style={[styles.seg, method === m && { backgroundColor: colors.surface }]}>
                  <Text variant="label">{m === 'password' ? au.password : au.emailLink}</Text>
                </Pressable>
              ))}
            </View>
            <Input label={au.email} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" />
            {method === 'password' && (
              <Input label={au.password} value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" textContentType="password" />
            )}
            {method === 'password' && (
              <Pressable onPress={() => router.push('/auth/forgot')} style={{ alignSelf: 'flex-end' }}><Text variant="small" tone="muted">{au.forgot}</Text></Pressable>
            )}
            {error && <View style={[styles.error, { backgroundColor: colors.saleSoft }]}><Text tone="sale">{error}</Text></View>}
            <Button size="lg" title={method === 'password' ? au.signIn : au.emailMeLink} loading={busy} disabled={!email || (method === 'password' && !password)} onPress={submit} />
            {method === 'link' && <Pressable onPress={() => setSent(true)} disabled={!email}><Text variant="small" tone="muted" style={{ textAlign: 'center' }}>{a.enterCode}</Text></Pressable>}
            <Pressable onPress={() => router.replace('/auth/sign-up')} style={{ alignItems: 'center', paddingTop: 8 }}>
              <Text tone="muted">{au.newHere} <Text style={{ fontWeight: '700', textDecorationLine: 'underline' }}>{au.createLink}</Text></Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  segment: { flexDirection: 'row', padding: 4, borderRadius: radius.full },
  seg: { flex: 1, height: 40, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  error: { padding: 12, borderRadius: radius.md },
});
