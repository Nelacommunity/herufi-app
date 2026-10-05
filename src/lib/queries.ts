import { supabase } from '@/lib/supabase';
import { PAGE_SIZE, type SortValue } from '@/lib/constants';
import { normalizeOptions } from '@/lib/shipping';
import type { Category, Order, Product, ProductImage, ProductQuestion, ProductSummary, ProductVariant, Review, SearchSuggestion, ShippingOption } from '@/lib/types';

export const SUMMARY_SELECT =
  'id, slug, name, brand, price, compare_at_price, discount_percent, rating, review_count, stock_quantity, is_featured, created_at, ' +
  'category:categories(id, name, slug), images:product_images(id, image_url, alt_text, sort_order), ' +
  'variants:product_variants(id, name, value, additional_price, stock_quantity, sort_order)';
const PRODUCT_SELECT = `${SUMMARY_SELECT}, description, details, specifications, sku, sales_count, is_active, updated_at, weight_kg, length_cm, width_cm, height_cm, volume_cbm, shipping_methods`;

 
const bySort = (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order;

export function toSummary(row: any): ProductSummary {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brand: row.brand ?? '',
    price: Number(row.price),
    compare_at_price: row.compare_at_price == null ? null : Number(row.compare_at_price),
    discount_percent: Number(row.discount_percent ?? 0),
    rating: Number(row.rating ?? 0),
    review_count: Number(row.review_count ?? 0),
    stock_quantity: Number(row.stock_quantity ?? 0),
    is_featured: Boolean(row.is_featured),
    is_new: Date.now() - new Date(row.created_at).getTime() < 21 * 86_400_000,
    created_at: row.created_at,
    category: row.category ?? null,
    images: ((row.images ?? []) as ProductImage[]).slice().sort(bySort),
    variants: ((row.variants ?? []) as any[])
      .map((v): ProductVariant => ({ ...v, additional_price: Number(v.additional_price), stock_quantity: Number(v.stock_quantity) }))
      .sort(bySort),
  };
}

function toProduct(row: any): Product {
  return {
    ...toSummary(row),
    description: row.description ?? '',
    details: row.details ?? [],
    specifications: row.specifications ?? {},
    sku: row.sku ?? null,
    sales_count: Number(row.sales_count ?? 0),
    is_active: row.is_active !== false,
    updated_at: row.updated_at,
    weight_kg: Number(row.weight_kg ?? 0.5),
    length_cm: Number(row.length_cm ?? 20),
    width_cm: Number(row.width_cm ?? 15),
    height_cm: Number(row.height_cm ?? 10),
    volume_cbm: Number(row.volume_cbm ?? 0),
    shipping_methods: row.shipping_methods ?? ['standard', 'express', 'sea'],
  };
}
 

export function isInStock(p: Pick<ProductSummary, 'stock_quantity' | 'variants'>) {
  return p.variants.length ? p.variants.some((v) => v.stock_quantity > 0) : p.stock_quantity > 0;
}

export async function getCategories(): Promise<Category[]> {
  const [{ data, error }, counts] = await Promise.all([
    supabase.from('categories').select('id, name, slug, description, image_url, sort_order').order('sort_order'),
    supabase.rpc('category_counts'),
  ]);
  if (error) throw error;
  const map = new Map(((counts.data ?? []) as { category_id: string; product_count: number }[]).map((c) => [c.category_id, Number(c.product_count)]));
  return (data ?? []).map((c) => ({ ...c, product_count: map.get(c.id) ?? 0 }));
}

export type Section = 'trending' | 'new' | 'bestsellers' | 'deals' | 'top-rated';

export async function getSection(section: Section, limit = 8): Promise<ProductSummary[]> {
  let q = supabase.from('products').select(SUMMARY_SELECT).eq('is_active', true);
  if (section === 'trending') q = q.eq('is_featured', true).order('sales_count', { ascending: false });
  if (section === 'new') q = q.order('created_at', { ascending: false });
  if (section === 'bestsellers') q = q.order('sales_count', { ascending: false });
  if (section === 'deals') q = q.gt('discount_percent', 0).order('discount_percent', { ascending: false });
  if (section === 'top-rated') q = q.gt('stock_quantity', 0).order('rating', { ascending: false }).order('review_count', { ascending: false });
  const { data, error } = await q.limit(limit);
  if (error) throw error;
  return ((data ?? []) as unknown[]).map(toSummary);
}

export type Filters = {
  q?: string;
  categoryId?: string;
  brands?: string[];
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  inStock?: boolean;
  deals?: boolean;
  sort?: SortValue;
};

