import { useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Badge, Button, EmptyState, Input, Sheet, Text } from '@/components/ui';
import { RequireUser } from '@/components/shop/require-user';
import { useI18n } from '@/i18n';
import { isTzMobile, TZ_REGIONS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { useAsync } from '@/lib/use-async';
import type { Address } from '@/lib/types';
import { useStore } from '@/providers/store';
import { useToast } from '@/providers/toast';
import { radius, useTheme } from '@/theme';

type Form = { id?: string; label: string; full_name: string; phone: string; line1: string; line2: string; city: string; region: string; is_default: boolean };

function Addresses() {
  const { colors } = useTheme();
  const { t, locale } = useI18n();
  const ad = t.account.addresses;
  const c = t.checkout;
  const { user } = useStore();
  const toast = useToast();
  const data = useAsync(async () => (await supabase.from('addresses').select('*').order('is_default', { ascending: false }).order('created_at')).data as Address[] ?? [], []);
  const [form, setForm] = useState<Form | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [regionPick, setRegionPick] = useState(false);

  const blank = (): Form => ({ label: locale === 'sw' ? 'Nyumbani' : 'Home', full_name: '', phone: '', line1: '', line2: '', city: '', region: 'Dar es Salaam', is_default: !(data.data?.length) });

  async function save() {
    if (!form || !user) return;
    const e: Record<string, string> = {};
    if (form.full_name.trim().length < 2) e.full_name = c.errors.name;
    if (!isTzMobile(form.phone)) e.phone = c.errors.phone;
    if (form.line1.trim().length < 3) e.line1 = c.errors.street;
    if (form.city.trim().length < 2) e.city = c.errors.city;
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    if (form.is_default) await supabase.from('addresses').update({ is_default: false }).eq('user_id', user.id);
    const row = { label: form.label || 'Home', full_name: form.full_name.trim(), phone: form.phone.trim(), line1: form.line1.trim(), line2: form.line2.trim() || null, city: form.city.trim(), region: form.region, country: 'TZ', is_default: form.is_default };
    const { error } = form.id ? await supabase.from('addresses').update(row).eq('id', form.id) : await supabase.from('addresses').insert({ ...row, user_id: user.id });
    setBusy(false);
    if (error) return toast({ tone: 'error', title: t.errors.generic });
    toast({ tone: 'success', title: form.id ? ad.updated : ad.added });
    setForm(null);
    data.reload();
  }

  function remove(a: Address) {
    Alert.alert(a.label, `${a.line1}, ${a.city}`, [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.common.remove, style: 'destructive', onPress: async () => { await supabase.from('addresses').delete().eq('id', a.id); toast({ tone: 'success', title: ad.removed }); data.reload(); } },
    ]);
  }

  return (
    <>
      <FlatList
        data={data.data ?? []}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        ListEmptyComponent={data.loading ? null : <EmptyState icon="map-pin" title={ad.empty} description={ad.emptyDesc} />}
        ListFooterComponent={<Button icon="plus" title={ad.add} variant="secondary" onPress={() => { setErrors({}); setForm(blank()); }} style={{ marginTop: 4 }} />}
        renderItem={({ item: a }) => (
          <View style={[styles.card, { borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="label">{a.label}</Text>
              {a.is_default && <Badge label={t.common.default} />}
            </View>
            <Text tone="muted" style={{ marginTop: 6 }}>{a.full_name}{'\n'}{a.line1}{a.line2 ? `, ${a.line2}` : ''}{'\n'}{a.city}{a.region ? `, ${a.region}` : ''}{a.phone ? `\n${a.phone}` : ''}</Text>
            <View style={{ flexDirection: 'row', gap: 18, marginTop: 12 }}>
              <Pressable onPress={() => { setErrors({}); setForm({ id: a.id, label: a.label, full_name: a.full_name, phone: a.phone ?? '', line1: a.line1, line2: a.line2 ?? '', city: a.city, region: a.region ?? 'Dar es Salaam', is_default: a.is_default }); }}>
                <Text variant="label">{t.common.edit}</Text>
              </Pressable>
              {!a.is_default && (
                <Pressable onPress={async () => { await supabase.from('addresses').update({ is_default: false }).eq('user_id', user!.id); await supabase.from('addresses').update({ is_default: true }).eq('id', a.id); data.reload(); }}>
                  <Text variant="label">{t.common.setAsDefault}</Text>
                </Pressable>
              )}
              <Pressable onPress={() => remove(a)}><Text variant="label" tone="sale">{t.common.remove}</Text></Pressable>
            </View>
          </View>
        )}
      />
      <Sheet visible={Boolean(form)} onClose={() => setForm(null)} title={form?.id ? ad.edit : ad.add} footer={<Button title={ad.saveAddress} loading={busy} onPress={save} full />}>
        {form && (
          <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }} keyboardShouldPersistTaps="handled">
            <Input label={ad.label} hint={ad.labelHint} value={form.label} onChangeText={(v) => setForm({ ...form, label: v })} />
            <Input label={c.fullName} value={form.full_name} onChangeText={(v) => setForm({ ...form, full_name: v })} error={errors.full_name} />
            <Input label={c.phone} value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} keyboardType="phone-pad" placeholder="07XX XXX XXX" error={errors.phone} />
            <Input label={c.street} value={form.line1} onChangeText={(v) => setForm({ ...form, line1: v })} error={errors.line1} />
            <Input label={`${c.line2} (${t.common.optional})`} value={form.line2} onChangeText={(v) => setForm({ ...form, line2: v })} />
            <Input label={c.city} value={form.city} onChangeText={(v) => setForm({ ...form, city: v })} error={errors.city} />
            <Pressable onPress={() => setRegionPick(!regionPick)} style={[styles.select, { borderColor: colors.borderStrong }]}>
              <Text>{c.region}: {form.region}</Text><Feather name={regionPick ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
            </Pressable>
            {regionPick && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{TZ_REGIONS.map((r) => (
              <Pressable key={r} onPress={() => { setForm({ ...form, region: r }); setRegionPick(false); }} style={[styles.pill, { borderColor: form.region === r ? colors.foreground : colors.border }]}><Text variant="small">{r}</Text></Pressable>
            ))}</View>}
            <Pressable onPress={() => setForm({ ...form, is_default: !form.is_default })} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}>
              <Feather name={form.is_default ? 'check-square' : 'square'} size={20} color={colors.foreground} />
              <Text>{ad.useDefault}</Text>
            </Pressable>
          </ScrollView>
        )}
      </Sheet>
    </>
  );
}

export default function AddressesScreen() {
  return <RequireUser><Addresses /></RequireUser>;
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.lg, padding: 16 },
  select: { height: 50, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99, borderWidth: 1 },
});
