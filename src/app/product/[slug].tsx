import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, FontAwesome } from '@expo/vector-icons';
import { Badge, Button, Chip, Divider, EmptyState, ErrorState, Input, Price, QuantityStepper, Sheet, Skeleton, Stars, Text } from '@/components/ui';
import { Gallery, type GalleryHandle } from '@/components/product/gallery';
import { ProductRail } from '@/components/product/product-rail';
import { ShippingOptions } from '@/components/shop/shipping-options';
import { useI18n } from '@/i18n';
import { fmt, plural } from '@/i18n/config';
import { SITE } from '@/lib/constants';
import { formatRelative } from '@/lib/format';
import { getProductBySlug, getQuestions, getRelated, getReviews, getShippingOptions, isInStock } from '@/lib/queries';
import { resolveMethod } from '@/lib/shipping';
import { supabase } from '@/lib/supabase';
import { useAsync } from '@/lib/use-async';
import type { ProductVariant, ShippingOption } from '@/lib/types';
import { useStore } from '@/providers/store';
import { useToast } from '@/providers/toast';
import { radius, space, useTheme } from '@/theme';

const SWATCHES: Record<string, string> = {
  midnight: '#1f2433', sand: '#d8c7a8', slate: '#6b7380', graphite: '#3a3a3a', cloud: '#eef0f2', emerald: '#1f5c4a', ochre: '#c58b2a', ink: '#1c2230',
  mustard: '#d4a02a', oat: '#e6dccb', brass: '#b5893b', teal: '#1f6f73', black: '#141414', white: '#f5f5f3', scarlet: '#b3261e', navy: '#1f2a44',
  moss: '#5b6b3a', plum: '#5e2b4a', charcoal: '#333333', sage: '#9caf88', celadon: '#a8c3b0',
};

