import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Button, EmptyState, Input, Sheet, Text } from '@/components/ui';
import { RequireUser } from '@/components/shop/require-user';
import { useI18n } from '@/i18n';
import { cardBrand, luhn } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { useAsync } from '@/lib/use-async';
import type { PaymentMethod } from '@/lib/types';
import { useStore } from '@/providers/store';
import { useToast } from '@/providers/toast';
import { radius, useTheme } from '@/theme';

function Payments() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const p = t.account.payments;
  const c = t.checkout;
  const { user } = useStore();
  const toast = useToast();
  const data = useAsync(async () => ((await supabase.from('payment_methods').select('*').order('is_default', { ascending: false })).data ?? []) as PaymentMethod[], []);
  const [adding, setAdding] = useState(false);
  const [card, setCard] = useState({ number: '', exp: '', name: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function save() {
    const e: Record<string, string> = {};
    const [m, y] = card.exp.split('/').map((v) => Number(v.trim()));
    if (!luhn(card.number)) e.number = c.errors.cardNumber;
    if (!m || m > 12 || !y || new Date(2000 + y, m) <= new Date()) e.exp = c.errors.expiry;
    if (card.name.trim().length < 2) e.name = c.errors.cardName;
    setErrors(e);
    if (Object.keys(e).length || !user) return;
    setBusy(true);
    // Only brand, last 4 and expiry are stored; the full number never leaves the phone.
    const { error } = await supabase.from('payment_methods').insert({
      user_id: user.id, brand: cardBrand(card.number), last4: card.number.replace(/\D/g, '').slice(-4), exp_month: m, exp_year: 2000 + y,
      cardholder_name: card.name.trim(), is_default: !(data.data?.length),
    });
    setBusy(false);
    if (error) return toast({ tone: 'error', title: t.errors.generic });
    toast({ tone: 'success', title: p.saved });
    setAdding(false);
    setCard({ number: '', exp: '', name: '' });
    data.reload();
  }

  return (
    <>
      <FlatList
        data={data.data ?? []}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        ListHeaderComponent={<Text variant="small" tone="muted" style={{ marginBottom: 4 }}>{p.onlyStore}</Text>}
        ListEmptyComponent={data.loading ? null : <EmptyState icon="credit-card" title={p.empty} description={p.emptyDesc} />}
        ListFooterComponent={<Button icon="plus" variant="secondary" title={p.add} onPress={() => setAdding(true)} />}
        renderItem={({ item: m }) => (
          <View style={[styles.card, { backgroundColor: '#1c1c1b' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: '#fff', fontWeight: '700', letterSpacing: 1 }}>{m.brand.toUpperCase()}</Text>
              {m.is_default && <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>{t.common.default}</Text>}
            </View>
            <Text style={{ color: '#fff', fontSize: 18, letterSpacing: 3, marginTop: 28 }}>•••• •••• •••• {m.last4}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>{m.cardholder_name}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>{p.exp} {String(m.exp_month).padStart(2, '0')}/{String(m.exp_year).slice(-2)}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 18, marginTop: 14 }}>
              {!m.is_default && <Pressable onPress={async () => { await supabase.from('payment_methods').update({ is_default: false }).eq('user_id', user!.id); await supabase.from('payment_methods').update({ is_default: true }).eq('id', m.id); data.reload(); }}>
                <Text style={{ color: '#fff', fontWeight: '600' }}>{t.common.setAsDefault}</Text></Pressable>}
              <Pressable onPress={() => Alert.alert(`${m.brand} •••• ${m.last4}`, '', [{ text: t.common.cancel, style: 'cancel' }, { text: t.common.remove, style: 'destructive', onPress: async () => { await supabase.from('payment_methods').delete().eq('id', m.id); toast({ tone: 'success', title: p.removed }); data.reload(); } }])}>
                <Text style={{ color: '#ff8a7a', fontWeight: '600' }}>{t.common.remove}</Text>
              </Pressable>
            </View>
          </View>
        )}
      />
      <Sheet visible={adding} onClose={() => setAdding(false)} title={p.addTitle} footer={<Button title={p.saveCard} loading={busy} onPress={save} full />}>
        <View style={{ padding: 20, gap: 12 }}>
          <View style={{ backgroundColor: colors.accentSoft, padding: 12, borderRadius: radius.md }}><Text variant="small" tone="accent">{p.demo}</Text></View>
          <Input label={c.cardNumber} value={card.number} keyboardType="number-pad" placeholder="4242 4242 4242 4242" error={errors.number}
            onChangeText={(v) => setCard({ ...card, number: v.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim() })} />
          <Input label={c.expiry} value={card.exp} keyboardType="number-pad" placeholder="MM / YY" error={errors.exp}
            onChangeText={(v) => { const d = v.replace(/\D/g, '').slice(0, 4); setCard({ ...card, exp: d.length > 2 ? `${d.slice(0, 2)} / ${d.slice(2)}` : d }); }} />
          <Input label={c.nameOnCard} value={card.name} onChangeText={(v) => setCard({ ...card, name: v })} error={errors.name} />
        </View>
      </Sheet>
    </>
  );
}

export default function PaymentsScreen() {
  return <RequireUser><Payments /></RequireUser>;
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl, padding: 20 },
});
