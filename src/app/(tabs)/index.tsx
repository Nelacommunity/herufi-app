import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { ErrorState, SectionHeader, Skeleton, Text } from '@/components/ui';
import { ProductRail } from '@/components/product/product-rail';
import { useI18n } from '@/i18n';
import { fmt } from '@/i18n/config';
import { sizedImage } from '@/lib/format';
import { fetchProductsByIds, getCategories, getSection } from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import { useAsync } from '@/lib/use-async';
import { useStore } from '@/providers/store';
import { radius, space, useTheme } from '@/theme';

type PromoTone = { bg: 'foreground' | 'sale' | 'accent'; fg: 'background' | 'white'; icon: keyof typeof Feather.glyphMap; go: () => void };
const PROMO_TONES: PromoTone[] = [
  { bg: 'foreground', fg: 'background', icon: 'anchor', go: () => router.push({ pathname: '/help/[topic]', params: { topic: 'shipping' } }) },
  { bg: 'sale', fg: 'white', icon: 'percent', go: () => router.push({ pathname: '/shop', params: { deals: '1' } }) },
  { bg: 'accent', fg: 'white', icon: 'smartphone', go: () => router.navigate('/shop') },
];

function greeting(h: { morning: string; afternoon: string; evening: string }) {
  const hour = new Date().getHours();
  return hour < 12 ? h.morning : hour < 17 ? h.afternoon : h.evening;
}

