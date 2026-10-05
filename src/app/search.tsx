import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Chip, Text } from '@/components/ui';
import { useI18n } from '@/i18n';
import { fmt } from '@/i18n/config';
import { POPULAR_SEARCHES } from '@/lib/constants';
import { formatPrice } from '@/lib/format';
import { getCategories, searchSuggestions } from '@/lib/queries';
import { readJSON, writeJSON } from '@/lib/storage';
import { useAsync } from '@/lib/use-async';
import type { SearchSuggestion } from '@/lib/types';
import { radius, useTheme } from '@/theme';

const RECENT = 'herufi:recent-searches';

export default function SearchScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const s = t.search;
  const insets = useSafeAreaInsets();
  const [term, setTerm] = useState('');
  const [recent, setRecent] = useState<string[]>(() => readJSON<string[]>(RECENT, []));
  const [res, setRes] = useState<{ q: string; items: SearchSuggestion[] } | null>(null);
  const cats = useAsync(getCategories, []);
  const q = term.trim();

  useEffect(() => {
    if (q.length < 2) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      searchSuggestions(q).then((items) => { if (!cancelled) setRes({ q, items }); }).catch(() => { if (!cancelled) setRes({ q, items: [] }); });
    }, 200);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [q]);

  const matchingCats = useMemo(() => (q ? (cats.data ?? []).filter((c) => `${c.name} ${t.categories[c.slug] ?? ''}`.toLowerCase().includes(q.toLowerCase())).slice(0, 4) : []), [q, cats.data, t]);
  const loading = q.length >= 2 && res?.q !== q;
  const results = q.length >= 2 ? res?.items ?? [] : [];

  const remember = (v: string) => { const next = [v, ...recent.filter((r) => r.toLowerCase() !== v.toLowerCase())].slice(0, 6); setRecent(next); writeJSON(RECENT, next); };
  const submit = (v = q) => { if (!v) return; remember(v); router.back(); router.navigate({ pathname: '/shop', params: { q: v } }); };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + 8 }}>
      <View style={styles.bar}>
        <View style={[styles.input, { backgroundColor: colors.surface2 }]}>
          <Feather name="search" size={18} color={colors.muted} />
          <TextInput autoFocus value={term} onChangeText={setTerm} onSubmitEditing={() => submit()} placeholder={s.placeholder} placeholderTextColor={colors.subtle}
            returnKeyType="search" style={{ flex: 1, color: colors.foreground, fontSize: 16 }} accessibilityLabel={t.common.search} />
          {loading ? <ActivityIndicator size="small" color={colors.muted} /> : term ? <Pressable onPress={() => setTerm('')} hitSlop={8} accessibilityLabel={s.clear}><Feather name="x-circle" size={18} color={colors.muted} /></Pressable> : null}
        </View>
        <Pressable onPress={() => router.back()} hitSlop={8}><Text variant="label">{s.cancel}</Text></Pressable>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 24 }}>
        {!q && (
          <>
            {recent.length > 0 && (
              <View style={{ gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text variant="caption" tone="muted">{s.recent}</Text>
                  <Pressable onPress={() => { setRecent([]); writeJSON(RECENT, null); }}><Text variant="small" tone="muted">{s.clearAll}</Text></Pressable>
                </View>
                {recent.map((r) => (
                  <Pressable key={r} onPress={() => submit(r)} style={styles.row}><Feather name="clock" size={16} color={colors.subtle} /><Text>{r}</Text></Pressable>
                ))}
              </View>
            )}
            <View style={{ gap: 10 }}>
              <Text variant="caption" tone="muted">{s.popular}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {POPULAR_SEARCHES.map((p) => <Chip key={p} label={p} onPress={() => submit(p)} icon={<Feather name="trending-up" size={13} color={colors.muted} />} />)}
              </View>
            </View>
            <View style={{ gap: 10 }}>
              <Text variant="caption" tone="muted">{s.byCategory}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {(cats.data ?? []).map((c) => (
                  <Pressable key={c.id} onPress={() => { router.back(); router.push({ pathname: '/category/[slug]', params: { slug: c.slug } }); }} style={styles.cat}>
                    {c.image_url && <Image source={c.image_url} style={StyleSheet.absoluteFill} contentFit="cover" />}
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.35)' }]} />
                    <Text style={{ color: '#fff', fontWeight: '600', margin: 10 }}>{t.categories[c.slug] ?? c.name}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </>
        )}

        {q.length > 0 && (
          <View style={{ gap: 4 }}>
            {matchingCats.map((c) => (
              <Pressable key={c.id} style={styles.row} onPress={() => { remember(q); router.back(); router.push({ pathname: '/category/[slug]', params: { slug: c.slug } }); }}>
                <Feather name="folder" size={16} color={colors.muted} /><Text style={{ flex: 1 }}>{t.categories[c.slug] ?? c.name}</Text>
                <Text variant="small" tone="muted">{fmt(s.itemCount, { n: c.product_count ?? 0 })}</Text>
              </Pressable>
            ))}
            {results.map((p) => (
              <Pressable key={p.id} style={styles.result} onPress={() => { remember(q); router.back(); router.push({ pathname: '/product/[slug]', params: { slug: p.slug } }); }}>
                <View style={[styles.thumb, { backgroundColor: colors.surface2 }]}>{p.image_url && <Image source={p.image_url} style={StyleSheet.absoluteFill} contentFit="cover" />}</View>
                <View style={{ flex: 1 }}>
                  <Text variant="small" tone="muted">{p.brand}{p.category_slug ? ` · ${t.categories[p.category_slug] ?? p.category_name}` : ''}</Text>
                  <Text numberOfLines={1} style={{ fontWeight: '500' }}>{p.name}</Text>
                </View>
                <Text variant="label" tone={p.compare_at_price ? 'sale' : 'default'}>{formatPrice(p.price)}</Text>
              </Pressable>
            ))}
            {!loading && q.length >= 2 && !results.length && !matchingCats.length && (
              <View style={{ paddingVertical: 32, alignItems: 'center', gap: 6 }}>
                <Text variant="h3">{fmt(s.noResults, { q })}</Text>
                <Text tone="muted" style={{ textAlign: 'center' }}>{s.tryDifferent}</Text>
              </View>
            )}
            <Pressable style={[styles.row, { marginTop: 8 }]} onPress={() => submit()}>
              <Feather name="search" size={16} color={colors.foreground} /><Text style={{ flex: 1, fontWeight: '600' }}>{fmt(s.seeAll, { q })}</Text><Feather name="arrow-right" size={16} color={colors.foreground} />
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 8 },
  input: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, height: 46, borderRadius: radius.full, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  result: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  thumb: { width: 52, height: 64, borderRadius: 10, overflow: 'hidden' },
  cat: { width: '48%', height: 80, borderRadius: radius.lg, overflow: 'hidden', justifyContent: 'flex-end' },
});