export default function ProductScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { colors } = useTheme();
  const { t, a, locale } = useI18n();
  const p = t.product;
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const store = useStore();
  const [variantId, setVariantId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<{ key: string; list: ShippingOption[] } | null>(null);
  const [sheet, setSheet] = useState<'review' | 'question' | null>(null);

  const data = useAsync(async () => {
    const product = await getProductBySlug(slug);
    if (!product) return null;
    const [reviews, questions, related] = await Promise.all([getReviews(product.id), getQuestions(product.id), getRelated(product)]);
    return { product, reviews, questions, related };
  }, [slug]);
  const product = data.data?.product;

  useEffect(() => { if (product) store.trackView(product.id); }, [product?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const gallery = useRef<GalleryHandle>(null);
  const scroller = useRef<ScrollView>(null);
  // A product with a single option has it pre-selected.
  const selectedId = variantId ?? (product?.variants.length === 1 ? product.variants[0].id : null);
  const variant: ProductVariant | null = product?.variants.find((v) => v.id === selectedId) ?? null;
  const extra = variant?.additional_price ?? 0;
  const unit = (product?.price ?? 0) + extra;
  const stock = !product ? 0 : variant ? variant.stock_quantity : product.variants.length ? Math.max(...product.variants.map((v) => v.stock_quantity)) : product.stock_quantity;
  const available = product ? isInStock(product) : false;
  const quantity = Math.min(qty, Math.max(1, Math.min(10, stock)));
  const optKey = `${product?.id}:${quantity}:${unit}`;

  // Live shipping prices for this product and quantity.
  useEffect(() => {
    if (!product) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      getShippingOptions(product.id, quantity, unit * quantity).then((list) => { if (!cancelled) setOptions({ key: optKey, list }); }).catch(() => { if (!cancelled) setOptions({ key: optKey, list: [] }); });
    }, 200);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [optKey]); // eslint-disable-line react-hooks/exhaustive-deps

  if (data.error) return <ErrorState onRetry={data.reload} />;
  if (data.data === null) {
    return <EmptyState icon="package" title={p.unavailableTitle} description={p.unavailableDesc} action={<Button title={p.shopNew} onPress={() => router.replace('/shop')} />} />;
  }
  if (!product) {
    return (
      <View style={{ paddingTop: insets.top + 56, padding: 16, gap: 14 }}>
        <Skeleton style={{ aspectRatio: 1 / 1.2, borderRadius: 0, marginHorizontal: -16 }} />
        <Skeleton style={{ height: 14, width: 90 }} /><Skeleton style={{ height: 28, width: '80%' }} /><Skeleton style={{ height: 22, width: 140 }} />
      </View>
    );
  }

  const optionName = product.variants[0]?.name;
  const optionLabel = optionName ? t.optionNames[optionName] ?? optionName : '';
  const seaFree = options?.list.some((o) => o.method === 'sea' && o.available && o.free);
  const stockNote = !available ? [p.stockSoldOut, colors.sale] : variant && variant.stock_quantity === 0 ? [fmt(p.variantSoldOut, { value: variant.value }), colors.sale]
    : stock > 0 && stock <= 5 ? [fmt(p.lowStock, { n: stock }), colors.warning] : [p.inStock, colors.success];

  const add = (buyNow: boolean) => {
    if (product.variants.length && !variant) { setError(fmt(p.pleaseSelect, { option: optionLabel.toLowerCase() })); return; }
    setError(null);
    const ok = store.addToCart(product, variant, quantity, { silent: buyNow });
    if (ok && buyNow) router.push('/checkout');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{
        headerRight: () => (
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Pressable onPress={() => Share.share({ message: `${product.name} · ${SITE.url}/products/${product.slug}` })} style={styles.round} accessibilityLabel={a.share}><Feather name="share" size={18} color="#111" /></Pressable>
            <Pressable onPress={() => store.toggleWishlist(product.id, product.name)} style={styles.round} accessibilityLabel={p.addToWishlist.replace('{name}', product.name)}>
              <Feather name="heart" size={18} color={store.isWishlisted(product.id) ? '#d92d20' : '#111'} />
            </Pressable>
          </View>
        ),
      }} />
      <ScrollView ref={scroller} contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        <Gallery ref={gallery} images={product.images} name={product.name} badge={!available ? <Badge tone="glass" label={p.soldOut} /> : product.discount_percent > 0 ? <Badge tone="sale" label={`−${product.discount_percent}%`} /> : undefined} />

        <View style={{ padding: space.lg, gap: 14 }}>
          <View style={{ gap: 6 }}>
            <Text variant="caption" tone="muted">{product.brand}</Text>
            <Text variant="title">{product.name}</Text>
            {product.review_count > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Stars value={product.rating} size={14} />
                <Text variant="small" style={{ fontWeight: '600' }}>{product.rating.toFixed(1)}</Text>
                <Text variant="small" tone="muted">({fmt(p.reviewsCount, { n: product.review_count })})</Text>
              </View>
            )}
          </View>
          <Price price={unit} compareAt={product.compare_at_price ? product.compare_at_price + extra : null} size="lg" />
          {seaFree && (
            <View style={[styles.free, { backgroundColor: colors.successSoft }]}>
              <Feather name="anchor" size={14} color={colors.success} />
              <Text variant="small" tone="success" style={{ fontWeight: '700' }}>{t.shipping.pdpBadge}</Text>
            </View>
          )}
          <Text variant="small" tone="muted">{p.taxNote} {p.payNote}</Text>
          <Text tone="muted">{product.description.split('. ').slice(0, 2).join('. ')}{product.description.split('. ').length > 2 ? '.' : ''}</Text>

          {product.variants.length > 0 && (
            <View style={{ gap: 10 }}>
              <Text variant="label">{optionLabel}: <Text tone="muted" style={{ fontWeight: '400' }}>{variant?.value ?? p.selectAnOption}</Text></Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {product.variants.map((v) => {
                  const sw = optionName === 'Color' ? SWATCHES[v.value.toLowerCase()] : undefined;
                  return (
                    <Chip key={v.id} label={`${v.value}${v.additional_price > 0 ? ` +${Math.round(v.additional_price / 1000)}K` : ''}`} selected={selectedId === v.id} disabled={v.stock_quantity <= 0}
                      onPress={() => {
                        setVariantId(v.id); setError(null);
                        // Show the variant's photo, scrolling up so the change is visible.
                        if (v.image_url) { gallery.current?.show(v.image_url); scroller.current?.scrollTo({ y: 0, animated: true }); }
                      }}
                      icon={v.image_url ? <Image source={v.image_url} style={{ width: 22, height: 22, borderRadius: 11, marginLeft: -6 }} contentFit="cover" />
                        : sw ? <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: sw, borderWidth: 1, borderColor: 'rgba(0,0,0,0.15)' }} /> : undefined} />
                  );
                })}
              </View>
              {error && <Text tone="sale" style={{ fontWeight: '600' }}>{error}</Text>}
            </View>
          )}

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: stockNote[1] }} />
            <Text variant="small" style={{ color: stockNote[1], fontWeight: '600' }}>{stockNote[0]}</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text variant="label">{a.quantity}</Text>
            <QuantityStepper value={quantity} onChange={setQty} max={Math.max(1, Math.min(10, stock))} />
          </View>

          {/* Shipping calculator */}
          <View style={[styles.card, { borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text variant="h3">{t.shipping.title}</Text>
                <Text variant="small" tone="muted">{fmt(t.shipping.priceFor, { items: plural(t.common.items, quantity) })}</Text>
              </View>
              <Text variant="small" tone="muted">{product.weight_kg} kg</Text>
            </View>
            <ShippingOptions options={options?.list ?? []} loading={options?.key !== optKey} single
              selected={resolveMethod(options?.list ?? [], store.delivery)} onSelect={store.setDelivery} />
            <Text variant="small" tone="muted">{t.shipping.allInclude} {seaFree ? t.shipping.freeNote : ''}</Text>
          </View>

          <View style={[styles.card, { borderColor: colors.border, gap: 0, padding: 0 }]}>
            {[['rotate-ccw', p.returnsTitle, p.returnsText], ['shield', p.qualityTitle, p.qualityText]].map(([icon, title, text], i) => (
              <View key={title}>
                {i > 0 && <Divider />}
                <View style={{ flexDirection: 'row', gap: 12, padding: 14 }}>
                  <Feather name={icon as 'shield'} size={18} color={colors.foreground} />
                  <View style={{ flex: 1 }}><Text variant="label">{title}</Text><Text variant="small" tone="muted">{text}</Text></View>
                </View>
              </View>
            ))}
          </View>

          {/* Details */}
          <Text variant="h2" style={{ marginTop: 10 }}>{p.description}</Text>
          <Text tone="muted" style={{ lineHeight: 23 }}>{product.description}</Text>
          {product.details.map((d) => <View key={d} style={{ flexDirection: 'row', gap: 10 }}><Text>•</Text><Text tone="muted" style={{ flex: 1 }}>{d}</Text></View>)}

          <Text variant="h2" style={{ marginTop: 10 }}>{p.specifications}</Text>
          <View style={[styles.card, { borderColor: colors.border, padding: 0, gap: 0 }]}>
            {[...Object.entries(product.specifications), [t.shipping.weight, `${product.weight_kg} kg`], [t.shipping.packageSize, `${product.length_cm} × ${product.width_cm} × ${product.height_cm} cm`], ...(product.sku ? [[p.sku, product.sku]] : [])].map(([k, v], i) => (
              <View key={k} style={[styles.spec, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
                <Text variant="small" style={{ fontWeight: '600', width: '42%' }}>{k}</Text>
                <Text variant="small" tone="muted" style={{ flex: 1 }}>{String(v)}</Text>
              </View>
            ))}
          </View>

          {/* Reviews */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
            <Text variant="h2">{p.reviewsTitle}</Text>
            <Button size="sm" variant="secondary" title={a.addReview} onPress={() => (store.user ? setSheet('review') : router.push('/auth/sign-in'))} />
          </View>
          {data.data!.reviews.length ? data.data!.reviews.slice(0, 6).map((r) => (
            <View key={r.id} style={{ gap: 4, paddingVertical: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Stars value={r.rating} /><Text variant="small" tone="muted">{formatRelative(r.created_at, locale)}</Text></View>
              <Text variant="label">{r.title}</Text>
              <Text tone="muted">{r.content}</Text>
              <Text variant="small"><Text variant="small" style={{ fontWeight: '600' }}>{r.author_name}</Text> · <Text variant="small" tone="success">{p.verifiedBuyer}</Text></Text>
            </View>
          )) : <Text tone="muted">{p.noReviewsDesc}</Text>}

          {/* Q&A */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
            <Text variant="h2">{p.qaTitle}</Text>
            <Button size="sm" variant="secondary" title={p.askQuestion} onPress={() => (store.user ? setSheet('question') : router.push('/auth/sign-in'))} />
          </View>
          {data.data!.questions.length ? data.data!.questions.map((q) => (
            <View key={q.id} style={{ gap: 4, paddingVertical: 8 }}>
              <Text variant="label">Q: {q.question}</Text>
              {q.answer ? <Text tone="muted">A: {q.answer}</Text> : <Text variant="small" tone="subtle">{p.awaitingAnswer}</Text>}
            </View>
          )) : <Text tone="muted">{p.noQuestions}</Text>}
        </View>

        {data.data!.related.length > 0 && (
          <View style={{ marginTop: 8 }}>
            <Text variant="h2" style={{ paddingHorizontal: 16, marginBottom: 14 }}>{p.related}</Text>
            <ProductRail products={data.data!.related} />
          </View>
        )}
      </ScrollView>

      {/* Sticky purchase bar */}
      <View style={[styles.bar, { paddingBottom: insets.bottom + 10, backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <Button variant="secondary" size="lg" title={p.buyNow} disabled={!available} style={{ flex: 1 }} onPress={() => add(true)} />
        <Button size="lg" icon="shopping-bag" title={available ? p.addToBag : p.soldOut} disabled={!available} style={{ flex: 1.4 }} onPress={() => add(false)} />
      </View>

      <ReviewSheet visible={sheet === 'review'} productId={product.id} onClose={() => setSheet(null)} onDone={() => { setSheet(null); toast({ tone: 'success', title: t.forms.reviewThanks }); data.reload(); }} />
      <QuestionSheet visible={sheet === 'question'} productId={product.id} onClose={() => setSheet(null)} onDone={() => { setSheet(null); toast({ tone: 'success', title: t.forms.questionThanks }); data.reload(); }} />
    </View>
  );
}

function ReviewSheet({ visible, productId, onClose, onDone }: { visible: boolean; productId: string; onClose: () => void; onDone: () => void }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { user } = useStore();
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const submit = async () => {
    if (!rating) return setErr(t.forms.ratingRequired);
    if (title.trim().length < 2) return setErr(t.forms.titleRequired);
    if (content.trim().length < 10) return setErr(t.forms.contentShort);
    setBusy(true);
    const name = user?.name?.trim();
    const author = name ? `${name.split(/\s+/)[0]} ${name.split(/\s+/).slice(1).map((n) => `${n[0]}.`).join(' ')}`.trim() : t.product.verifiedBuyer;
    const { error } = await supabase.from('reviews').insert({ product_id: productId, user_id: user!.id, author_name: author, rating, title: title.trim(), content: content.trim() });
    setBusy(false);
    if (error) return setErr(error.code === '23505' ? t.forms.reviewDuplicate : t.forms.reviewError);
    setRating(0); setTitle(''); setContent(''); setErr(null);
    onDone();
  };
  return (
    <Sheet visible={visible} onClose={onClose} title={t.product.writeReview} footer={<Button title={t.product.postReview} loading={busy} onPress={submit} full />}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }} keyboardShouldPersistTaps="handled">
        <Text variant="label">{t.product.yourRating}</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable key={n} onPress={() => setRating(n)} hitSlop={6} accessibilityLabel={plural(t.product.stars, n)}>
              <FontAwesome name={n <= rating ? 'star' : 'star-o'} size={30} color={n <= rating ? colors.star : colors.borderStrong} />
            </Pressable>
          ))}
        </View>
        <Input label={t.product.reviewTitle} value={title} onChangeText={setTitle} placeholder={t.product.reviewTitlePlaceholder} maxLength={120} />
        <Input label={t.product.reviewBody} value={content} onChangeText={setContent} placeholder={t.product.reviewBodyPlaceholder} multiline style={{ height: 120, paddingTop: 12, textAlignVertical: 'top' }} maxLength={4000} />
        {err && <Text tone="sale">{err}</Text>}
      </ScrollView>
    </Sheet>
  );
}

function QuestionSheet({ visible, productId, onClose, onDone }: { visible: boolean; productId: string; onClose: () => void; onDone: () => void }) {
  const { t } = useI18n();
  const { user } = useStore();
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const submit = async () => {
    if (q.trim().length < 5) return setErr(t.forms.questionShort);
    setBusy(true);
    const { error } = await supabase.from('product_questions').insert({ product_id: productId, user_id: user!.id, question: q.trim(), author_name: user?.name?.split(/\s+/)[0] ?? 'Customer' });
    setBusy(false);
    if (error) return setErr(t.forms.questionError);
    setQ(''); setErr(null);
    onDone();
  };
  return (
    <Sheet visible={visible} onClose={onClose} title={t.product.askQuestion} footer={<Button title={t.product.submitQuestion} loading={busy} onPress={submit} full />}>
      <View style={{ padding: 20, gap: 12 }}>
        <Input value={q} onChangeText={setQ} placeholder={t.product.questionPlaceholder} multiline style={{ height: 110, paddingTop: 12, textAlignVertical: 'top' }} maxLength={1000} />
        {err && <Text tone="sale">{err}</Text>}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  round: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },
  free: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full },
  card: { borderWidth: 1, borderRadius: radius.xl, padding: 16, gap: 12 },
  spec: { flexDirection: 'row', gap: 12, paddingHorizontal: 14, paddingVertical: 11 },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
});
