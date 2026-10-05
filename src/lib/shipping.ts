import type { DeliveryMethod, Quote, ShippingOption } from '@/lib/types';
import { formatDayMonth } from '@/lib/format';

 
export function normalizeOptions(raw: any[] | null | undefined): ShippingOption[] {
  return (raw ?? []).map((o) => ({
    method: o.method,
    available: Boolean(o.available),
    blocked_by: o.blocked_by ?? [],
    price: Number(o.price),
    list_price: Number(o.list_price ?? o.price),
    free: Boolean(o.free),
    chargeable: Number(o.chargeable),
    unit: o.unit,
    rate: Number(o.rate),
    min_charge: Number(o.min_charge),
    free_over: o.free_over == null ? null : Number(o.free_over),
    free_max_kg: o.free_max_kg == null ? null : Number(o.free_max_kg),
    free_max_cbm: o.free_max_cbm == null ? null : Number(o.free_max_cbm),
    eta_min: Number(o.eta_min),
    eta_max: Number(o.eta_max),
    weight_kg: Number(o.weight_kg),
    volume_cbm: Number(o.volume_cbm),
  }));
}

export function normalizeQuote(q: any): Quote {
  return {
    ...q,
    subtotal: Number(q.subtotal), discount: Number(q.discount), shipping: Number(q.shipping), tax: Number(q.tax), total: Number(q.total),
    shipping_available: q.shipping_available ?? true,
    shipping_options: normalizeOptions(q.shipping_options),
  };
}
 

/** The preferred method if available, otherwise the first available one. */
export function resolveMethod(options: ShippingOption[], preferred: DeliveryMethod): DeliveryMethod {
  if (!options.length) return preferred;
  if (options.some((o) => o.method === preferred && o.available)) return preferred;
  return options.find((o) => o.available)?.method ?? preferred;
}

/** Re-price a quote for another method locally (VAT is on goods only); place_order recomputes server-side. */
export function quoteFor(quote: Quote, method: DeliveryMethod): Quote {
  if (!quote.shipping_options.length) return quote;
  const option = quote.shipping_options.find((o) => o.method === method);
  const shipping = option?.price ?? quote.shipping;
  return {
    ...quote,
    delivery_method: method,
    shipping,
    shipping_list: option?.list_price ?? shipping,
    shipping_available: option?.available ?? false,
    total: quote.subtotal - quote.discount + quote.tax + shipping,
  };
}

export function etaRange(min: number, max: number, locale: 'en' | 'sw') {
  const add = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };
  return `${formatDayMonth(add(min), locale)} – ${formatDayMonth(add(max), locale)}`;
}
