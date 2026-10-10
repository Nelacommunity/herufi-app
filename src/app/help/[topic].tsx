import { Pressable, ScrollView, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Text } from '@/components/ui';
import { useI18n } from '@/i18n';
import { companyDetails, fillBusiness } from '@/lib/business';
import { formatDate } from '@/lib/format';
import { HELP_TOPICS } from '@/lib/help';
import { radius, useTheme } from '@/theme';

/** Paragraphs, with runs of "- " lines rendered as bullets. */
function Body({ lines }: { lines: string[] }) {
  return (
    <View style={{ gap: 8 }}>
      {lines.map((p) => p.startsWith('- ') ? (
        <View key={p} style={{ flexDirection: 'row', gap: 10, paddingLeft: 4 }}>
          <Text tone="subtle" style={{ lineHeight: 23 }}>•</Text>
          <Text tone="muted" style={{ flex: 1, lineHeight: 23 }}>{p.slice(2)}</Text>
        </View>
      ) : <Text key={p} tone="muted" style={{ lineHeight: 23 }}>{p}</Text>)}
    </View>
  );
}

export default function HelpTopic() {
  const { topic } = useLocalSearchParams<{ topic: string }>();
  const { t, locale } = useI18n();
  const { colors } = useTheme();
  const found = HELP_TOPICS.find((x) => x.slug === topic);
  if (!found) return null;
  const fill = (s: string) => fillBusiness(s, locale);
  const c = found[locale];
  const sections = c.sections.map((s) => ({ heading: fill(s.heading), body: s.body.map(fill) }));
  if (found.slug === 'contact' || found.slug === 'terms') sections.push({ heading: t.help.company, body: companyDetails(locale) });
  const policies = HELP_TOPICS.filter((x) => x.kind === 'policy' && x.slug !== found.slug);

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 40 }}>
      <Stack.Screen options={{ title: fill(c.title) }} />
      <View style={{ gap: 6 }}>
        <Text tone="muted" style={{ fontSize: 16, lineHeight: 23 }}>{fill(c.summary)}</Text>
        {found.updated ? <Text variant="small" tone="subtle">{t.help.updated.replace('{date}', formatDate(found.updated, locale, 'long'))}</Text> : null}
      </View>
      {sections.map((s) => (
        <View key={s.heading} style={{ gap: 8 }}>
          <Text variant="h3">{s.heading}</Text>
          <Body lines={s.body} />
        </View>
      ))}
      {(found.kind === 'policy' || found.slug === 'returns') && (
        <View style={{ gap: 10, marginTop: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border }}>
          <Text variant="label">{t.help.related}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {policies.map((x) => (
              <Pressable key={x.slug} onPress={() => router.push({ pathname: '/help/[topic]', params: { topic: x.slug } })}
                style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border }}>
                <Text variant="small">{fill(x[locale].title)}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}
