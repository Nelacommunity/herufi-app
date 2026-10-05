import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { ZoomIn, FadeInDown } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { Button, Text } from '@/components/ui';
import { useI18n } from '@/i18n';
import { formatPrice } from '@/lib/format';
import { useStore } from '@/providers/store';
import { fonts, useTheme } from '@/theme';

export default function Success() {
  const { order, total } = useLocalSearchParams<{ order: string; total?: string }>();
  const { colors } = useTheme();
  const { t } = useI18n();
  const s = t.checkout.success;
  const { user } = useStore();
  const insets = useSafeAreaInsets();
  const [before, after] = s.body.split('{number}');

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + 60, paddingHorizontal: 24, paddingBottom: insets.bottom + 24, justifyContent: 'space-between' }}>
      <View style={{ alignItems: 'center', gap: 16 }}>
        <Animated.View entering={ZoomIn.springify().damping(12)} style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: colors.successSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="check" size={48} color={colors.success} />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(150)} style={{ alignItems: 'center', gap: 10 }}>
          <Text style={{ fontFamily: fonts.serif, fontSize: 44 }}>{s.title}</Text>
          <Text tone="muted" style={{ textAlign: 'center', fontSize: 16, lineHeight: 24 }}>
            {before}<Text style={{ fontWeight: '700' }}>{order}</Text>{after}
          </Text>
          {total ? <Text variant="h3" style={{ marginTop: 8 }}>{t.summary.total}: {formatPrice(Number(total))}</Text> : null}
        </Animated.View>
      </View>
      <View style={{ gap: 10 }}>
        {user ? (
          <Button size="lg" title={s.track} onPress={() => router.replace({ pathname: '/account/order/[number]', params: { number: order } })} />
        ) : (
          <Button size="lg" title={s.createAccount} onPress={() => router.replace('/auth/sign-up')} />
        )}
        <Button size="lg" variant="secondary" title={t.common.continueShopping} onPress={() => router.replace('/')} />
      </View>
    </View>
  );
}
