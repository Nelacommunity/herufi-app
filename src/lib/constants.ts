import type { DeliveryMethod, OrderStatus } from '@/lib/types';

export const SITE = {
  name: 'Herufi',
  url: process.env.EXPO_PUBLIC_SITE_URL ?? 'https://herufi.co.tz',
  email: 'hello@herufi.co.tz',
  phone: '+255 754 000 123',
};

export const PAGE_SIZE = 20;
export const COUPON_KEY = 'herufi:coupon';
export const SORT_OPTIONS = ['recommended', 'newest', 'price-asc', 'price-desc', 'popular', 'rating'] as const;
export type SortValue = (typeof SORT_OPTIONS)[number];
export const DELIVERY_METHODS: DeliveryMethod[] = ['sea', 'standard', 'express'];
export const MOBILE_MONEY = ['M-Pesa', 'Tigo Pesa', 'Airtel Money', 'HaloPesa'] as const;
export const ORDER_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
export const POPULAR_SEARCHES = ['Headphones', 'Boots', 'Running shoes', 'Vitamin C', 'Candle', 'Leather bag'];
export const TZ_REGIONS = [
  'Dar es Salaam', 'Arusha', 'Dodoma', 'Geita', 'Iringa', 'Kagera', 'Katavi', 'Kigoma', 'Kilimanjaro', 'Lindi', 'Manyara', 'Mara',
  'Mbeya', 'Morogoro', 'Mtwara', 'Mwanza', 'Njombe', 'Pwani', 'Rukwa', 'Ruvuma', 'Shinyanga', 'Simiyu', 'Singida', 'Songwe', 'Tabora',
  'Tanga', 'Kaskazini Unguja', 'Kusini Unguja', 'Mjini Magharibi', 'Kaskazini Pemba', 'Kusini Pemba',
];

/** Luhn check (demo card form; full numbers never leave the device). */
export function luhn(num: string) {
  const digits = num.replace(/\D/g, '');
  if (digits.length < 12 || digits.length > 19) return false;
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return sum % 10 === 0;
}

export function cardBrand(num: string) {
  const n = num.replace(/\D/g, '');
  if (/^4/.test(n)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(n)) return 'Mastercard';
  if (/^3[47]/.test(n)) return 'Amex';
  return 'Card';
}

/** Tanzanian mobile numbers: 06/07xx xxx xxx or +255 6/7xx xxx xxx. */
export function isTzMobile(value: string) {
  return /^(?:\+?255|0)[67]\d{8}$/.test(value.replace(/[\s()-]/g, ''));
}
export const ONBOARDED_KEY = 'herufi:onboarded:v1';
