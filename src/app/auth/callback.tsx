import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Text } from '@/components/ui';
import { useI18n } from '@/i18n';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/theme';

/** Handles herufi://auth/callback?code=… (PKCE) from magic-link, sign-up confirmation and password-reset emails. */
export default function AuthCallback() {
  const params = useLocalSearchParams<{ code?: string; next?: string; error_description?: string; token_hash?: string; type?: string }>();
  const { colors } = useTheme();
  const { t } = useI18n();
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const next = params.next?.startsWith('/') ? params.next : '/account';
      let error: { message: string } | null = null;
      if (params.code) ({ error } = await supabase.auth.exchangeCodeForSession(params.code));
      else if (params.token_hash && params.type) ({ error } = await supabase.auth.verifyOtp({ token_hash: params.token_hash, type: params.type as 'email' | 'recovery' | 'signup' }));
      else error = { message: params.error_description ?? t.auth.errors.link };
      if (error) setFailed(error.message);
      else router.replace(next as '/account');
    })();
  }, [params.code, params.token_hash]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, backgroundColor: colors.background }}>
      {failed ? (
        <>
          <Text variant="h3" style={{ textAlign: 'center' }}>{t.auth.errors.link}</Text>
          <Button title={t.auth.backToSignIn} onPress={() => router.replace('/auth/sign-in')} />
        </>
      ) : <ActivityIndicator color={colors.foreground} />}
    </View>
  );
}
