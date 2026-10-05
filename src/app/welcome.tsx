import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View, type FlatList } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { Button, Text } from '@/components/ui';
import { LOGO_PATH, LOGO_VIEWBOX } from '@/components/logo-path';
import { useI18n } from '@/i18n';
import { ONBOARDED_KEY } from '@/lib/constants';
import { writeJSON } from '@/lib/storage';
import { fonts, radius, useTheme, type Colors } from '@/theme';

type Visual = { icon?: keyof typeof Feather.glyphMap; bg: keyof Colors; ring: keyof Colors; tint: keyof Colors; chips: [number, number] };
const VISUALS: Visual[] = [
  { bg: 'surface2', ring: 'surface3', tint: 'foreground', chips: [0, 1] },
  { icon: 'anchor', bg: 'accentSoft', ring: 'successSoft', tint: 'accent', chips: [2, 3] },
  { icon: 'smartphone', bg: 'saleSoft', ring: 'surface2', tint: 'sale', chips: [4, 5] },
];

/** First-launch introduction. Shown once; the flag lives in local storage. */
export default function Welcome() {
  const { colors } = useTheme();
  const { a, locale, setLocale } = useI18n();
  const w = a.welcome;
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const list = useRef<FlatList>(null);
  const x = useSharedValue(0);
  const [index, setIndex] = useState(0);
  const [pageH, setPageH] = useState(0);
  const last = index === w.slides.length - 1;

  const onScroll = useAnimatedScrollHandler((e) => { x.value = e.contentOffset.x; });

  function finish(then?: () => void) {
    writeJSON(ONBOARDED_KEY, true);
    router.replace('/');
    then?.();
  }
  function next() {
    if (last) return finish();
    list.current?.scrollToOffset({ offset: (index + 1) * width, animated: true });
    setIndex(index + 1);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }}>
      <View style={styles.top}>
        <View style={[styles.segment, { backgroundColor: colors.surface2 }]}>
          {(['en', 'sw'] as const).map((l) => (
            <Pressable key={l} onPress={() => setLocale(l)} style={[styles.segItem, locale === l && { backgroundColor: colors.surface, boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }]}>
              <Text variant="small" style={{ fontWeight: '700', color: locale === l ? colors.foreground : colors.muted }}>{l.toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>
        {!last && (
          <Pressable onPress={() => finish()} hitSlop={12}>
            <Text tone="muted" style={{ fontWeight: '600' }}>{w.skip}</Text>
          </Pressable>
        )}
      </View>

      <Animated.FlatList
        ref={list}
        data={w.slides}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        extraData={pageH}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        style={{ flex: 1 }}
        onLayout={(e) => setPageH(e.nativeEvent.layout.height)}
        renderItem={({ item, index: i }) => (
          <View style={{ width, height: pageH || undefined, paddingHorizontal: 24, justifyContent: 'center' }}>
            <Illustration visual={VISUALS[i]} chips={w.chips} size={Math.min(width - 48, height * 0.4)} x={x} index={i} width={width} />
            <Text style={{ fontFamily: i === 0 ? fonts.serif : undefined, fontSize: 32, lineHeight: 38, fontWeight: i === 0 ? '400' : '700', letterSpacing: -0.6, marginTop: 36, color: colors.foreground }}>
              {item.title}
            </Text>
            <Text tone="muted" style={{ fontSize: 16, lineHeight: 24, marginTop: 10 }}>{item.body}</Text>
          </View>
        )}
      />

      <View style={{ paddingHorizontal: 24, gap: 18 }}>
        <View style={styles.dots}>
          {w.slides.map((_, i) => <Dot key={i} i={i} x={x} width={width} color={colors.foreground} />)}
        </View>
        <Button size="lg" title={last ? w.start : w.next} icon={last ? 'arrow-right' : undefined} onPress={next} />
        <Pressable onPress={() => finish(() => router.push('/auth/sign-in'))} style={{ alignItems: 'center', paddingVertical: 4, opacity: last ? 1 : 0 }} disabled={!last}>
          <Text style={{ fontWeight: '600' }}>{w.haveAccount}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Dot({ i, x, width, color }: { i: number; x: SharedValue<number>; width: number; color: string }) {
  const style = useAnimatedStyle(() => {
    const p = interpolate(x.value / width, [i - 1, i, i + 1], [0, 1, 0], Extrapolation.CLAMP);
    return { width: 8 + p * 18, opacity: 0.25 + p * 0.75 };
  });
  return <Animated.View style={[{ height: 8, borderRadius: 4, backgroundColor: color }, style]} />;
}

function Illustration({ visual, chips, size, x, index, width }: { visual: Visual; chips: string[]; size: number; x: SharedValue<number>; index: number; width: number }) {
  const { colors } = useTheme();
  const tint = colors[visual.tint];
  // Content drifts slightly slower than the page for a bit of depth.
  const parallax = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(x.value, [(index - 1) * width, index * width, (index + 1) * width], [width * 0.25, 0, -width * 0.25]) }],
  }));
  return (
    <View style={[styles.stage, { height: size, backgroundColor: colors[visual.bg] }]}>
      <Animated.View style={[styles.center, parallax]}>
        <View style={[styles.ring, { width: size * 0.82, height: size * 0.82, borderColor: colors[visual.ring] }]} />
        <View style={[styles.ring, { width: size * 0.58, height: size * 0.58, borderColor: colors[visual.ring] }]} />
        <View style={[styles.core, { width: size * 0.36, height: size * 0.36, backgroundColor: colors.surface }]}>
          {visual.icon ? <Feather name={visual.icon} size={size * 0.14} color={tint} />
            : <Svg viewBox={LOGO_VIEWBOX} width={size * 0.15} height={size * 0.195}><Path d={LOGO_PATH} fill={tint} fillRule="evenodd" /></Svg>}
        </View>
      </Animated.View>
      <FloatChip label={chips[visual.chips[0]]} style={{ top: '14%', left: '8%' }} delay={0} />
      <FloatChip label={chips[visual.chips[1]]} style={{ bottom: '14%', right: '8%' }} delay={600} />
    </View>
  );
}

function FloatChip({ label, style, delay }: { label: string; style: object; delay: number }) {
  const { colors } = useTheme();
  const y = useSharedValue(0);
  useEffect(() => {
    const t = setTimeout(() => {
      y.value = withRepeat(withSequence(withTiming(-6, { duration: 1400 }), withTiming(0, { duration: 1400 })), -1);
    }, delay);
    return () => clearTimeout(t);
  }, [y, delay]);
  const anim = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return (
    <Animated.View style={[styles.chip, { backgroundColor: colors.surface }, style, anim]}>
      <Text variant="small" style={{ fontWeight: '700' }}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, height: 44 },
  segment: { flexDirection: 'row', padding: 3, borderRadius: radius.full },
  segItem: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.full },
  stage: { borderRadius: radius.xxl, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' },
  ring: { position: 'absolute', borderRadius: 999, borderWidth: 1.5 },
  core: { borderRadius: 999, alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.10)' },
  chip: { position: 'absolute', paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.full, boxShadow: '0 6px 18px rgba(0,0,0,0.10)' },
  dots: { flexDirection: 'row', gap: 6, justifyContent: 'center' },
});
