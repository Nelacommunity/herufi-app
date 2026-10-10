import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { Button, Chip, EmptyState, ErrorState, Sheet, Skeleton, Text } from '@/components/ui';
import { ProductCard } from '@/components/product/product-card';
import { useI18n } from '@/i18n';
import { plural } from '@/i18n/config';
import { SORT_OPTIONS, type SortValue } from '@/lib/constants';
import { formatPrice } from '@/lib/format';
import { getBrandFacets, getCategories, listProducts, type Filters } from '@/lib/queries';
import { useAsync } from '@/lib/use-async';
import type { Category, ProductSummary } from '@/lib/types';
import { radius, useTheme } from '@/theme';

const BAR_H = 60;
const PRICE_PRESETS: { min?: number; max?: number }[] = [{ max: 100_000 }, { min: 100_000, max: 300_000 }, { min: 300_000, max: 1_000_000 }, { min: 1_000_000 }];

/**
 * Product listing with filters, sort and infinite scroll. Used by the Shop tab and category pages.
 * `searchLabel` turns on a compact search bar that slides in once the header has scrolled away (category pages).
 */
export function Catalog({ fixedCategory, initial, header, searchLabel }: { fixedCategory?: Category; initial?: Partial<Filters>; header?: React.ReactElement; searchLabel?: string }) {
  const { colors } = useTheme();
  const { t, a } = useI18n();
  const c = t.catalog;
  const { width } = useWindowDimensions();
  const cardW = (width - 16 * 2 - 12) / 2;

  const [filters, setFilters] = useState<Filters>({ sort: 'recommended', ...initial, categoryId: fixedCategory?.id ?? initial?.categoryId });
  const [draft, setDraft] = useState<Filters>(filters);
  // Results are tagged with the filter key they were fetched for, so "loading" is derived, not stored.
  const [res, setRes] = useState<{ key: string; items: ProductSummary[]; total: number; page: number; error: boolean } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sheet, setSheet] = useState<'filters' | 'sort' | null>(null);

  const categories = useAsync(getCategories, []);
  const brands = useAsync(() => getBrandFacets(filters.categoryId), [filters.categoryId]);

  // Collapsing header: hides (title, search, categories, toolbar) while scrolling down, comes back on scroll up.
  const [headerH, setHeaderH] = useState(0);
  const hSV = useSharedValue(0);
  const offset = useSharedValue(0);
  const lastY = useSharedValue(0);
  const settle = () => {
    'worklet';
    const h = hSV.value;
    if (lastY.value < h || offset.value > -h / 2) offset.value = withTiming(0, { duration: 180 });
    else offset.value = withTiming(-h, { duration: 180 });
  };
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      const y = e.contentOffset.y;
      const dy = y - lastY.value;
      lastY.value = y;
      offset.value = y <= 0 ? 0 : Math.min(0, Math.max(-hSV.value, offset.value - dy));
    },
    onEndDrag: () => settle(),
    onMomentumEnd: () => settle(),
  });
  const headerStyle = useAnimatedStyle(() => ({ transform: [{ translateY: offset.value }] }));

  // Compact search bar: visible once the header is mostly hidden, or while the user is typing in it.
  const [query, setQuery] = useState(initial?.q ?? '');
  const focused = useSharedValue(0);
  const searching = useSharedValue(initial?.q ? 1 : 0);
  const barStyle = useAnimatedStyle(() => {
    const h = hSV.value || 1;
    const p = Math.max(focused.value, searching.value, interpolate(offset.value, [-h * 0.55, -h * 0.9], [0, 1], Extrapolation.CLAMP));
    return { opacity: p, transform: [{ translateY: (1 - p) * -(BAR_H + 8) }] };
  });
  const submitQuery = (q: string) => {
    searching.value = withTiming(q.trim() ? 1 : 0, { duration: 200 });
    setFilters((f) => ({ ...f, q: q.trim() || undefined }));
  };

  const key = JSON.stringify(filters);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    listProducts(filters, 1)
      .then((r) => { if (!cancelled) setRes({ key, items: r.items, total: r.total, page: 1, error: false }); })
      .catch(() => { if (!cancelled) setRes({ key, items: [], total: 0, page: 1, error: true }); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, retry]);

  const loading = res?.key !== key;
  const items = loading ? [] : res!.items;
  const total = res?.total ?? 0;
  const error = !loading && res!.error;
  async function loadMore() {
    if (!res || loading || loadingMore || res.items.length >= res.total) return;
    setLoadingMore(true);
    try {
      const r = await listProducts(filters, res.page + 1);
      setRes((prev) => (prev && prev.key === key ? { ...prev, items: [...prev.items, ...r.items], page: prev.page + 1 } : prev));
    } finally {
      setLoadingMore(false);
    }
  }

  const activeCount = (filters.categoryId && !fixedCategory ? 1 : 0) + (filters.brands?.length ?? 0) + (filters.minPrice != null || filters.maxPrice != null ? 1 : 0)
    + (filters.rating ? 1 : 0) + (filters.inStock ? 1 : 0) + (filters.deals ? 1 : 0);
  const priceLabel = (p: { min?: number; max?: number }) => p.min == null ? c.under.replace('{amount}', formatPrice(p.max)) : p.max == null ? `${formatPrice(p.min)}+` : `${formatPrice(p.min)} – ${formatPrice(p.max)}`;

  const top = useMemo(() => (
    <View style={{ gap: 12, paddingBottom: 12, backgroundColor: colors.background }}>
      {header}
      {!fixedCategory && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
          <Chip label={c.allCategories} selected={!filters.categoryId} onPress={() => setFilters((f) => ({ ...f, categoryId: undefined, brands: [] }))} />
          {(categories.data ?? []).map((cat) => (
            <Chip key={cat.id} label={t.categories[cat.slug] ?? cat.name} selected={filters.categoryId === cat.id} onPress={() => setFilters((f) => ({ ...f, categoryId: cat.id, brands: [] }))} />
          ))}
        </ScrollView>
      )}
      <View style={styles.toolbar}>
        <Text variant="small" tone="muted">{loading ? a.loading : plural(t.common.products, total)}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable onPress={() => setSheet('sort')} style={[styles.tool, { borderColor: colors.borderStrong }]}>
            <Feather name="bar-chart-2" size={14} color={colors.foreground} style={{ transform: [{ rotate: '90deg' }] }} />
            <Text variant="small" style={{ fontWeight: '600' }}>{c.sort[filters.sort ?? 'recommended']}</Text>
          </Pressable>
          <Pressable onPress={() => { setDraft(filters); setSheet('filters'); }} style={[styles.tool, { borderColor: colors.borderStrong }]}>
            <Feather name="sliders" size={14} color={colors.foreground} />
            <Text variant="small" style={{ fontWeight: '600' }}>{a.filters}</Text>
            {activeCount > 0 && <View style={[styles.count, { backgroundColor: colors.foreground }]}><Text style={{ color: colors.background, fontSize: 10, fontWeight: '700' }}>{activeCount}</Text></View>}
          </Pressable>
        </View>
      </View>
    </View>
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [header, fixedCategory, categories.data, filters, loading, total, colors, activeCount, t, a]);

  return (
    <>
      <View style={{ flex: 1, overflow: 'hidden' }}>
      <Animated.FlatList
        data={loading ? [] : items}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyExtractor={(p) => p.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
        contentContainerStyle={{ gap: 22, paddingTop: headerH, paddingBottom: 40 }}
        renderItem={({ item }) => <ProductCard product={item} width={cardW} />}
        onEndReachedThreshold={0.5}
        onEndReached={loadMore}
        ListEmptyComponent={loading ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16 }}>
            {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} style={{ width: cardW, aspectRatio: 4 / 6.2, borderRadius: 16 }} />)}
          </View>
        ) : error ? <ErrorState onRetry={() => setRetry((n) => n + 1)} /> : (
          <EmptyState icon={filters.q || activeCount > 0 ? 'search' : 'package'}
            // No search and no filters means the catalog (or this category) is simply empty: don't blame the filters.
            title={filters.q ? c.noResults.replace('{q}', filters.q) : activeCount > 0 ? c.noMatch : a.emptyCatalog.title}
            description={filters.q ? c.noResultsDesc : activeCount > 0 ? c.noMatchDesc : a.emptyCatalog.body}
            action={activeCount > 0 ? <Button title={c.clearSearch} onPress={() => setFilters({ sort: filters.sort, categoryId: fixedCategory?.id, q: filters.q })} /> : undefined} />
        )}
        ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginTop: 12 }} color={colors.muted} /> : null}
      />
      <Animated.View style={[styles.header, headerStyle]} onLayout={(e) => { const h = e.nativeEvent.layout.height; hSV.value = h; setHeaderH(h); }}>
        {top}
      </Animated.View>
      {searchLabel ? (
        <Animated.View style={[styles.bar, { backgroundColor: colors.background, borderBottomColor: colors.border }, barStyle]}>
          <View style={[styles.barInput, { backgroundColor: colors.surface2 }]}>
            <Feather name="search" size={17} color={colors.muted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={(e) => submitQuery(e.nativeEvent.text)}
              onFocus={() => { focused.value = withTiming(1, { duration: 120 }); }}
              onBlur={() => { focused.value = withTiming(0, { duration: 200 }); }}
              placeholder={searchLabel}
              placeholderTextColor={colors.subtle}
              returnKeyType="search"
              autoCorrect={false}
              style={{ flex: 1, color: colors.foreground, fontSize: 15, paddingVertical: 0, height: '100%' }}
            />
            {query ? (
              <Pressable onPress={() => { setQuery(''); submitQuery(''); }} hitSlop={10} accessibilityLabel={a.reset}>
                <Feather name="x-circle" size={17} color={colors.muted} />
              </Pressable>
            ) : null}
          </View>
          <Pressable onPress={() => { setDraft(filters); setSheet('filters'); }} style={[styles.barBtn, { borderColor: colors.borderStrong }]} accessibilityLabel={a.filters}>
            <Feather name="sliders" size={17} color={colors.foreground} />
            {activeCount > 0 && <View style={[styles.count, styles.barCount, { backgroundColor: colors.foreground }]}><Text style={{ color: colors.background, fontSize: 10, fontWeight: '700' }}>{activeCount}</Text></View>}
          </Pressable>
        </Animated.View>
      ) : null}
      </View>

      <Sheet visible={sheet === 'sort'} onClose={() => setSheet(null)} title={c.sortBy}>
        <View style={{ padding: 8 }}>
          {SORT_OPTIONS.map((o) => (
            <Pressable key={o} onPress={() => { setFilters((f) => ({ ...f, sort: o as SortValue })); setSheet(null); }}
              style={[styles.sortRow, filters.sort === o && { backgroundColor: colors.surface2 }]}>
              <Text style={{ fontWeight: filters.sort === o ? '700' : '400' }}>{c.sort[o]}</Text>
              {filters.sort === o && <Feather name="check" size={18} color={colors.foreground} />}
            </Pressable>
          ))}
        </View>
      </Sheet>

      <Sheet visible={sheet === 'filters'} onClose={() => setSheet(null)} title={a.filters}
        footer={(
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button variant="secondary" title={a.reset} style={{ flex: 1 }} onPress={() => setDraft({ sort: filters.sort, categoryId: fixedCategory?.id, q: filters.q })} />
            <Button title={a.apply} style={{ flex: 2 }} onPress={() => { setFilters(draft); setSheet(null); }} />
          </View>
        )}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 24 }}>
          <View style={{ gap: 10 }}>
            <Text variant="label">{c.price}</Text>
            <View style={styles.wrap}>
              {PRICE_PRESETS.map((p) => {
                const sel = draft.minPrice === p.min && draft.maxPrice === p.max;
                return <Chip key={priceLabel(p)} label={priceLabel(p)} selected={sel} onPress={() => setDraft((d) => ({ ...d, minPrice: sel ? undefined : p.min, maxPrice: sel ? undefined : p.max }))} />;
              })}
            </View>
          </View>
          {(brands.data?.length ?? 0) > 0 && (
            <View style={{ gap: 10 }}>
              <Text variant="label">{c.brand}</Text>
              <View style={styles.wrap}>
                {brands.data!.map((b) => {
                  const sel = draft.brands?.includes(b.brand) ?? false;
                  return <Chip key={b.brand} label={`${b.brand} · ${b.count}`} selected={sel} onPress={() => setDraft((d) => ({ ...d, brands: sel ? d.brands!.filter((x) => x !== b.brand) : [...(d.brands ?? []), b.brand] }))} />;
                })}
              </View>
            </View>
          )}
          <View style={{ gap: 10 }}>
            <Text variant="label">{c.rating}</Text>
            <View style={styles.wrap}>
              {[4.5, 4, 3].map((r) => <Chip key={r} label={`${r}★ ${c.andUp}`} selected={draft.rating === r} onPress={() => setDraft((d) => ({ ...d, rating: d.rating === r ? undefined : r }))} />)}
            </View>
          </View>
          <View style={{ gap: 10 }}>
            <Text variant="label">{c.availability}</Text>
            <View style={styles.wrap}>
              <Chip label={c.inStockOnly} selected={Boolean(draft.inStock)} onPress={() => setDraft((d) => ({ ...d, inStock: !d.inStock }))} />
              <Chip label={c.onSale} selected={Boolean(draft.deals)} onPress={() => setDraft((d) => ({ ...d, deals: !d.deals }))} />
            </View>
          </View>
        </ScrollView>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  header: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  bar: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 11, height: BAR_H, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  barInput: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, height: 42, paddingHorizontal: 14, borderRadius: radius.full },
  barBtn: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  barCount: { position: 'absolute', top: -2, right: -2 },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  tool: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 12, borderRadius: radius.full, borderWidth: 1 },
  count: { minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  sortRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderRadius: radius.md },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});

