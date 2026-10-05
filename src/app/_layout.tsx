import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { I18nProvider, useI18n } from '@/i18n';
import { ThemeProvider, useTheme } from '@/theme';
import { ToastProvider } from '@/providers/toast';
import { StoreProvider } from '@/providers/store';

function Navigator() {
  const { colors, dark } = useTheme();
  const { t, a } = useI18n();
  const base = dark ? DarkTheme : DefaultTheme;
  return (
    <NavThemeProvider value={{ ...base, colors: { ...base.colors, background: colors.background, card: colors.background, text: colors.foreground, border: colors.border, primary: colors.foreground } }}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShadowVisible: false, headerTintColor: colors.foreground, headerStyle: { backgroundColor: colors.background }, headerBackButtonDisplayMode: 'minimal', contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="welcome" options={{ headerShown: false, gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="product/[slug]" options={{ title: '', headerTransparent: true }} />
        <Stack.Screen name="category/[slug]" options={{ title: '' }} />
        <Stack.Screen name="search" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="checkout/index" options={{ title: t.checkout.title }} />
        <Stack.Screen name="checkout/success" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="auth/sign-in" options={{ presentation: 'modal', title: '' }} />
        <Stack.Screen name="auth/sign-up" options={{ presentation: 'modal', title: '' }} />
        <Stack.Screen name="auth/forgot" options={{ presentation: 'modal', title: '' }} />
        <Stack.Screen name="auth/reset" options={{ title: t.auth.resetTitle }} />
        <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
        <Stack.Screen name="account/orders" options={{ title: a.menu.orders }} />
        <Stack.Screen name="account/order/[number]" options={{ title: '' }} />
        <Stack.Screen name="account/addresses" options={{ title: a.menu.addresses }} />
        <Stack.Screen name="account/payments" options={{ title: a.menu.payments }} />
        <Stack.Screen name="account/viewed" options={{ title: a.menu.viewed }} />
        <Stack.Screen name="account/profile" options={{ title: a.menu.profile }} />
        <Stack.Screen name="account/settings" options={{ title: a.menu.settings }} />
        <Stack.Screen name="help/index" options={{ title: a.menu.help }} />
        <Stack.Screen name="help/[topic]" options={{ title: '' }} />
      </Stack>
    </NavThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <I18nProvider>
            <ToastProvider>
              <StoreProvider>
                <Navigator />
              </StoreProvider>
            </ToastProvider>
          </I18nProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
