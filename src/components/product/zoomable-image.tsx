import { StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

const MAX = 4;

/** Pinch / double-tap to zoom, drag to pan while zoomed. Reports zoom state so the pager can lock swiping. */
export function ZoomableImage({ uri, width, height, onZoomChange }: { uri: string; width: number; height: number; onZoomChange: (zoomed: boolean) => void }) {
  const scale = useSharedValue(1);
  const saved = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  const clamp = (s: number) => {
    'worklet';
    const maxX = ((s - 1) * width) / 2;
    const maxY = ((s - 1) * height) / 2;
    tx.value = Math.min(maxX, Math.max(-maxX, tx.value));
    ty.value = Math.min(maxY, Math.max(-maxY, ty.value));
  };

  const pinch = Gesture.Pinch()
    .onUpdate((e) => { scale.value = Math.min(MAX, Math.max(1, saved.value * e.scale)); clamp(scale.value); })
    .onEnd(() => {
      saved.value = scale.value;
      if (scale.value <= 1.02) { scale.value = withTiming(1); saved.value = 1; tx.value = withTiming(0); ty.value = withTiming(0); }
      scheduleOnRN(onZoomChange, saved.value > 1.02);
    });

  const pan = Gesture.Pan()
    .averageTouches(true)
    .onStart(() => { startX.value = tx.value; startY.value = ty.value; })
    .onUpdate((e) => {
      if (scale.value <= 1.02) return;
      tx.value = startX.value + e.translationX;
      ty.value = startY.value + e.translationY;
      clamp(scale.value);
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((e) => {
      if (scale.value > 1.02) {
        scale.value = withTiming(1); saved.value = 1; tx.value = withTiming(0); ty.value = withTiming(0);
        scheduleOnRN(onZoomChange, false);
      } else {
        const s = 2.5;
        tx.value = withTiming(-(e.x - width / 2) * (s - 1));
        ty.value = withTiming(-(e.y - height / 2) * (s - 1));
        scale.value = withTiming(s); saved.value = s;
        scheduleOnRN(onZoomChange, true);
      }
    });

  const style = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }] }));

  return (
    <GestureDetector gesture={Gesture.Simultaneous(pinch, pan, doubleTap)}>
      <Animated.View style={[{ width, height }, style]}>
        <Image source={uri} style={StyleSheet.absoluteFill} contentFit="contain" transition={200} />
      </Animated.View>
    </GestureDetector>
  );
}
