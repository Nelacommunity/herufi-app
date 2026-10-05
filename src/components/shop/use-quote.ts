import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { normalizeQuote } from '@/lib/shipping';
import type { CartLine, Quote } from '@/lib/types';

/** Authoritative pricing from the quote_order database function (debounced). */
export function useQuote(lines: CartLine[], coupon: string) {
  const items = useMemo(() => lines.map((l) => ({ product_id: l.productId, variant_id: l.variantId, quantity: l.quantity })), [lines]);
  const key = JSON.stringify([items, coupon]);
  const [result, setResult] = useState<{ key: string; quote: Quote | null; error: boolean } | null>(null);

  useEffect(() => {
    if (!items.length) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const { data, error } = await supabase.rpc('quote_order', { items, delivery_method: 'sea', coupon_code: coupon || null });
      if (cancelled) return;
      setResult((r) => (error ? { key, quote: r?.quote ?? null, error: true } : { key, quote: normalizeQuote(data), error: false }));
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!items.length) return { quote: null, loading: false, error: false };
  return { quote: result?.quote ?? null, loading: result?.key !== key, error: Boolean(result?.error) };
}
