import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { readJSON, writeJSON } from '@/lib/storage';
import type { CartLine, DeliveryMethod, ProductSummary, ProductVariant, QuoteLine } from '@/lib/types';
import { useI18n } from '@/i18n';
import { fmt } from '@/i18n/config';
import { useToast } from '@/providers/toast';

// Same keys and sync rules as the website's store provider.
const CART_KEY = 'herufi:cart:v2';
const WISHLIST_KEY = 'herufi:wishlist:v1';
const SYNCED_KEY = 'herufi:synced-user';
const VIEWED_KEY = 'herufi:viewed:v1';
const DELIVERY_KEY = 'herufi:delivery';

export type SessionUser = { id: string; email?: string; name: string | null };

interface StoreValue {
  user: SessionUser | null;
  authReady: boolean;
  lines: CartLine[];
  activeLines: CartLine[];
  savedLines: CartLine[];
  itemCount: number;
  subtotal: number;
  wishlist: string[];
  delivery: DeliveryMethod;
  setDelivery: (m: DeliveryMethod) => void;
  addToCart: (product: ProductSummary, variant: ProductVariant | null, quantity?: number, opts?: { silent?: boolean }) => boolean;
  setQuantity: (productId: string, variantId: string | null, quantity: number) => void;
  removeLine: (productId: string, variantId: string | null) => void;
  setSavedForLater: (productId: string, variantId: string | null, saved: boolean) => void;
  clearCart: () => void;
  applyQuote: (lines: QuoteLine[]) => void;
  isWishlisted: (id: string) => boolean;
  toggleWishlist: (id: string, name?: string) => void;
  trackView: (id: string) => void;
  recentlyViewed: () => string[];
  refreshUser: () => Promise<void>;
  signOut: () => Promise<void>;
}

const StoreContext = createContext<StoreValue | null>(null);
const same = (l: CartLine, p: string, v: string | null) => l.productId === p && l.variantId === v;

 
function rowToLine(r: any): CartLine | null {
  const p = r.product;
  if (!p) return null;
  const v = r.variant;
  const image = (p.images ?? []).slice().sort((a: any, b: any) => a.sort_order - b.sort_order)[0]?.image_url ?? null;
  return {
    productId: r.product_id, variantId: r.variant_id, quantity: r.quantity, savedForLater: r.saved_for_later,
    name: p.name, slug: p.slug, brand: p.brand, image,
    unitPrice: Number(p.price) + Number(v?.additional_price ?? 0),
    compareAtPrice: p.compare_at_price == null ? null : Number(p.compare_at_price) + Number(v?.additional_price ?? 0),
    variantLabel: v ? `${v.name}: ${v.value}` : null,
    maxQuantity: Math.min(99, Number(v ? v.stock_quantity : p.stock_quantity)),
  };
}
 

const toSession = (u: User | null): SessionUser | null =>
  u ? { id: u.id, email: u.email, name: (u.user_metadata?.full_name as string) ?? (u.user_metadata?.name as string) ?? null } : null;