export async function listProducts(f: Filters, page = 1): Promise<{ items: ProductSummary[]; total: number }> {
  const q = f.q?.trim().slice(0, 100);
  let query = q
    ? supabase.rpc('search_products', { q }, { count: 'exact' }).select(SUMMARY_SELECT)
    : supabase.from('products').select(SUMMARY_SELECT, { count: 'exact' }).eq('is_active', true);
  if (f.categoryId) query = query.eq('category_id', f.categoryId);
  if (f.brands?.length) query = query.in('brand', f.brands);
  if (f.minPrice != null) query = query.gte('price', f.minPrice);
  if (f.maxPrice != null) query = query.lte('price', f.maxPrice);
  if (f.rating) query = query.gte('rating', f.rating);
  if (f.inStock) query = query.gt('stock_quantity', 0);
  if (f.deals) query = query.gt('discount_percent', 0);
  switch (f.sort) {
    case 'newest': query = query.order('created_at', { ascending: false }); break;
    case 'price-asc': query = query.order('price', { ascending: true }); break;
    case 'price-desc': query = query.order('price', { ascending: false }); break;
    case 'popular': query = query.order('sales_count', { ascending: false }); break;
    case 'rating': query = query.order('rating', { ascending: false }).order('review_count', { ascending: false }); break;
    default: if (!q) query = query.order('is_featured', { ascending: false }).order('sales_count', { ascending: false });
  }
  query = query.order('id');
  const from = (page - 1) * PAGE_SIZE;
  const { data, error, count } = await query.range(from, from + PAGE_SIZE - 1);
  if (error) {
    if (error.code === 'PGRST103') return { items: [], total: count ?? 0 };
    throw error;
  }
  return { items: ((data ?? []) as unknown[]).map(toSummary), total: count ?? 0 };
}

export async function getBrandFacets(categoryId?: string): Promise<{ brand: string; count: number }[]> {
  const { data, error } = await supabase.rpc('brand_facets', { p_category_id: categoryId ?? null });
  if (error) return [];
  return (data ?? []).map((b: { brand: string; product_count: number }) => ({ brand: b.brand, count: Number(b.product_count) }));
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  let { data, error } = await supabase.from('products').select(PRODUCT_SELECT).eq('slug', slug).eq('is_active', true).maybeSingle();
  // 42703: shipping columns missing (database before migration 0006) — fall back to defaults.
  if (error?.code === '42703') ({ data, error } = await supabase.from('products').select(PRODUCT_SELECT.replace(/, weight_kg.*$/, '')).eq('slug', slug).eq('is_active', true).maybeSingle());
  if (error) throw error;
  return data ? toProduct(data) : null;
}

export async function getRelated(product: Product, limit = 8) {
  const { data } = await supabase.from('products').select(SUMMARY_SELECT).eq('is_active', true).neq('id', product.id)
    .eq('category_id', product.category?.id ?? '00000000-0000-0000-0000-000000000000').order('sales_count', { ascending: false }).limit(limit);
  return ((data ?? []) as unknown[]).map(toSummary);
}

export async function getReviews(productId: string): Promise<Review[]> {
  const { data } = await supabase.from('reviews').select('id, author_name, rating, title, content, created_at, user_id').eq('product_id', productId).order('created_at', { ascending: false }).limit(50);
  return data ?? [];
}

export async function getQuestions(productId: string): Promise<ProductQuestion[]> {
  const { data } = await supabase.from('product_questions').select('id, author_name, question, answer, answered_at, created_at').eq('product_id', productId).order('created_at', { ascending: false }).limit(30);
  return data ?? [];
}

export async function fetchProductsByIds(ids: string[]): Promise<ProductSummary[]> {
  if (!ids.length) return [];
  const { data, error } = await supabase.from('products').select(SUMMARY_SELECT).in('id', ids).eq('is_active', true);
  if (error) throw error;
  const map = new Map(((data ?? []) as unknown[]).map((r) => { const p = toSummary(r); return [p.id, p]; }));
  return ids.map((id) => map.get(id)).filter((p): p is ProductSummary => Boolean(p));
}

export async function searchSuggestions(q: string): Promise<SearchSuggestion[]> {
  const { data, error } = await supabase.rpc('search_suggestions', { q, max_results: 8 });
  if (error) throw error;
  return ((data ?? []) as SearchSuggestion[]).map((p) => ({ ...p, price: Number(p.price), compare_at_price: p.compare_at_price == null ? null : Number(p.compare_at_price) }));
}

export async function getShippingOptions(productId: string, quantity: number, subtotal: number): Promise<ShippingOption[]> {
  const { data, error } = await supabase.rpc('shipping_options', { items: [{ product_id: productId, quantity }], discounted_subtotal: subtotal });
  if (error) throw error;
  return normalizeOptions(data);
}

export async function getMyOrders(): Promise<Order[]> {
  const { data, error } = await supabase.from('orders').select('*, items:order_items(*)').order('created_at', { ascending: false }).limit(50);
  if (error) throw error;
  return (data ?? []) as Order[];
}

export async function getMyOrder(orderNumber: string): Promise<Order | null> {
  const { data } = await supabase.from('orders').select('*, items:order_items(*)').eq('order_number', orderNumber).maybeSingle();
  return data as Order | null;
}
