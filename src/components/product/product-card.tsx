import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Badge, Price, Stars, Text } from '@/components/ui';
import { useStore } from '@/providers/store';
import { useI18n } from '@/i18n';
import { fmt } from '@/i18n/config';
import { isInStock } from '@/lib/queries';
import type { ProductSummary } from '@/lib/types';
import { radius, useTheme } from '@/theme';

/** Grid/rail product card with wishlist heart and one-tap add (opens the product when it has options). */
export const ProductCard = memo(function ProductCard({ product, width }: { product: ProductSummary; width?: number }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { isWishlisted, toggleWishlist, addToCart } = useStore();
  const saved = isWishlisted(product.id);
  const inStock = isInStock(product);
  const image = product.images[0]?.image_url;
  const open = () => router.push({ pathname: '/product/[slug]', params: { slug: product.slug } });

  return (
    <Pressable onPress={open} style={({ pressed }) => [{ width, opacity: pressed ? 0.92 : 1 }]} accessibilityRole="link" accessibilityLabel={product.name}>
      <View style={[styles.imageWrap, { backgroundColor: colors.surface2 }]}>
        {image ? <Image source={image} style={[StyleSheet.absoluteFill, !inStock && { opacity: 0.55 }]} contentFit="cover" transition={250} recyclingKey={product.id} /> : null}
        <View style={styles.badges}>
          {!inStock ? <Badge tone="glass" label={t.product.soldOut} /> : product.discount_percent > 0 ? <Badge tone="sale" label={`−${product.discount_percent}%`} /> : product.is_new ? <Badge tone="glass" label={t.product.new} /> : null}
        </View>
        <Pressable onPress={() => toggleWishlist(product.id, product.name)} hitSlop={8} style={styles.heart}
          accessibilityLabel={fmt(saved ? t.product.removeFromWishlist : t.product.addToWishlist, { name: product.name })}>
          <Feather name="heart" size={17} color={saved ? '#d92d20' : '#111'} />
        </Pressable>
        {inStock && (
          <Pressable
            onPress={() => (product.variants.length ? open() : addToCart(product, null, 1))}
            hitSlop={6}
            style={styles.add}
            accessibilityLabel={fmt(t.product.quickAddAria, { name: product.name })}
          >
            <Feather name="plus" size={18} color="#111" />
          </Pressable>
        )}
      </View>
      <View style={{ paddingTop: 10, gap: 3 }}>
        <Text variant="caption" tone="muted" numberOfLines={1} style={{ fontSize: 10 }}>{product.brand}</Text>
        <Text variant="small" numberOfLines={2} style={{ fontWeight: '500', fontSize: 14 }}>{product.name}</Text>
        {product.review_count > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Stars value={product.rating} size={11} />
            <Text variant="small" tone="muted" style={{ fontSize: 11 }}>({product.review_count})</Text>
          </View>
        )}
        <View style={{ marginTop: 2 }}><Price price={product.price} compareAt={product.compare_at_price} size="sm" /></View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  imageWrap: { aspectRatio: 4 / 5, borderRadius: radius.lg, overflow: 'hidden' },
  badges: { position: 'absolute', top: 10, left: 10 },
  heart: { position: 'absolute', top: 8, right: 8, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },
  add: { position: 'absolute', bottom: 8, right: 8, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },
});
