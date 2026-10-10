import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Button, Chip, EmptyState, Input, Sheet, Text } from '@/components/ui';
import { OrderSummary } from '@/components/shop/order-summary';
import { ShippingOptions } from '@/components/shop/shipping-options';
import { useQuote } from '@/components/shop/use-quote';
import { useI18n } from '@/i18n';
import { fmt } from '@/i18n/config';
import { cardBrand, COUPON_KEY, isTzMobile, luhn, MOBILE_MONEY, TZ_REGIONS } from '@/lib/constants';
import { formatPrice } from '@/lib/format';
import { quoteFor, resolveMethod } from '@/lib/shipping';
import { readJSON, writeJSON } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { useAsync } from '@/lib/use-async';
import type { Address, PaymentMethod } from '@/lib/types';
import { useStore } from '@/providers/store';
import { radius, useTheme } from '@/theme';

type Step = 1 | 2 | 3 | 4 | 5;
type AddressForm = { full_name: string; phone: string; line1: string; line2: string; city: string; region: string; postal_code: string };
const EMPTY: AddressForm = { full_name: '', phone: '', line1: '', line2: '', city: '', region: 'Dar es Salaam', postal_code: '' };

export default function Checkout() {
  const { colors } = useTheme();
  const { t, a } = useI18n();
  const c = t.checkout;
  const insets = useSafeAreaInsets();
  const store = useStore();
  const { activeLines, subtotal, user, delivery, setDelivery, applyQuote, clearCart } = store;

  const saved = useAsync(async () => {
    if (!user) return { addresses: [] as Address[], cards: [] as PaymentMethod[] };
    const [ad, pm] = await Promise.all([
      supabase.from('addresses').select('*').order('is_default', { ascending: false }),
      supabase.from('payment_methods').select('*').order('is_default', { ascending: false }),
    ]);
    return { addresses: (ad.data ?? []) as Address[], cards: (pm.data ?? []) as PaymentMethod[] };
  }, [user?.id]);

  const [step, setStep] = useState<Step>(user?.email ? 2 : 1);
  const [email, setEmail] = useState(user?.email ?? '');
  const [addressChoice, setAddressId] = useState<string | 'new' | null>(null);
  const [address, setAddress] = useState<AddressForm>(EMPTY);
  const [regionOpen, setRegionOpen] = useState(false);
  const [payKind, setPayKind] = useState<'mobile' | 'card'>('mobile');
  const [provider, setProvider] = useState<(typeof MOBILE_MONEY)[number]>('M-Pesa');
  const [mobile, setMobile] = useState('');
  const [cardChoice, setCardId] = useState<string | 'new' | null>(null);
  const [card, setCard] = useState({ number: '', exp: '', cvc: '', name: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [coupon, setCoupon] = useState(() => readJSON<string>(COUPON_KEY, ''));
  const [placing, setPlacing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Default to the shopper's default saved address/card until they pick something else.
  const addressId = addressChoice ?? (saved.data?.addresses.find((x) => x.is_default) ?? saved.data?.addresses[0])?.id ?? 'new';
  const cardId = cardChoice ?? (saved.data?.cards.find((x) => x.is_default) ?? saved.data?.cards[0])?.id ?? 'new';

  const { quote: base, loading } = useQuote(activeLines, coupon);
  useEffect(() => { if (base) applyQuote(base.lines); }, [base, applyQuote]);
  const options = base?.shipping_options ?? [];
  const method = resolveMethod(options, delivery);
  const quote = base ? quoteFor(base, method) : null;

  if (!activeLines.length) {
    return <EmptyState icon="shopping-bag" title={t.cart.empty} description={c.emptyDesc} action={<Button title={t.common.continueShopping} onPress={() => router.replace('/shop')} />} />;
  }

  const savedAddress = saved.data?.addresses.find((x) => x.id === addressId);
  const shipTo = addressId !== 'new' && savedAddress
    ? { full_name: savedAddress.full_name, line1: savedAddress.line1, line2: savedAddress.line2 ?? '', city: savedAddress.city, region: savedAddress.region ?? '', postal_code: savedAddress.postal_code ?? '', country: 'TZ', phone: savedAddress.phone ?? '' }
    : { ...address, country: 'TZ' };
  const savedCard = saved.data?.cards.find((x) => x.id === cardId);
  const payment = payKind === 'mobile'
    ? { brand: provider, last4: mobile.replace(/\D/g, '').slice(-4) }
    : cardId !== 'new' && savedCard ? { brand: savedCard.brand, last4: savedCard.last4 } : { brand: cardBrand(card.number), last4: card.number.replace(/\D/g, '').slice(-4) };

  const next = (s: Step) => { setErrors({}); setStep(s); };

  function validate(s: Step): boolean {
    const e: Record<string, string> = {};
    if (s === 1 && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) e.email = c.errors.email;
    if (s === 2 && addressId === 'new') {
      if (address.full_name.trim().length < 2) e.full_name = c.errors.name;
      if (!isTzMobile(address.phone)) e.phone = c.errors.phone;
      if (address.line1.trim().length < 3) e.line1 = c.errors.street;
      if (address.city.trim().length < 2) e.city = c.errors.city;
    }
    if (s === 4) {
      if (payKind === 'mobile' && !isTzMobile(mobile)) e.mobile = c.errors.mobile;
      if (payKind === 'card' && cardId === 'new') {
        const [m, y] = card.exp.split('/').map((v) => Number(v.trim()));
        if (!luhn(card.number)) e.number = c.errors.cardNumber;
        if (!m || m > 12 || !y || new Date(2000 + (y % 100), m) <= new Date()) e.exp = c.errors.expiry;
        if (!/^\d{3,4}$/.test(card.cvc)) e.cvc = c.errors.cvc;
        if (card.name.trim().length < 2) e.name = c.errors.cardName;
      }
    }
    setErrors(e);
    return !Object.keys(e).length;
  }

  async function placeOrder() {
    setPlacing(true);
    setSubmitError(null);
    const { data, error } = await supabase.rpc('place_order', {
      items: activeLines.map((l) => ({ product_id: l.productId, variant_id: l.variantId, quantity: l.quantity })),
      email: email.trim(),
      shipping_address: shipTo,
      delivery_method: method,
      payment,
      coupon_code: quote?.coupon_code ?? null,
    });
    setPlacing(false);
    if (error) {
      const m = error.message;
      const stock = m.match(/OUT_OF_STOCK:(\d+):(.+)$/);
      setSubmitError(stock ? fmt(c.errors.outOfStock, { n: stock[1], name: stock[2] })
        : m.includes('DELIVERY_UNAVAILABLE') ? c.errors.deliveryUnavailable
        : m.includes('INVALID_ADDRESS') ? c.errors.address
        : m.includes('EMPTY_BAG') ? c.errors.emptyBag
        : m.includes('SUSPENDED') ? c.errors.suspended
        : m.startsWith('COUPON:') ? t.summary.coupon.invalid : c.errors.generic);
      return;
    }
    // Save the new address for signed-in shoppers (best effort).
    if (user && addressId === 'new') {
      const { count } = await supabase.from('addresses').select('id', { count: 'exact', head: true });
      await supabase.from('addresses').insert({ ...shipTo, line2: shipTo.line2 || null, postal_code: shipTo.postal_code || null, user_id: user.id, label: 'Home', is_default: !count });
    }
    writeJSON(COUPON_KEY, null);
    clearCart();
    const order = data as { order_number: string; total: number };
    router.replace({ pathname: '/checkout/success', params: { order: order.order_number, total: String(order.total) } });
  }

  const steps: { n: Step; title: string; summary?: string }[] = [
    { n: 1, title: c.steps.contact, summary: email },
    { n: 2, title: c.steps.address, summary: shipTo.full_name ? `${shipTo.full_name}, ${shipTo.line1}, ${shipTo.city}` : undefined },
    { n: 3, title: c.steps.delivery, summary: t.shipping.methods[method]?.label },
    { n: 4, title: c.steps.payment, summary: payment.last4 ? fmt(c.endingIn, payment) : undefined },
    { n: 5, title: c.steps.review },
  ];

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: insets.bottom + 32 }} keyboardShouldPersistTaps="handled">
        {steps.map((s) => {
          const open = step === s.n;
          const done = step > s.n;
          return (
            <View key={s.n} style={[styles.step, { borderColor: open ? colors.foreground : colors.border, backgroundColor: open ? colors.surface : 'transparent' }]}>
              <Pressable disabled={!done} onPress={() => setStep(s.n)} style={styles.stepHead}>
                <View style={[styles.num, { backgroundColor: done ? colors.success : open ? colors.foreground : colors.surface2 }]}>
                  {done ? <Feather name="check" size={14} color="#fff" /> : <Text style={{ color: open ? colors.background : colors.subtle, fontWeight: '700', fontSize: 12 }}>{s.n}</Text>}
                </View>
                <Text variant="h3" tone={!open && !done ? 'subtle' : 'default'} style={{ flex: 1 }}>{s.title}</Text>
                {done && <Text variant="small" style={{ textDecorationLine: 'underline' }}>{t.common.edit}</Text>}
              </Pressable>
              {done && s.summary ? <Text variant="small" tone="muted" style={{ marginLeft: 38 }} numberOfLines={1}>{s.summary}</Text> : null}

              {open && s.n === 1 && (
                <View style={styles.body}>
                  <Input label={c.email} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" error={errors.email} hint={c.emailHint} />
                  {!user && <Pressable onPress={() => router.push('/auth/sign-in')}><Text variant="small" tone="muted">{c.haveAccount} <Text variant="small" style={{ fontWeight: '700', textDecorationLine: 'underline' }}>{t.common.signIn}</Text></Text></Pressable>}
                  <Button title={c.continueAddress} onPress={() => validate(1) && next(2)} />
                </View>
              )}

              {open && s.n === 2 && (
                <View style={styles.body}>
                  {(saved.data?.addresses.length ?? 0) > 0 && (
                    <View style={{ gap: 8 }}>
                      {saved.data!.addresses.map((ad) => (
                        <Option key={ad.id} selected={addressId === ad.id} onPress={() => setAddressId(ad.id)} title={ad.label} text={`${ad.full_name} · ${ad.line1}, ${ad.city}`} />
                      ))}
                      <Option selected={addressId === 'new'} onPress={() => setAddressId('new')} title={c.useNewAddress} />
                    </View>
                  )}
                  {addressId === 'new' && (
                    <View style={{ gap: 12 }}>
                      <Input label={c.fullName} value={address.full_name} onChangeText={(v) => setAddress({ ...address, full_name: v })} autoComplete="name" error={errors.full_name} />
                      <Input label={c.phone} value={address.phone} onChangeText={(v) => setAddress({ ...address, phone: v })} keyboardType="phone-pad" placeholder="07XX XXX XXX" error={errors.phone} hint={c.phoneHint} />
                      <Input label={c.street} value={address.line1} onChangeText={(v) => setAddress({ ...address, line1: v })} placeholder="Mikocheni B, Plot 123" error={errors.line1} />
                      <Input label={`${c.line2} (${t.common.optional})`} value={address.line2} onChangeText={(v) => setAddress({ ...address, line2: v })} />
                      <Input label={c.city} value={address.city} onChangeText={(v) => setAddress({ ...address, city: v })} error={errors.city} />
                      <View style={{ gap: 6 }}>
                        <Text variant="label">{c.region}</Text>
                        <Pressable onPress={() => setRegionOpen(true)} style={[styles.select, { borderColor: colors.borderStrong, backgroundColor: colors.surface }]}>
                          <Text>{address.region}</Text><Feather name="chevron-down" size={18} color={colors.muted} />
                        </Pressable>
                      </View>
                    </View>
                  )}
                  <Button title={c.continueShipping} onPress={() => validate(2) && next(3)} />
                </View>
              )}

              {open && s.n === 3 && (
                <View style={styles.body}>
                  <Text variant="small" tone="muted">{t.shipping.subtitle}</Text>
                  <ShippingOptions options={options} selected={method} onSelect={setDelivery} loading={loading} />
                  <Text variant="small" tone="muted">{t.shipping.allInclude}</Text>
                  <Button title={c.continuePayment} disabled={!quote?.shipping_available} onPress={() => next(4)} />
                </View>
              )}

              {open && s.n === 4 && (
                <View style={styles.body}>
                  <View style={[styles.demo, { backgroundColor: colors.accentSoft }]}><Feather name="lock" size={14} color={colors.accent} /><Text variant="small" tone="accent" style={{ flex: 1 }}>{c.demoNote}</Text></View>
                  <View style={[styles.segment, { backgroundColor: colors.surface2 }]}>
                    {(['mobile', 'card'] as const).map((k) => (
                      <Pressable key={k} onPress={() => { setPayKind(k); setErrors({}); }} style={[styles.segBtn, payKind === k && { backgroundColor: colors.surface }]}>
                        <Feather name={k === 'mobile' ? 'smartphone' : 'credit-card'} size={15} color={colors.foreground} />
                        <Text variant="label">{k === 'mobile' ? c.mobileMoney : c.card}</Text>
                      </Pressable>
                    ))}
                  </View>
                  {payKind === 'mobile' ? (
                    <View style={{ gap: 12 }}>
                      <Text variant="label">{c.provider}</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {MOBILE_MONEY.map((m) => <Chip key={m} label={m} selected={provider === m} onPress={() => setProvider(m)} />)}
                      </View>
                      <Input label={c.mobileNumber} value={mobile} onChangeText={setMobile} keyboardType="phone-pad" placeholder="07XX XXX XXX" error={errors.mobile} hint={c.mobileHint} />
                    </View>
                  ) : (
                    <View style={{ gap: 12 }}>
                      {(saved.data?.cards.length ?? 0) > 0 && (
                        <View style={{ gap: 8 }}>
                          {saved.data!.cards.map((cd) => <Option key={cd.id} selected={cardId === cd.id} onPress={() => setCardId(cd.id)} title={`${cd.brand} •••• ${cd.last4}`} text={fmt(c.expires, { date: `${String(cd.exp_month).padStart(2, '0')}/${String(cd.exp_year).slice(-2)}` })} />)}
                          <Option selected={cardId === 'new'} onPress={() => setCardId('new')} title={c.useNewCard} />
                        </View>
                      )}
                      {cardId === 'new' && (
                        <>
                          <Input label={c.cardNumber} value={card.number} keyboardType="number-pad" placeholder="4242 4242 4242 4242" error={errors.number}
                            onChangeText={(v) => setCard({ ...card, number: v.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim() })} />
                          <View style={{ flexDirection: 'row', gap: 10 }}>
                            <Input containerStyle={{ flex: 1 }} label={c.expiry} value={card.exp} keyboardType="number-pad" placeholder="MM / YY" error={errors.exp}
                              onChangeText={(v) => { const d = v.replace(/\D/g, '').slice(0, 4); setCard({ ...card, exp: d.length > 2 ? `${d.slice(0, 2)} / ${d.slice(2)}` : d }); }} />
                            <Input containerStyle={{ flex: 1 }} label={c.cvc} value={card.cvc} keyboardType="number-pad" placeholder="CVC" error={errors.cvc} secureTextEntry
                              onChangeText={(v) => setCard({ ...card, cvc: v.replace(/\D/g, '').slice(0, 4) })} />
                          </View>
                          <Input label={c.nameOnCard} value={card.name} onChangeText={(v) => setCard({ ...card, name: v })} error={errors.name} />
                        </>
                      )}
                    </View>
                  )}
                  <Button title={c.reviewOrder} onPress={() => validate(4) && next(5)} />
                </View>
              )}

              {open && s.n === 5 && (
                <View style={styles.body}>
                  {activeLines.map((l) => (
                    <View key={`${l.productId}:${l.variantId}`} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                      <View style={[styles.thumb, { backgroundColor: colors.surface2 }]}>{l.image && <Image source={l.image} style={StyleSheet.absoluteFill} contentFit="cover" />}</View>
                      <View style={{ flex: 1 }}>
                        <Text numberOfLines={1} style={{ fontWeight: '500' }}>{l.name}</Text>
                        <Text variant="small" tone="muted">{[l.variantLabel, fmt(c.qty, { n: l.quantity })].filter(Boolean).join(' · ')}</Text>
                      </View>
                      <Text variant="label">{formatPrice(l.unitPrice * l.quantity)}</Text>
                    </View>
                  ))}
                  <OrderSummary quote={quote} loading={loading} fallbackSubtotal={subtotal} coupon={coupon}
                    onCoupon={(v) => { setCoupon(v); writeJSON(COUPON_KEY, v || null); }} shippingLabel={`${t.summary.shipping} (${t.shipping.methods[method]?.label ?? method})`} />
                  {submitError && <View style={[styles.demo, { backgroundColor: colors.saleSoft }]}><Text tone="sale">{submitError}</Text></View>}
                  <Button size="lg" icon="lock" title={`${c.placeOrder}${quote ? ` · ${formatPrice(quote.total)}` : ''}`} loading={placing} disabled={!quote || loading || !quote.shipping_available} onPress={placeOrder} />
                  <Text variant="small" tone="subtle" style={{ textAlign: 'center' }}>
                    {c.agree.split(/(\{terms\}|\{refunds\}|\{privacy\})/).map((part, i) => {
                      const link = ({ '{terms}': ['terms', c.termsLink], '{refunds}': ['refunds', c.refundsLink], '{privacy}': ['privacy', c.privacyLink] } as Record<string, [string, string]>)[part];
                      return link ? <Text key={i} variant="small" style={{ textDecorationLine: 'underline' }} onPress={() => router.push({ pathname: '/help/[topic]', params: { topic: link[0] } })}>{link[1]}</Text> : part;
                    })}
                  </Text>
                </View>
              )}
            </View>
          );
        })}
        <Text variant="small" tone="subtle" style={{ textAlign: 'center' }}>{fmt(a.step, { n: step, total: 5 })}</Text>
      </ScrollView>

      <Sheet visible={regionOpen} onClose={() => setRegionOpen(false)} title={c.region}>
        <ScrollView contentContainerStyle={{ padding: 8 }}>
          {TZ_REGIONS.map((r) => (
            <Pressable key={r} onPress={() => { setAddress({ ...address, region: r }); setRegionOpen(false); }} style={[styles.region, address.region === r && { backgroundColor: colors.surface2 }]}>
              <Text style={{ fontWeight: address.region === r ? '700' : '400' }}>{r}</Text>
              {address.region === r && <Feather name="check" size={18} color={colors.foreground} />}
            </Pressable>
          ))}
        </ScrollView>
      </Sheet>
    </KeyboardAvoidingView>
  );
}

function Option({ selected, onPress, title, text }: { selected: boolean; onPress: () => void; title: string; text?: string }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ checked: selected }}
      style={[styles.option, { borderColor: selected ? colors.foreground : colors.borderStrong, borderWidth: selected ? 2 : 1 }]}>
      <View style={[styles.radio, { borderColor: selected ? colors.foreground : colors.borderStrong, backgroundColor: selected ? colors.foreground : 'transparent' }]}>
        {selected && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.background }} />}
      </View>
      <View style={{ flex: 1 }}><Text variant="label">{title}</Text>{text ? <Text variant="small" tone="muted">{text}</Text> : null}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  step: { borderWidth: 1, borderRadius: radius.xl, padding: 16, gap: 6 },
  stepHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  num: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  body: { gap: 14, marginTop: 12 },
  select: { height: 50, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  demo: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: radius.md },
  segment: { flexDirection: 'row', padding: 4, borderRadius: radius.full },
  segBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 40, borderRadius: radius.full },
  thumb: { width: 48, height: 60, borderRadius: 8, overflow: 'hidden' },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.md },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  region: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderRadius: radius.md },
});
