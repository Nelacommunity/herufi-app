import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button, Divider, Input, Text } from '@/components/ui';
import { useI18n } from '@/i18n';
import { fmt } from '@/i18n/config';
import { formatPrice } from '@/lib/format';
import type { Quote } from '@/lib/types';
import { radius, useTheme } from '@/theme';

function Row({ label, value, bold, tone }: { label: string; value: React.ReactNode; bold?: boolean; tone?: 'success' }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 }}>
      <Text variant={bold ? 'h3' : 'body'} tone={tone ?? (bold ? 'default' : 'muted')}>{label}</Text>
      {typeof value === 'string' ? <Text variant={bold ? 'h3' : 'body'} tone={tone} style={{ fontVariant: ['tabular-nums'] }}>{value}</Text> : value}
    </View>
  );
}

/** Order summary with discount code; all numbers come from the quote_order database function. */
export function OrderSummary({ quote, loading, fallbackSubtotal, coupon, onCoupon, shippingLabel }: {
  quote: Quote | null; loading: boolean; fallbackSubtotal: number; coupon: string; onCoupon: (c: string) => void; shippingLabel: string;
}) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const s = t.summary;
  const [code, setCode] = useState('');
  const couponMsg = coupon ? quote?.coupon_message : null;
  const couponText = !couponMsg ? '' : couponMsg.startsWith('min:') ? fmt(s.coupon.min, { amount: formatPrice(Number(couponMsg.slice(4))) }) : (s.coupon as Record<string, string>)[couponMsg] ?? s.coupon.invalid;
  const saved = quote ? Math.max(0, (quote.shipping_list ?? quote.shipping) - quote.shipping) : 0;
  const ready = quote && !loading;

  return (
    <View style={{ backgroundColor: colors.surface2, borderRadius: radius.xl, padding: 18, gap: 4 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <Text variant="h3">{s.title}</Text>
        {loading && <ActivityIndicator size="small" color={colors.muted} />}
      </View>
      <Row label={s.subtotal} value={formatPrice(quote?.subtotal ?? fallbackSubtotal)} />
      {quote && quote.discount > 0 && <Row tone="success" label={`${s.discount} (${quote.coupon_code})`} value={`−${formatPrice(quote.discount)}`} />}
      <Row label={shippingLabel} value={
        !quote ? '—' : quote.shipping === 0 ? (
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            {saved > 0 && <Text variant="small" tone="subtle" style={{ textDecorationLine: 'line-through' }}>{formatPrice(quote.shipping_list)}</Text>}
            <Text tone="success" style={{ fontWeight: '600' }}>{t.common.free}</Text>
          </View>
        ) : formatPrice(quote.shipping)
      } />
      <Row label={s.tax} value={quote ? formatPrice(quote.tax) : '—'} />
      <Divider style={{ marginVertical: 8, backgroundColor: colors.borderStrong }} />
      <Row bold label={s.total} value={quote ? formatPrice(quote.total) : '—'} />
      {ready && saved > 0 && (
        <View style={{ backgroundColor: colors.successSoft, borderRadius: radius.md, padding: 10, marginTop: 8 }}>
          <Text variant="small" tone="success" style={{ textAlign: 'center', fontWeight: '600' }}>{fmt(t.shipping.youSave, { amount: formatPrice(saved) })}</Text>
        </View>
      )}
      <View style={{ marginTop: 12 }}>
        {coupon && !couponMsg ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderStyle: 'dashed', borderColor: colors.success, borderRadius: radius.md, padding: 10 }}>
            <Text tone="success" style={{ fontWeight: '600' }}><Feather name="tag" size={14} /> {fmt(s.applied, { code: coupon })}</Text>
            <Button variant="ghost" size="sm" icon="x" onPress={() => onCoupon('')} accessibilityLabel={s.removeCode} />
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
            <Input containerStyle={{ flex: 1 }} value={code} onChangeText={(v) => setCode(v.toUpperCase())} placeholder={s.codePlaceholder} autoCapitalize="characters" autoCorrect={false} error={couponText || undefined} style={{ height: 44 }} />
            <Button variant="secondary" size="sm" title={t.common.apply} style={{ height: 44 }} disabled={!code.trim()} onPress={() => onCoupon(code.trim())} />
          </View>
        )}
      </View>
    </View>
  );
}
