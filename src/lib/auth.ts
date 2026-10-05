import * as Linking from 'expo-linking';
import type { Dictionary } from '@/i18n/en';

/** Deep link Supabase redirects back to after email links (add it to Supabase → Auth → Redirect URLs). */
export const authRedirect = (next = '/account') => Linking.createURL('/auth/callback', { queryParams: { next } });

export function friendlyAuthError(message: string, e: Dictionary['auth']['errors']) {
  if (/invalid login credentials/i.test(message)) return e.credentials;
  if (/email not confirmed/i.test(message)) return e.unconfirmed;
  if (/already registered/i.test(message)) return e.exists;
  if (/rate limit|too many/i.test(message)) return e.rate;
  if (/password should be|at least 8/i.test(message)) return e.short;
  if (/expired|invalid/i.test(message)) return e.link;
  return message;
}
