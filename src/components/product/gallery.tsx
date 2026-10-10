import { useCallback, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { FlatList, Modal, Pressable, StatusBar, StyleSheet, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { Image } from 'expo-image';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Text } from '@/components/ui';
import { ZoomableImage } from '@/components/product/zoomable-image';
import { useI18n } from '@/i18n';
import { fmt } from '@/i18n/config';
import type { ProductImage } from '@/lib/types';
import { useTheme } from '@/theme';

/** Swipeable product carousel with dots, counter and thumbnails; tap opens a full-screen zoomable viewer. */
export type GalleryHandle = { show: (imageUrl: string) => void };

export function Gallery({ images, name, badge, ref }: { images: ProductImage[]; name: string; badge?: React.ReactNode; ref?: Ref<GalleryHandle> }) {
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const { t } = useI18n();
  const g = t.gallery;
  const [index, setIndex] = useState(0);
  const [viewer, setViewer] = useState(false);
  const list = useRef<FlatList<ProductImage>>(null);
  const height = width * 1.2;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) setIndex(i);
  };
  const goTo = (i: number) => { list.current?.scrollToIndex({ index: i, animated: true }); setIndex(i); };
  // Lets the product page jump to a variant's photo (the cover stays first in the list).
  useImperativeHandle(ref, () => ({
    show: (url: string) => { const i = images.findIndex((img) => img.image_url === url); if (i >= 0) goTo(i); },
  }));

  if (!images.length) return <View style={{ width, height, backgroundColor: colors.surface2 }} />;

  return (
    <View>
      <View style={{ width, height, backgroundColor: colors.surface2 }}>
        <FlatList
          ref={list}
          data={images}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(i) => i.id}
          onMomentumScrollEnd={onScroll}
          onScroll={onScroll}
          scrollEventThrottle={32}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          renderItem={({ item, index: i }) => (
            <Pressable onPress={() => setViewer(true)} accessibilityLabel={`${g.open}: ${fmt(g.imageOf, { n: i + 1, total: images.length })}`}>
              <Image source={item.image_url} style={{ width, height }} contentFit="cover" transition={250} priority={i === 0 ? 'high' : 'normal'} />
            </Pressable>
          )}
        />
        {badge ? <View style={{ position: 'absolute', top: 16, left: 16 }}>{badge}</View> : null}
        <Pressable onPress={() => setViewer(true)} style={styles.expand} accessibilityLabel={g.open}>
          <Feather name="maximize-2" size={16} color="#111" />
        </Pressable>
        {images.length > 1 && (
          <>
            <View style={[styles.dots, { pointerEvents: 'none' }]}>
              {images.map((_, i) => <View key={i} style={[styles.dot, i === index && styles.dotActive]} />)}
            </View>
            <View style={[styles.counter, { pointerEvents: 'none' }]}>
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>{fmt(g.counter, { n: index + 1, total: images.length })}</Text>
            </View>
          </>
        )}
      </View>

      {images.length > 1 && (
        <FlatList
          data={images}
          horizontal
          keyExtractor={(i) => `thumb-${i.id}`}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, gap: 8 }}
          renderItem={({ item, index: i }) => (
            <Pressable onPress={() => goTo(i)} accessibilityLabel={fmt(g.goTo, { n: i + 1 })} accessibilityState={{ selected: i === index }}
              style={[styles.thumb, { borderColor: i === index ? colors.foreground : 'transparent', opacity: i === index ? 1 : 0.6 }]}>
              <Image source={item.image_url} style={StyleSheet.absoluteFill} contentFit="cover" />
            </Pressable>
          )}
        />
      )}

      <Viewer visible={viewer} images={images} name={name} index={index} onIndex={goTo} onClose={() => setViewer(false)} />
    </View>
  );
}

function Viewer({ visible, images, name, index, onIndex, onClose }: { visible: boolean; images: ProductImage[]; name: string; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const g = t.gallery;
  const [current, setCurrent] = useState(index);
  const [zoomed, setZoomed] = useState(false);
  const stageH = height - insets.top - insets.bottom - 150;
  const onShow = useCallback(() => { setCurrent(index); setZoomed(false); }, [index]);
  const caption = images[current]?.alt_text && images[current].alt_text !== name ? images[current].alt_text : '';

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} onShow={onShow} statusBarTranslucent>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0a0a0a', paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <StatusBar barStyle="light-content" />
        <View style={styles.viewerBar}>
          <Text style={{ color: '#fff', fontWeight: '600' }}>{fmt(g.counter, { n: current + 1, total: images.length })}</Text>
          <Pressable onPress={onClose} style={styles.close} accessibilityLabel={g.close}><Feather name="x" size={22} color="#fff" /></Pressable>
        </View>
        <FlatList
          data={images}
          horizontal
          pagingEnabled
          scrollEnabled={!zoomed}
          initialScrollIndex={index}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          keyExtractor={(i) => `v-${i.id}`}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => { const i = Math.round(e.nativeEvent.contentOffset.x / width); setCurrent(i); onIndex(i); }}
          renderItem={({ item }) => (
            <View style={{ width, height: stageH, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
              <ZoomableImage uri={item.image_url} width={width} height={stageH} onZoomChange={setZoomed} />
            </View>
          )}
        />
        <Text style={{ color: 'rgba(255,255,255,0.55)', textAlign: 'center', fontSize: 12, marginTop: 8 }}>{caption || g.hintTouch}</Text>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  expand: { position: 'absolute', top: 14, right: 14, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  dots: { position: 'absolute', bottom: 14, alignSelf: 'center', flexDirection: 'row', gap: 5, backgroundColor: 'rgba(0,0,0,0.25)', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 99 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.6)' },
  dotActive: { width: 18, backgroundColor: '#fff' },
  counter: { position: 'absolute', bottom: 12, right: 14, backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  thumb: { width: 56, height: 70, borderRadius: 10, overflow: 'hidden', borderWidth: 2 },
  viewerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 52 },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
});
