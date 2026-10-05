import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { QuantityStepper, Text } from '@/components/ui';
import { useI18n } from '@/i18n';
import { fmt } from '@/i18n/config';
import { formatPrice } from '@/lib/format';
import type { CartLine } from '@/lib/types';
import { useStore } from '@/providers/store';
import { radius, useTheme } from '@/theme';

export function CartLineRow({ line }: { line: CartLine }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const c = t.cart;
  const { setQuantity, removeLine, setSavedForLater } = useStore();
  const soldOut = line.maxQuantity <= 0;
  const variant = line.variantLabel?.replace(/^([^:]+):/, (_, n: string) => `${t.optionNames[n] ?? n}:`);
  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <Pressable onPress={() => router.push({ pathname: '/product/[slug]', params: { slug: line.slug } })} style={[styles.image, { backgroundColor: colors.surface2 }]}>
        {line.image && <Image source={line.image} style={StyleSheet.absoluteFill} contentFit="cover" />}
      </Pressable>
      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Text variant="small" tone="muted">{line.brand}</Text>
            <Text numberOfLines={2} style={{ fontWeight: '500' }}>{line.name}</Text>
            {variant && <Text variant="small" tone="muted">{variant}</Text>}
          </View>
          <Text variant="label" style={{ fontVariant: ['tabular-nums'] }}>{formatPrice(line.unitPrice * line.quantity)}</Text>
        </View>
        {soldOut ? <Text variant="small" tone="sale">{c.soldOutRemove}</Text>
          : line.quantity >= line.maxQuantity && line.maxQuantity < 10 ? <Text variant="small" style={{ color: colors.warning }}>{fmt(c.onlyLeft, { n: line.maxQuantity })}</Text> : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
          {line.savedForLater ? (
            <Pressable onPress={() => setSavedForLater(line.productId, line.variantId, false)}><Text variant="label">{c.moveToBag}</Text></Pressable>
          ) : (
            <QuantityStepper compact value={line.quantity} max={Math.max(1, line.maxQuantity)} onChange={(v) => setQuantity(line.productId, line.variantId, v)} />
          )}
          <View style={{ flexDirection: 'row', gap: 16 }}>
            {!line.savedForLater && (
              <Pressable onPress={() => setSavedForLater(line.productId, line.variantId, true)} hitSlop={8} accessibilityLabel={c.saveForLater}>
                <Feather name="bookmark" size={18} color={colors.muted} />
              </Pressable>
            )}
            <Pressable onPress={() => removeLine(line.productId, line.variantId)} hitSlop={8} accessibilityLabel={fmt(c.removeAria, { name: line.name })}>
              <Feather name="trash-2" size={18} color={colors.muted} />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 14, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  image: { width: 86, height: 108, borderRadius: radius.md, overflow: 'hidden' },
});
