import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Chip, Input, Text } from '@/components/ui';
import { useI18n } from '@/i18n';
import { LOCALES, LOCALE_NAMES } from '@/i18n/config';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/providers/store';
import { useToast } from '@/providers/toast';
import { radius, useTheme, type ThemeMode } from '@/theme';

export default function Settings() {
  const { colors, mode, setMode } = useTheme();
  const { t, a, locale, setLocale } = useI18n();
  const s = t.account.settings;
  const { user, signOut } = useStore();
  const toast = useToast();
  const [optIn, setOptIn] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('marketing_opt_in').eq('user_id', user.id).maybeSingle().then(({ data }) => setOptIn(Boolean(data?.marketing_opt_in)));
  }, [user]);

  const section = [styles.section, { borderColor: colors.border }];
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
      <View style={section}>
        <Text variant="h3">{s.language}</Text>
        <Text variant="small" tone="muted">{s.languageDesc}</Text>
        <View style={styles.row}>{LOCALES.map((l) => <Chip key={l} label={LOCALE_NAMES[l]} selected={locale === l} onPress={() => setLocale(l)} />)}</View>
      </View>
      <View style={section}>
        <Text variant="h3">{a.appearance}</Text>
        <View style={styles.row}>{(['system', 'light', 'dark'] as ThemeMode[]).map((m) => <Chip key={m} label={a.themeOptions[m]} selected={mode === m} onPress={() => setMode(m)} />)}</View>
      </View>
      {user && (
        <>
          <View style={section}>
            <Text variant="h3">{s.communication}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text tone="muted" style={{ flex: 1 }}>{s.optIn}</Text>
              <Switch value={optIn} onValueChange={async (v) => {
                setOptIn(v);
                const { error } = await supabase.from('profiles').update({ marketing_opt_in: v }).eq('user_id', user.id);
                toast(error ? { tone: 'error', title: t.errors.generic } : { tone: 'success', title: s.preferencesSaved });
              }} />
            </View>
          </View>
          <View style={section}>
            <Text variant="h3">{s.password}</Text>
            <Input value={password} onChangeText={setPassword} secureTextEntry placeholder={s.newPassword} hint={t.auth.passwordHint} autoComplete="new-password" />
            <Button variant="secondary" title={s.updatePassword} loading={busy} disabled={password.length < 8} onPress={async () => {
              setBusy(true);
              const { error } = await supabase.auth.updateUser({ password });
              setBusy(false);
              if (error) return toast({ tone: 'error', title: s.passwordError, description: error.message });
              setPassword('');
              toast({ tone: 'success', title: s.passwordUpdated });
            }} />
          </View>
          <View style={section}>
            <Text variant="h3">{s.session}</Text>
            <Text variant="small" tone="muted">{s.sessionDesc} {s.contactSupport}.</Text>
            <Button variant="secondary" icon="log-out" title={t.common.signOut} onPress={async () => { await signOut(); router.navigate('/'); }} />
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  section: { borderWidth: 1, borderRadius: radius.lg, padding: 16, gap: 10 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
