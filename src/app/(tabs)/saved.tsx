import { FlatList, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, EmptyState, ErrorState, Skeleton, Text } from '@/components/ui';
import { ProductCard } from '@/components/product/product-card';
import { useI18n } from '@/i18n';
import { plural } from '@/i18n/config';
import { fetchProductsByIds } from '@/lib/queries';
import { useAsync } from '@/lib/use-async';
import { useStore } from '@/providers/store';
import { useTheme } from '@/theme';

export default function Saved() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const w = t.wishlist;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { wishlist, user } = useStore();
  const data = useAsync(() => fetchProductsByIds(wishlist), [wishlist.join(',')]);
  const items = (data.data ?? []).filter((p) => wishlist.includes(p.id));
  const cardW = (width - 44) / 2;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <FlatList
        data={data.loading ? [] : items}
        keyExtractor={(p) => p.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
        contentContainerStyle={{ gap: 22, paddingBottom: 40 }}
        ListHeaderComponent={(
          <View style={{ padding: 16, gap: 4 }}>
            <Text variant="title">{w.title}</Text>
            {items.length > 0 && <Text tone="muted">{plural(w.count, items.length)}</Text>}
          </View>
        )}
        renderItem={({ item }) => <ProductCard product={item} width={cardW} />}
        ListEmptyComponent={data.loading && wishlist.length ? (
          <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 16 }}>{[0, 1].map((i) => <Skeleton key={i} style={{ width: cardW, aspectRatio: 4 / 6.2, borderRadius: 16 }} />)}</View>
        ) : data.error ? <ErrorState onRetry={data.reload} /> : (
          <EmptyState icon="heart" title={w.empty} description={w.emptyDesc}
            action={<>
              <Button title={w.discover} onPress={() => router.navigate({ pathname: '/shop', params: { sort: 'popular' } })} />
              {!user && <Button variant="secondary" title={t.common.signIn} onPress={() => router.push('/auth/sign-in')} />}
            </>} />
        )}
        refreshing={data.refreshing}
        onRefresh={data.reload}
      />
    </View>
  );
}
