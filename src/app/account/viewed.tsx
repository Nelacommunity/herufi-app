import { FlatList, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Button, EmptyState } from '@/components/ui';
import { ProductCard } from '@/components/product/product-card';
import { useI18n } from '@/i18n';
import { fetchProductsByIds } from '@/lib/queries';
import { useAsync } from '@/lib/use-async';
import { useStore } from '@/providers/store';

export default function Viewed() {
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const { recentlyViewed } = useStore();
  const data = useAsync(() => fetchProductsByIds(recentlyViewed()), []);
  const cardW = (width - 44) / 2;
  return (
    <FlatList
      data={data.data ?? []}
      keyExtractor={(p) => p.id}
      numColumns={2}
      columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
      contentContainerStyle={{ gap: 22, paddingVertical: 16 }}
      renderItem={({ item }) => <ProductCard product={item} width={cardW} />}
      ListEmptyComponent={data.loading ? null : <EmptyState icon="clock" title={t.account.viewed.empty} description={t.account.viewed.emptyDesc} action={<Button title={t.common.browseProducts} onPress={() => router.navigate('/shop')} />} />}
    />
  );
}
