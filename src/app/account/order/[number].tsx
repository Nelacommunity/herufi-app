import { ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Divider, ErrorState, Skeleton, Text } from '@/components/ui';
import { OrderStatusBadge, OrderTimeline } from '@/components/shop/order-status';
import { RequireUser } from '@/components/shop/require-user';
import { useI18n } from '@/i18n';
import { fmt } from '@/i18n/config';
import { formatDate, formatPrice } from '@/lib/format';
import { getMyOrder } from '@/lib/queries';
import { useAsync } from '@/lib/use-async';
import { radius, useTheme } from '@/theme';

function OrderDetail() {
  const { number } = useLocalSearchParams<{ number: string }>();
  const { colors } = useTheme();
  const { t, locale } = useI18n();
  const data = useAsync(() => getMyOrder(number), [number]);
  if (data.error) return <ErrorState onRetry={data.reload} />;
  const o = data.data;
  if (!o) return <View style={{ padding: 16, gap: 12 }}>{data.loading && [0, 1, 2].map((i) => <Skeleton key={i} style={{ height: 90, borderRadius: 16 }} />)}</View>;
  const ad = o.shipping_address;
  const saved = Number((o as { shipping_saved?: number }).shipping_saved ?? 0);
  const row = (label: string, value: string, tone?: 'success') => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}><Text tone={tone ?? 'muted'}>{label}</Text><Text tone={tone}>{value}</Text></View>
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Stack.Screen options={{ title: fmt(t.account.order, { number: o.order_number }) }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text tone="muted">{fmt(t.account.placedOn, { date: formatDate(o.created_at, locale, 'long') })}</Text>
        <OrderStatusBadge status={o.status} />
      </View>
      <View style={[styles.card, { borderColor: colors.border }]}><OrderTimeline status={o.status} /></View>

      {[
        ['map-pin', t.account.shippingAddress, `${ad.full_name}\n${ad.line1}${ad.line2 ? `, ${ad.line2}` : ''}\n${ad.city}${ad.region ? `, ${ad.region}` : ''}${ad.phone ? `\n${ad.phone}` : ''}`],
        ['truck', t.shipping.method, t.shipping.methods[o.delivery_method]?.label ?? o.delivery_method],
        ['credit-card', t.account.payment, `${fmt(t.checkout.endingIn, { brand: o.payment_method?.brand ?? '', last4: o.payment_method?.last4 ?? '••••' })}\n${t.account.paymentStatus[o.payment_status] ?? o.payment_status}`],
      ].map(([icon, title, text]) => (
        <View key={title} style={[styles.card, { backgroundColor: colors.surface2, borderColor: colors.surface2, flexDirection: 'row', gap: 12 }]}>
          <Feather name={icon as 'truck'} size={18} color={colors.foreground} />
          <View style={{ flex: 1, gap: 4 }}><Text variant="label">{title}</Text><Text tone="muted">{text}</Text></View>
        </View>
      ))}

      <View style={[styles.card, { borderColor: colors.border, gap: 12 }]}>
        {o.items.map((i) => (
          <View key={i.id} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <View style={[styles.thumb, { backgroundColor: colors.surface2 }]}>{i.image_url && <Image source={i.image_url} style={StyleSheet.absoluteFill} contentFit="cover" />}</View>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={2} style={{ fontWeight: '500' }}>{i.product_name}</Text>
              <Text variant="small" tone="muted">{[i.variant, fmt(t.checkout.qty, { n: i.quantity })].filter(Boolean).join(' · ')}</Text>
            </View>
            <Text variant="label">{formatPrice(i.price * i.quantity)}</Text>
          </View>
        ))}
        <Divider />
        {row(t.summary.subtotal, formatPrice(o.subtotal))}
        {Number(o.discount) > 0 && row(`${t.summary.discount} (${o.coupon_code})`, `−${formatPrice(o.discount)}`, 'success')}
        {row(t.summary.shipping, Number(o.shipping) === 0 ? t.common.free : formatPrice(o.shipping))}
        {row(t.summary.tax, formatPrice(o.tax))}
        <Divider />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text variant="h3">{t.summary.total}</Text><Text variant="h3">{formatPrice(o.total)}</Text></View>
        {saved > 0 && <Text tone="success" style={{ textAlign: 'right', fontWeight: '600' }}>{fmt(t.shipping.youSaved, { amount: formatPrice(saved) })}</Text>}
      </View>
    </ScrollView>
  );
}

export default function OrderScreen() {
  return <RequireUser><OrderDetail /></RequireUser>;
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.lg, padding: 16 },
  thumb: { width: 52, height: 64, borderRadius: 8, overflow: 'hidden' },
});
