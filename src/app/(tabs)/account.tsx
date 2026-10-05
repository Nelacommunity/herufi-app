import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Button, Logo, Text } from '@/components/ui';
import { useI18n } from '@/i18n';
import { fmt } from '@/i18n/config';
import { initials } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { useAsync } from '@/lib/use-async';
import { useStore } from '@/providers/store';
import { radius, useTheme } from '@/theme';

type Item = { icon: keyof typeof Feather.glyphMap; label: string; href: Href; auth?: boolean };

export default function Account() {
  const { colors } = useTheme();
  const { t, a, locale, setLocale } = useI18n();
  const insets = useSafeAreaInsets();
  const { user, wishlist, signOut } = useStore();
  const profile = useAsync(async () => {
    if (!user) return null;
    const [p, o] = await Promise.all([
      supabase.from('profiles').select('full_name, avatar_url, created_at').eq('user_id', user.id).maybeSingle(),
      supabase.from('orders').select('id', { count: 'exact', head: true }),
    ]);
    return { ...p.data, orders: o.count ?? 0 };
  }, [user?.id]);

  const items: Item[] = [
    { icon: 'package', label: a.menu.orders, href: '/account/orders', auth: true },
    { icon: 'map-pin', label: a.menu.addresses, href: '/account/addresses', auth: true },
    { icon: 'credit-card', label: a.menu.payments, href: '/account/payments', auth: true },
    { icon: 'clock', label: a.menu.viewed, href: '/account/viewed' },
    { icon: 'user', label: a.menu.profile, href: '/account/profile', auth: true },
    { icon: 'settings', label: a.menu.settings, href: '/account/settings' },
    { icon: 'help-circle', label: a.menu.help, href: '/help' },
  ];

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ paddingTop: insets.top + 12, padding: 16, gap: 20, paddingBottom: 40 }}>
      {user ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={[styles.avatar, { backgroundColor: colors.foreground }]}>
            {profile.data?.avatar_url ? <Image source={profile.data.avatar_url} style={StyleSheet.absoluteFill} contentFit="cover" />
              : <Text style={{ color: colors.background, fontWeight: '700', fontSize: 20 }}>{initials(profile.data?.full_name ?? user.name, user.email)}</Text>}
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="title" numberOfLines={1}>{fmt(t.account.hello, { name: (profile.data?.full_name ?? user.name ?? '').split(' ')[0] || '👋' })}</Text>
            <Text tone="muted" numberOfLines={1}>{user.email}</Text>
          </View>
        </View>
      ) : (
        <View style={[styles.guest, { backgroundColor: colors.surface2 }]}>
          <Logo size={24} />
          <Text variant="h2" style={{ marginTop: 12 }}>{a.signInTitle}</Text>
          <Text tone="muted">{a.signInPrompt}</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            <Button title={t.common.signIn} style={{ flex: 1 }} onPress={() => router.push('/auth/sign-in')} />
            <Button variant="secondary" title={a.createAccount} style={{ flex: 1 }} onPress={() => router.push('/auth/sign-up')} />
          </View>
        </View>
      )}

      {user && (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[[t.account.stats.orders, profile.data?.orders ?? '–', '/account/orders'], [t.account.stats.saved, wishlist.length, '/saved']].map(([label, value, href]) => (
            <Pressable key={label as string} onPress={() => router.push(href as Href)} style={[styles.stat, { backgroundColor: colors.surface2 }]}>
              <Text variant="title">{String(value)}</Text>
              <Text variant="small" tone="muted">{label as string}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <View style={[styles.menu, { borderColor: colors.border }]}>
        {items.filter((i) => !i.auth || user).map((i, n) => (
          <Pressable key={i.label} onPress={() => router.push(i.href)} style={({ pressed }) => [styles.row, n > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }, pressed && { backgroundColor: colors.surface2 }]}>
            <Feather name={i.icon} size={19} color={colors.foreground} />
            <Text style={{ flex: 1 }}>{i.label}</Text>
            <Feather name="chevron-right" size={18} color={colors.subtle} />
          </Pressable>
        ))}
      </View>

      <View style={[styles.menu, { borderColor: colors.border }]}>
        <Pressable onPress={() => setLocale(locale === 'en' ? 'sw' : 'en')} style={styles.row}>
          <Feather name="globe" size={19} color={colors.foreground} />
          <Text style={{ flex: 1 }}>{t.common.language}</Text>
          <Text tone="muted">{locale === 'en' ? 'English' : 'Kiswahili'}</Text>
        </Pressable>
      </View>

      {user && <Button variant="secondary" icon="log-out" title={t.common.signOut} onPress={signOut} />}
      <Text variant="small" tone="subtle" style={{ textAlign: 'center' }}>{fmt(a.version, { v: Constants.expoConfig?.version ?? '1.0.0' })}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  guest: { padding: 20, borderRadius: radius.xl, gap: 4 },
  stat: { flex: 1, padding: 16, borderRadius: radius.lg, gap: 2 },
  menu: { borderWidth: 1, borderRadius: radius.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 15 },
});
