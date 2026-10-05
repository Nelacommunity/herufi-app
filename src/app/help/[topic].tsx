import { ScrollView, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Text } from '@/components/ui';
import { useI18n } from '@/i18n';
import { HELP_TOPICS } from '@/lib/help';

export default function HelpTopic() {
  const { topic } = useLocalSearchParams<{ topic: string }>();
  const { locale } = useI18n();
  const found = HELP_TOPICS.find((x) => x.slug === topic);
  if (!found) return null;
  const c = found[locale];
  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: 40 }}>
      <Stack.Screen options={{ title: c.title }} />
      <Text tone="muted" style={{ fontSize: 16 }}>{c.summary}</Text>
      {c.sections.map((s) => (
        <View key={s.heading} style={{ gap: 8 }}>
          <Text variant="h3">{s.heading}</Text>
          {s.body.map((p) => <Text key={p} tone="muted" style={{ lineHeight: 23 }}>{p}</Text>)}
        </View>
      ))}
    </ScrollView>
  );
}
