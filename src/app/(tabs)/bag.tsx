import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Button, EmptyState, Text } from '@/components/ui';
import { CartLineRow } from '@/components/shop/cart-line';
import { OrderSummary } from '@/components/shop/order-summary';
import { ShippingOptions } from '@/components/shop/shipping-options';
import { useQuote } from '@/components/shop/use-quote';
import { useI18n } from '@/i18n';
import { plural } from '@/i18n/config';
import { formatPrice } from '@/lib/format';
import { quoteFor, resolveMethod } from '@/lib/shipping';
import { readJSON, writeJSON } from '@/lib/storage';
import { useStore } from '@/providers/store';
import { radius, useTheme } from '@/theme';
import { COUPON_KEY } from '@/lib/constants';

export default function Bag() {
  const { colors } = useTheme();
  const { t, a } = useI18n();
  const c = t.cart;
  const insets = useSafeAreaInsets();
  const { activeLines, savedLines, itemCount, subtotal, applyQuote, delivery, setDelivery } = useStore();
  const [coupon, setCoupon] = useState(() => readJSON<string>(COUPON_KEY, ''));
  const { quote: base, loading, error } = useQuote(activeLines, coupon);
  useEffect(() => { if (base) applyQuote(base.lines); }, [base, applyQuote]);
  const options = base?.shipping_options ?? [];
  const method = resolveMethod(options, delivery);
  const quote = base ? quoteFor(base, method) : null;
  const blocked = activeLines.some((l) => l.maxQuantity <= 0 || l.quantity > l.maxQuantity);
  const sea = options.find((o) => o.method === 'sea' && o.available && o.free && o.list_price > 0);

  if (!activeLines.length && !savedLines.length) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top, justifyContent: 'center' }}>
        <EmptyState icon="shopping-bag" title={c.empty} description={c.emptyDesc}
          action={<Button title={c.shopBestSellers} onPress={() => router.navigate({ pathname: '/shop', params: { sort: 'popular' } })} />} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140, gap: 16 }}>
        <Text variant="title">{a.myBag}</Text>
        {sea && (
          <View style={[styles.note, { backgroundColor: colors.successSoft }]}>
            <Feather name="anchor" size={15} color={colors.success} />
            <Text variant="small" tone="success" style={{ fontWeight: '600', flex: 1 }}>{c.unlockedFree}</Text>
          </View>
        )}
        <View>{activeLines.map((l) => <CartLineRow key={`${l.productId}:${l.variantId}`} line={l} />)}</View>

        {activeLines.length > 0 && (
          <>
            <Text variant="h3">{t.shipping.method}</Text>
            <ShippingOptions options={options} selected={method} onSelect={setDelivery} loading={loading} />
            <OrderSummary quote={quote} loading={loading} fallbackSubtotal={subtotal} coupon={coupon}
              onCoupon={(v) => { setCoupon(v); writeJSON(COUPON_KEY, v || null); }}
              shippingLabel={`${t.summary.shipping} (${t.shipping.methods[method]?.label ?? method})`} />
            {error && <Text tone="sale">{t.summary.quoteError}</Text>}
            {blocked && <Text tone="sale">{c.unavailable}</Text>}
          </>
        )}

        {savedLines.length > 0 && (
          <View style={{ marginTop: 12 }}>
            <Text variant="h3">{c.savedForLater} ({savedLines.length})</Text>
            {savedLines.map((l) => <CartLineRow key={`s-${l.productId}:${l.variantId}`} line={l} />)}
          </View>
        )}
      </ScrollView>

      {activeLines.length > 0 && (
        <View style={[styles.bar, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
          <View style={{ flex: 1 }}>
            <Text variant="small" tone="muted">{plural(t.common.items, itemCount)}</Text>
            <Text variant="h3" style={{ fontVariant: ['tabular-nums'] }}>{formatPrice(quote?.total ?? subtotal)}</Text>
          </View>
          <Button size="lg" icon="lock" title={c.checkout} disabled={blocked || !quote?.shipping_available} onPress={() => router.push('/checkout')} style={{ flex: 1.3 }} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  note: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: radius.md },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth },
});
