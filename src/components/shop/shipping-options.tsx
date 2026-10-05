import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Badge, Text } from '@/components/ui';
import { useI18n } from '@/i18n';
import { fmt } from '@/i18n/config';
import { formatPrice } from '@/lib/format';
import { etaRange } from '@/lib/shipping';
import type { DeliveryMethod, ShippingOption } from '@/lib/types';
import { radius, useTheme } from '@/theme';

const ICONS: Record<DeliveryMethod, keyof typeof Feather.glyphMap> = { sea: 'anchor', standard: 'send', express: 'zap' };

/** Radio list of shipping methods with live prices; unavailable methods stay visible with the reason. */
export function ShippingOptions({ options, selected, onSelect, loading, single }: {
  options: ShippingOption[]; selected: DeliveryMethod; onSelect: (m: DeliveryMethod) => void; loading?: boolean; single?: boolean;
}) {
  const { colors } = useTheme();
  const { t, locale } = useI18n();
  const s = t.shipping;
  if (!options.length) return <ActivityIndicator style={{ paddingVertical: 24 }} color={colors.muted} />;

  return (
    <View style={{ gap: 8, opacity: loading ? 0.6 : 1 }} accessibilityRole="radiogroup">
      {options.map((o) => {
        const isSel = o.available && selected === o.method;
        const free = o.available && o.price === 0;
        const promo = free && o.free && o.list_price > 0;
        return (
          <Pressable key={o.method} disabled={!o.available} onPress={() => onSelect(o.method)} accessibilityRole="radio" accessibilityState={{ checked: isSel, disabled: !o.available }}
            style={[styles.row, { borderColor: isSel ? colors.foreground : colors.borderStrong, borderWidth: isSel ? 2 : 1, borderStyle: o.available ? 'solid' : 'dashed', opacity: o.available ? 1 : 0.55, backgroundColor: colors.surface }]}>
            <View style={[styles.icon, { backgroundColor: isSel ? colors.foreground : colors.surface2 }]}>
              <Feather name={ICONS[o.method]} size={16} color={isSel ? colors.background : colors.foreground} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Text variant="label">{s.methods[o.method]?.label ?? o.method}</Text>
                {promo && <Badge tone="success" label={s.freeBadge} />}
              </View>
              <Text variant="small" tone="muted">{fmt(s.days, { min: o.eta_min, max: o.eta_max })} · {fmt(s.arrives, { range: etaRange(o.eta_min, o.eta_max, locale) })}</Text>
              {!o.available && <Text variant="small" tone="sale">{single ? s.unavailableItem : fmt(s.unavailableFor, { names: o.blocked_by.join(', ') })}</Text>}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              {promo && <Text variant="small" tone="subtle" style={{ textDecorationLine: 'line-through' }}>{formatPrice(o.list_price)}</Text>}
              <Text variant="label" tone={free ? 'success' : 'default'}>{!o.available ? s.unavailable : free ? t.common.free : formatPrice(o.price)}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.md },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
