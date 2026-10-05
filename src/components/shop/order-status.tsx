import { View } from 'react-native';
import { Text } from '@/components/ui';
import { useI18n } from '@/i18n';
import type { OrderStatus } from '@/lib/types';
import { radius, useTheme } from '@/theme';

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const tone: Record<OrderStatus, [string, string]> = {
    pending: [colors.surface2, colors.muted], confirmed: [colors.accentSoft, colors.accent], processing: [colors.surface2, colors.warning],
    shipped: [colors.surface2, '#2563eb'], delivered: [colors.successSoft, colors.success], cancelled: [colors.saleSoft, colors.sale],
  };
  const [bg, fg] = tone[status];
  return (
    <View style={{ backgroundColor: bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: fg }} />
      <Text style={{ color: fg, fontSize: 12, fontWeight: '700' }}>{t.status[status]}</Text>
    </View>
  );
}

const FLOW: OrderStatus[] = ['confirmed', 'processing', 'shipped', 'delivered'];

export function OrderTimeline({ status }: { status: OrderStatus }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  if (status === 'cancelled') return <Text tone="sale" style={{ fontWeight: '600' }}>{t.account.cancelledNote}</Text>;
  const current = status === 'pending' ? -1 : FLOW.indexOf(status);
  return (
    <View style={{ flexDirection: 'row' }}>
      {FLOW.map((s, i) => (
        <View key={s} style={{ flex: 1, gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: i <= current ? colors.foreground : colors.surface2, borderWidth: 1, borderColor: i <= current ? colors.foreground : colors.borderStrong }} />
            {i < FLOW.length - 1 && <View style={{ flex: 1, height: 2, backgroundColor: i < current ? colors.foreground : colors.border }} />}
          </View>
          <Text variant="small" tone={i <= current ? 'default' : 'subtle'} style={{ fontWeight: '600' }}>{t.status[s]}</Text>
        </View>
      ))}
    </View>
  );
}
