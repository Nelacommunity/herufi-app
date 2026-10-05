# Herufi — mobile app

React Native (Expo SDK 57 + expo-router) shopping app for **Herufi**: buy direct from China, delivered to Tanzania.
It uses the same Supabase backend as the website (`../herufi`), but it is for shoppers only. **The admin panel is deliberately not included.**

## Features
- Home, shop (filters, sort and infinite scroll), categories, search with suggestions
- Product page with a swipeable, zoomable image gallery, variants, reviews and Q&A
- Bag with shipping options (sea freight is free and applied automatically; air cargo and express air are priced by weight)
- Five-step checkout (contact, address, shipping, payment, review) that calls the `place_order` RPC
- Wishlist, recently viewed, orders with tracking timeline, saved addresses and cards, profile with avatar upload
- Email/password sign-in, magic link and 6-digit code; English/Kiswahili; light/dark/system theme
- Guest bag and wishlist merge into the account on sign-in

## Setup
```bash
npm install
cp .env.example .env   # fill in your Supabase URL + anon key
npx expo start
```
Only the **public anon key** goes in `.env`. Never put the service-role key in the app: every `EXPO_PUBLIC_*` value is bundled into the client.

### Supabase
1. Apply the website's migrations (`../herufi/supabase/migrations`) and run `supabase/seed.sql` so prices are in TSh.
2. Under **Auth → URL Configuration → Redirect URLs**, add `herufi://auth/callback`. For Expo Go during development, also add the `exp://…/--/auth/callback` URL that Expo prints.

## Running
- `npm run android` / `npm run ios`: run on a device or emulator
- `npm run web`: run in the browser
- `npm run typecheck` / `npm run lint`

The app uses native modules (expo-sqlite, expo-image-picker, reanimated). If Expo Go doesn't match SDK 57, make a development build:
```bash
npx expo run:android      # or run:ios (macOS)
```

## Release builds (EAS)
```bash
npm i -g eas-cli
eas login
eas build:configure
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value ...       # plus the anon key
eas build -p android      # or -p ios
```
Bundle ID / package: `tz.co.herufi.app`. Scheme: `herufi`.

## Notes
- Payments (M-Pesa, Tigo Pesa, Airtel Money and cards) are demo only. Cards store only the brand, last 4 digits and expiry.
- Prices, stock, shipping and coupons are all computed in the database (`quote_order` / `place_order`). The client never decides the totals.
