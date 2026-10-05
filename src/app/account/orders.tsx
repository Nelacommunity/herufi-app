import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Button, EmptyState, ErrorState, Skeleton, Text } from '@/components/ui';
import { OrderStatusBadge } from '@/components/shop/order-status';
import { RequireUser } from '@/components/shop/require-user';
import { useI18n } from '@/i18n';
import { fmt, plural } from '@/i18n/config';
import { formatDate, formatPrice } from '@/lib/format';
import { getMyOrders } from '@/lib/queries';
import { useAsync } from '@/lib/use-async';
import { radius, useTheme } from '@/theme';

function Orders() {
  const { colors } = useTheme();
  const { t, locale } = useI18n();
  const data = useAsync(getMyOrders, []);
  if (data.error) return <ErrorState onRetry={data.reload} />;
  return (
    <FlatList
      data={data.data ?? []}
      keyExtractor={(o) => o.id}
      contentContainerStyle={{ padding: 16, gap: 12 }}
      refreshing={data.refreshing}
      onRefresh={data.reload}
      ListEmptyComponent={data.loading ? <View style={{ gap: 12 }}>{[0, 1, 2].map((i) => <Skeleton key={i} style={{ height: 130, borderRadius: 16 }} />)}</View>
        : <EmptyState icon="package" title={t.account.noOrders} description={t.account.noOrdersFull} action={<Button title={t.cart.startShopping} onPress={() => router.navigate('/shop')} />} />}
      renderItem={({ item: o }) => (
        <Pressable onPress={() => router.push({ pathname: '/account/order/[number]', params: { number: o.order_number } })} style={[styles.card, { borderColor: colors.border }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <View>
              <Text variant="label">{fmt(t.account.order, { number: o.order_number })}</Text>
              <Text variant="small" tone="muted">{fmt(t.account.placed, { date: formatDate(o.created_at, locale), items: plural(t.common.items, o.items.reduce((n, i) => n + i.quantity, 0)) })}</Text>
            </View>
            <OrderStatusBadge status={o.status} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
            <View style={{ flexDirection: 'row' }}>
              {o.items.slice(0, 4).map((i, n) => (
                <View key={i.id} style={[styles.thumb, { marginLeft: n ? -10 : 0, borderColor: colors.background, backgroundColor: colors.surface2 }]}>
                  {i.image_url && <Image source={i.image_url} style={StyleSheet.absoluteFill} contentFit="cover" />}
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text variant="label">{formatPrice(o.total)}</Text>
              <Feather name="chevron-right" size={18} color={colors.subtle} />
            </View>
          </View>
        </Pressable>
      )}
    />
  );
}

export default function OrdersScreen() {
  return <RequireUser><Orders /></RequireUser>;
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.lg, padding: 16 },
  thumb: { width: 44, height: 56, borderRadius: 8, overflow: 'hidden', borderWidth: 2 },
});