export default function Home() {
  const { colors } = useTheme();
  const { t, a, locale, setLocale } = useI18n();
  const { user } = useStore();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const h = t.home;
  const promoW = width - 56;

  const data = useAsync(async () => {
    const [categories, trending, deals, fresh, best, top] = await Promise.all([
      getCategories(), getSection('trending'), getSection('deals'), getSection('new', 6), getSection('bestsellers', 6), getSection('top-rated'),
    ]);
    return { categories, trending, deals, fresh, best, top };
  }, []);

  // Personal picks (orders, wishlist, views) for signed-in shoppers; general favourites otherwise.
  const recs = useAsync(async () => {
    if (!user) return null;
    const { data: ids } = await supabase.rpc('recommended_product_ids', { max_results: 8 });
    const products = await fetchProductsByIds(((ids ?? []) as { id: string }[]).map((r) => r.id));
    return products.length >= 4 ? products : null;
  }, [user?.id]);

  if (data.error && !data.data) return <View style={{ flex: 1, paddingTop: insets.top }}><ErrorState onRetry={data.reload} /></View>;
  const d = data.data;
  const best = d ? Math.max(0, ...d.deals.map((p) => p.discount_percent)) : 0;
  const firstName = user?.name?.split(' ')[0];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.background }]}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text variant="h3" numberOfLines={1} style={{ fontSize: 20, lineHeight: 26, fontWeight: '700' }}>
              {firstName ? `${greeting(a.home)}, ${firstName}` : greeting(a.home)}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <Feather name="map-pin" size={12} color={colors.muted} />
              <Text variant="small" tone="muted">{a.home.deliverTo}</Text>
            </View>
          </View>
          <Pressable onPress={() => setLocale(locale === 'en' ? 'sw' : 'en')} style={[styles.round, { backgroundColor: colors.surface2 }]} accessibilityLabel={t.common.language}>
            <Text variant="small" style={{ fontWeight: '700' }}>{locale.toUpperCase()}</Text>
          </Pressable>
          <Pressable onPress={() => router.navigate('/saved')} style={[styles.round, { backgroundColor: colors.surface2 }]} accessibilityLabel={a.tabs.saved}>
            <Feather name="heart" size={18} color={colors.foreground} />
          </Pressable>
        </View>
        <Pressable onPress={() => router.push('/search')} style={[styles.search, { backgroundColor: colors.surface2 }]} accessibilityRole="search">
          <Feather name="search" size={18} color={colors.muted} />
          <Text tone="subtle" style={{ flex: 1 }}>{a.searchPlaceholder}</Text>
        </Pressable>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={data.refreshing} onRefresh={() => { data.reload(); recs.reload(); }} />}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Promo cards */}
        <FlatList
          data={a.home.promos}
          keyExtractor={(_, i) => String(i)}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={promoW + 12}
          decelerationRate="fast"
          contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingTop: 6 }}
          renderItem={({ item, index }) => {
            const tone = PROMO_TONES[index];
            const fg = tone.fg === 'white' ? '#fff' : colors.background;
            const ctaText = tone.fg === 'white' ? colors[tone.bg] : colors.foreground;
            return (
              <Pressable onPress={tone.go} style={({ pressed }) => [styles.promo, { width: promoW, backgroundColor: colors[tone.bg], opacity: pressed ? 0.92 : 1 }]}>
                <Feather name={tone.icon} size={120} color={fg} style={styles.promoIcon} />
                <Text style={{ color: fg, fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.4 }}>{fmt(item.title, { n: best || 25 })}</Text>
                <Text style={{ color: fg, opacity: 0.8, marginTop: 4 }}>{item.body}</Text>
                <View style={[styles.promoCta, { backgroundColor: fg }]}>
                  <Text variant="small" style={{ fontWeight: '700', color: ctaText }}>{item.cta}</Text>
                  <Feather name="arrow-right" size={14} color={ctaText} />
                </View>
              </Pressable>
            );
          }}
        />

        {/* Categories */}
        <View style={{ paddingTop: space.xl }}>
          <View style={{ paddingHorizontal: space.lg }}><SectionHeader title={a.home.categories} action={a.seeAll} onAction={() => router.navigate('/shop')} /></View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 14 }}>
            {(d?.categories ?? Array.from({ length: 6 }, () => null)).map((c, i) => c ? (
              <Pressable key={c.id} onPress={() => router.push({ pathname: '/category/[slug]', params: { slug: c.slug } })} style={styles.catItem}>
                <View style={[styles.catCircle, { backgroundColor: colors.surface2 }]}>
                  {c.image_url ? <Image source={sizedImage(c.image_url, 200)} style={styles.fill} contentFit="cover" transition={200} recyclingKey={c.id} /> : null}
                </View>
                <Text variant="small" numberOfLines={2} style={{ textAlign: 'center', fontWeight: '600' }}>{t.categories[c.slug] ?? c.name}</Text>
              </Pressable>
            ) : (
              <View key={i} style={styles.catItem}>
                <Skeleton style={styles.catCircle} />
                <Skeleton style={{ width: 52, height: 10, borderRadius: 5 }} />
              </View>
            ))}
          </ScrollView>
        </View>

        <Animated.View entering={FadeIn.duration(300)}>
          <Section title={h.trendingTitle} eyebrow={h.trendingEyebrow} onAll={() => router.push({ pathname: '/shop', params: { sort: 'popular' } })} seeAll={a.seeAll}>
            <ProductRail products={d?.trending} loading={!d} />
          </Section>

          {d && d.deals.length > 0 && (
            <Section title={fmt(h.dealsUpTo, { n: best })} eyebrow={h.dealsEyebrow} eyebrowTone="sale" onAll={() => router.push({ pathname: '/shop', params: { deals: '1' } })} seeAll={a.seeAll}>
              <ProductRail products={d.deals} />
            </Section>
          )}

          <Section title={h.newTitle} eyebrow={h.newEyebrow} onAll={() => router.push({ pathname: '/shop', params: { sort: 'newest' } })} seeAll={a.seeAll}>
            <ProductRail products={d?.fresh} loading={!d} />
          </Section>

          <Section title={h.bestTitle} eyebrow={h.bestEyebrow} onAll={() => router.push({ pathname: '/shop', params: { sort: 'popular' } })} seeAll={a.seeAll}>
            <ProductRail products={d?.best} loading={!d} />
          </Section>

          <Section
            title={recs.data && firstName ? fmt(h.recommendedTitleName, { name: firstName }) : h.recommendedTitle}
            eyebrow={recs.data ? h.pickedForYou : h.favourites}
          >
            <ProductRail products={recs.data ?? d?.top} loading={!d} />
          </Section>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function Section({ title, eyebrow, eyebrowTone, onAll, seeAll, children }: {
  title: string; eyebrow?: string; eyebrowTone?: 'sale'; onAll?: () => void; seeAll?: string; children: React.ReactNode;
}) {
  return (
    <View style={{ paddingTop: space.xxl }}>
      <View style={{ paddingHorizontal: space.lg, flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginBottom: space.md }}>
        <View style={{ flex: 1 }}>
          {eyebrow ? <Text variant="caption" tone={eyebrowTone ?? 'muted'}>{eyebrow}</Text> : null}
          <Text style={{ fontSize: 19, lineHeight: 25, fontWeight: '700', letterSpacing: -0.3, marginTop: 2 }}>{title}</Text>
        </View>
        {onAll ? (
          <Pressable onPress={onAll} hitSlop={10}>
            <Text variant="small" style={{ fontWeight: '700' }}>{seeAll}</Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: space.lg, paddingBottom: 12, gap: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 46, paddingHorizontal: 16, borderRadius: radius.full },
  promo: { height: 168, borderRadius: radius.xl, padding: 20, overflow: 'hidden', justifyContent: 'flex-end' },
  promoIcon: { position: 'absolute', right: -18, top: -14, opacity: 0.14 },
  promoCta: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 14, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full },
  catItem: { width: 72, alignItems: 'center', gap: 8 },
  catCircle: { width: 68, height: 68, borderRadius: 34, overflow: 'hidden' },
  fill: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
});
