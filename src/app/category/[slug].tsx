import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Catalog } from '@/components/shop/catalog';
import { ErrorState, Text } from '@/components/ui';
import { useI18n } from '@/i18n';
import { sizedImage } from '@/lib/format';
import { fmt, plural } from '@/i18n/config';
import { getCategories } from '@/lib/queries';
import { useAsync } from '@/lib/use-async';
import { radius } from '@/theme';

export default function CategoryScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t, a } = useI18n();
  const cats = useAsync(getCategories, []);
  const cat = cats.data?.find((c) => c.slug === slug);
  if (cats.error) return <ErrorState onRetry={cats.reload} />;
  if (!cat) return <View style={{ flex: 1 }} />;
  const name = t.categories[cat.slug] ?? cat.name;

  return (
    <>
      <Stack.Screen options={{ title: name }} />
      <Catalog
        fixedCategory={cat}
        searchLabel={fmt(a.searchIn, { name })}
        header={(
          <View style={styles.hero}>
            {cat.image_url ? <Image source={sizedImage(cat.image_url, 900)} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} contentFit="cover" transition={250} /> : null}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.42)' }]} />
            <View style={{ padding: 20 }}>
              <Text variant="caption" style={{ color: 'rgba(255,255,255,0.8)' }}>{plural(t.common.products, cat.product_count ?? 0)}</Text>
              <Text variant="title" style={{ color: '#fff', marginTop: 4 }}>{name}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.85)', marginTop: 6 }}>{t.categoryDescriptions[cat.slug] ?? cat.description}</Text>
            </View>
          </View>
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: '#2a2a28', marginHorizontal: 16, marginTop: 8, borderRadius: radius.xl, overflow: 'hidden', minHeight: 180, justifyContent: 'flex-end' },
});
