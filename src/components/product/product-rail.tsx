import { FlatList, useWindowDimensions, View } from 'react-native';
import { ProductCard } from '@/components/product/product-card';
import { Skeleton } from '@/components/ui';
import type { ProductSummary } from '@/lib/types';

/** Horizontal, snapping product rail. */
export function ProductRail({ products, loading }: { products?: ProductSummary[]; loading?: boolean }) {
  const { width } = useWindowDimensions();
  const cardW = Math.min(220, width * 0.44);
  if (loading || !products) {
    return (
      <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 16 }}>
        {[0, 1, 2].map((i) => <Skeleton key={i} style={{ width: cardW, aspectRatio: 4 / 5.9, borderRadius: 16 }} />)}
      </View>
    );
  }
  return (
    <FlatList
      horizontal
      data={products}
      keyExtractor={(p) => p.id}
      renderItem={({ item }) => <ProductCard product={item} width={cardW} />}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
      showsHorizontalScrollIndicator={false}
      snapToInterval={cardW + 12}
      decelerationRate="fast"
    />
  );
}
