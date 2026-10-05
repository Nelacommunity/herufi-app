import type { ColorValue } from 'react-native';
import { useState } from 'react';
import { Redirect, Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useI18n } from '@/i18n';
import { ONBOARDED_KEY } from '@/lib/constants';
import { readJSON } from '@/lib/storage';
import { useStore } from '@/providers/store';
import { useTheme } from '@/theme';

export default function TabsLayout() {
  const { colors } = useTheme();
  const { a } = useI18n();
  const { itemCount, wishlist } = useStore();
  const [onboarded] = useState(() => readJSON(ONBOARDED_KEY, false));
  const icon = (name: keyof typeof Feather.glyphMap) => function TabIcon({ color }: { color: ColorValue }) { return <Feather name={name} size={22} color={color as string} />; };
  if (!onboarded) return <Redirect href="/welcome" />;
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: colors.foreground,
      tabBarInactiveTintColor: colors.subtle,
      tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border },
      tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      tabBarBadgeStyle: { backgroundColor: colors.foreground, color: colors.background, fontSize: 10 },
    }}>
      <Tabs.Screen name="index" options={{ title: a.tabs.home, tabBarIcon: icon('home') }} />
      <Tabs.Screen name="shop" options={{ title: a.tabs.shop, tabBarIcon: icon('grid') }} />
      <Tabs.Screen name="saved" options={{ title: a.tabs.saved, tabBarIcon: icon('heart'), tabBarBadge: wishlist.length || undefined }} />
      <Tabs.Screen name="bag" options={{ title: a.tabs.bag, tabBarIcon: icon('shopping-bag'), tabBarBadge: itemCount || undefined }} />
      <Tabs.Screen name="account" options={{ title: a.tabs.account, tabBarIcon: icon('user') }} />
    </Tabs>
  );
}
