import { Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Catalog } from '@/components/shop/catalog';
import { Text } from '@/components/ui';
import { useI18n } from '@/i18n';
import { SORT_OPTIONS, type SortValue } from '@/lib/constants';
import { radius, useTheme } from '@/theme';

export default function Shop() {
  const { colors } = useTheme();
  const { t, a } = useI18n();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ sort?: string; q?: string; deals?: string }>();
  const sort = (SORT_OPTIONS as readonly string[]).includes(params.sort ?? '') ? (params.sort as SortValue) : 'recommended';
  const title = params.q ? `${t.catalog.resultsFor} “${params.q}”` : params.deals ? t.catalog.deals : sort === 'newest' ? t.catalog.newArrivals : sort === 'popular' ? t.catalog.bestSellers : t.catalog.shopAll;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <Catalog
        key={`${params.sort}-${params.q}-${params.deals}`}
        initial={{ sort, q: params.q, deals: params.deals === '1' }}
        header={(
          <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 14 }}>
            <Text variant="title">{title}</Text>
            <Pressable onPress={() => router.push('/search')} style={[styles.search, { backgroundColor: colors.surface2 }]} accessibilityRole="search">
              <Feather name="search" size={18} color={colors.muted} />
              <Text tone="subtle">{a.searchPlaceholder}</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 44, paddingHorizontal: 14, borderRadius: radius.full },
});