export function StoreProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const toast = useToast();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [lines, setLines] = useState<CartLine[]>(() => readJSON<CartLine[]>(CART_KEY, []));
  const [wishlist, setWishlist] = useState<string[]>(() => readJSON<string[]>(WISHLIST_KEY, []));
  const [delivery, setDeliveryState] = useState<DeliveryMethod>(() => readJSON<DeliveryMethod>(DELIVERY_KEY, 'sea'));
  const linesRef = useRef(lines);
  const wishRef = useRef(wishlist);
  const userRef = useRef<SessionUser | null>(null);
  const tRef = useRef(t);
  useEffect(() => { tRef.current = t; }, [t]);

  const commitLines = useCallback((next: CartLine[]) => { linesRef.current = next; setLines(next); writeJSON(CART_KEY, next); }, []);
  const commitWish = useCallback((next: string[]) => { wishRef.current = next; setWishlist(next); writeJSON(WISHLIST_KEY, next); }, []);

  const loadRemote = useCallback(async (u: SessionUser) => {
    if (readJSON<string | null>(SYNCED_KEY, null) !== u.id) {
      const local = linesRef.current.filter((l) => !l.savedForLater);
      await Promise.all([
        local.length ? supabase.rpc('cart_merge', { items: local.map((l) => ({ product_id: l.productId, variant_id: l.variantId, quantity: l.quantity })) }) : null,
        wishRef.current.length ? supabase.rpc('wishlist_merge', { product_ids: wishRef.current }) : null,
      ]);
      writeJSON(SYNCED_KEY, u.id);
    }
    const [cart, wish] = await Promise.all([
      supabase.from('cart_items')
        .select('product_id, variant_id, quantity, saved_for_later, product:products(name, slug, brand, price, compare_at_price, stock_quantity, images:product_images(image_url, sort_order)), variant:product_variants(name, value, additional_price, stock_quantity)')
        .order('created_at'),
      supabase.from('wishlist_items').select('product_id').order('created_at', { ascending: false }),
    ]);
    if (!cart.error) {
      let lines = (cart.data ?? []).map(rowToLine).filter((l): l is CartLine => Boolean(l));
      // Show the chosen variant's photo (migration 0011). Fetched separately so older databases still load the bag.
      const variantIds = lines.map((l) => l.variantId).filter((id): id is string => Boolean(id));
      if (variantIds.length) {
        const photos = await supabase.from('product_variants').select('id, image_url').in('id', variantIds);
        if (!photos.error) {
          const map = new Map(((photos.data ?? []) as { id: string; image_url: string | null }[]).map((v) => [v.id, v.image_url]));
          lines = lines.map((l) => (l.variantId && map.get(l.variantId) ? { ...l, image: map.get(l.variantId)! } : l));
        }
      }
      commitLines(lines);
    }
    if (!wish.error) commitWish((wish.data ?? []).map((w) => w.product_id as string));
  }, [commitLines, commitWish]);

  const refreshUser = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    const u = toSession(data.user);
    userRef.current = u;
    setUser(u);
  }, []);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      const u = toSession(data.session?.user ?? null);
      userRef.current = u;
      setUser(u);
      setAuthReady(true);
      if (u) loadRemote(u).catch(() => {});
      else writeJSON(SYNCED_KEY, null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const u = toSession(session?.user ?? null);
      if (event === 'SIGNED_IN' && u && userRef.current?.id !== u.id) {
        userRef.current = u;
        setUser(u);
        loadRemote(u).catch(() => {});
      } else if (event === 'SIGNED_OUT') {
        userRef.current = null;
        setUser(null);
        commitLines([]);
        commitWish([]);
        writeJSON(SYNCED_KEY, null);
      } else if (event === 'USER_UPDATED' && u) {
        userRef.current = u;
        setUser(u);
      }
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, [loadRemote, commitLines, commitWish]);

  const remote = useCallback(async (fn: () => PromiseLike<{ error: { message: string } | null }>) => {
    if (!userRef.current) return;
    const { error } = await fn();
    if (error) toast({ tone: 'error', title: tRef.current.cart.saveError, description: error.message });
  }, [toast]);

  const addToCart = useCallback<StoreValue['addToCart']>((product, variant, quantity = 1, opts) => {
    const max = Math.min(99, variant ? variant.stock_quantity : product.stock_quantity);
    if (max <= 0) {
      toast({ tone: 'error', title: tRef.current.cart.soldOut, description: fmt(tRef.current.cart.soldOutDesc, { name: product.name }) });
      return false;
    }
    const existing = linesRef.current.find((l) => same(l, product.id, variant?.id ?? null));
    const qty = Math.min(max, (existing && !existing.savedForLater ? existing.quantity : 0) + quantity);
    const extra = variant?.additional_price ?? 0;
    const line: CartLine = {
      productId: product.id, variantId: variant?.id ?? null, quantity: qty, savedForLater: false,
      name: product.name, slug: product.slug, brand: product.brand, image: variant?.image_url || product.images[0]?.image_url || null,
      unitPrice: product.price + extra, compareAtPrice: product.compare_at_price ? product.compare_at_price + extra : null,
      variantLabel: variant ? `${variant.name}: ${variant.value}` : null, maxQuantity: max,
    };
    commitLines(existing ? linesRef.current.map((l) => (l === existing ? line : l)) : [...linesRef.current, line]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    remote(() => supabase.rpc('cart_set_item', { p_product_id: product.id, p_variant_id: variant?.id ?? null, p_quantity: qty, p_saved_for_later: false }));
    if (!opts?.silent) {
      toast({ tone: 'success', title: tRef.current.cart.added, description: `${product.name}${variant ? ` · ${variant.value}` : ''}`, action: { label: tRef.current.cart.viewBag, onPress: () => router.navigate('/bag') } });
    }
    return true;
  }, [commitLines, remote, toast]);

  const setQuantity = useCallback((productId: string, variantId: string | null, quantity: number) => {
    const line = linesRef.current.find((l) => same(l, productId, variantId));
    if (!line) return;
    const q = Math.min(Math.max(0, quantity), line.maxQuantity || 99);
    commitLines(q > 0 ? linesRef.current.map((l) => (l === line ? { ...l, quantity: q } : l)) : linesRef.current.filter((l) => l !== line));
    Haptics.selectionAsync().catch(() => {});
    remote(() => supabase.rpc('cart_set_item', { p_product_id: productId, p_variant_id: variantId, p_quantity: q, p_saved_for_later: line.savedForLater }));
  }, [commitLines, remote]);

  const removeLine = useCallback((productId: string, variantId: string | null) => {
    commitLines(linesRef.current.filter((l) => !same(l, productId, variantId)));
    remote(() => supabase.rpc('cart_set_item', { p_product_id: productId, p_variant_id: variantId, p_quantity: 0 }));
  }, [commitLines, remote]);

  const setSavedForLater = useCallback((productId: string, variantId: string | null, saved: boolean) => {
    const line = linesRef.current.find((l) => same(l, productId, variantId));
    if (!line) return;
    commitLines(linesRef.current.map((l) => (l === line ? { ...l, savedForLater: saved } : l)));
    remote(() => supabase.rpc('cart_set_item', { p_product_id: productId, p_variant_id: variantId, p_quantity: line.quantity, p_saved_for_later: saved }));
  }, [commitLines, remote]);

  const clearCart = useCallback(() => commitLines(linesRef.current.filter((l) => l.savedForLater)), [commitLines]);

  const applyQuote = useCallback((quoteLines: QuoteLine[]) => {
    let changed = false;
    const next = linesRef.current.map((l) => {
      const q = quoteLines.find((x) => x.product_id === l.productId && (x.variant_id ?? null) === l.variantId);
      if (!q) return l;
      const unitPrice = Number(q.unit_price), maxQuantity = Math.min(99, Number(q.available));
      if (unitPrice === l.unitPrice && maxQuantity === l.maxQuantity) return l;
      changed = true;
      return { ...l, unitPrice, maxQuantity };
    });
    if (changed) commitLines(next);
  }, [commitLines]);

  const toggleWishlist = useCallback((id: string, name?: string) => {
    const saved = !wishRef.current.includes(id);
    commitWish(saved ? [id, ...wishRef.current] : wishRef.current.filter((x) => x !== id));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (saved) toast({ tone: 'success', title: tRef.current.product.savedToWishlist, description: name });
    remote(() => supabase.rpc('wishlist_set', { p_product_id: id, p_saved: saved }));
  }, [commitWish, remote, toast]);

  const trackView = useCallback((id: string) => {
    writeJSON(VIEWED_KEY, [id, ...readJSON<string[]>(VIEWED_KEY, []).filter((x) => x !== id)].slice(0, 20));
    if (userRef.current) {
      supabase.from('product_views').upsert({ user_id: userRef.current.id, product_id: id, viewed_at: new Date().toISOString() }).then(() => {});
    }
  }, []);

  const setDelivery = useCallback((m: DeliveryMethod) => { writeJSON(DELIVERY_KEY, m); setDeliveryState(m); }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    commitLines([]);
    commitWish([]);
  }, [commitLines, commitWish]);

  const value = useMemo<StoreValue>(() => {
    const activeLines = lines.filter((l) => !l.savedForLater);
    return {
      user, authReady, lines, activeLines,
      savedLines: lines.filter((l) => l.savedForLater),
      itemCount: activeLines.reduce((n, l) => n + l.quantity, 0),
      subtotal: activeLines.reduce((n, l) => n + l.unitPrice * l.quantity, 0),
      wishlist, delivery, setDelivery,
      addToCart, setQuantity, removeLine, setSavedForLater, clearCart, applyQuote,
      isWishlisted: (id) => wishlist.includes(id),
      toggleWishlist, trackView,
      recentlyViewed: () => readJSON<string[]>(VIEWED_KEY, []),
      refreshUser, signOut,
    };
  }, [user, authReady, lines, wishlist, delivery, setDelivery, addToCart, setQuantity, removeLine, setSavedForLater, clearCart, applyQuote, toggleWishlist, trackView, refreshUser, signOut]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}
