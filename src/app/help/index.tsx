import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Button, Text } from '@/components/ui';
import { useI18n } from '@/i18n';
import { SITE } from '@/lib/constants';
import { fillBusiness } from '@/lib/business';
import { HELP_TOPICS, type HelpTopic } from '@/lib/help';
import { radius, useTheme } from '@/theme';

export default function Help() {
  const { colors } = useTheme();
  const { t, locale } = useI18n();
  const card = (topic: HelpTopic) => (
    <Pressable key={topic.slug} onPress={() => router.push({ pathname: '/help/[topic]', params: { topic: topic.slug } })} style={[styles.card, { borderColor: colors.border }]}>
      <View style={{ flex: 1 }}>
        <Text variant="label">{fillBusiness(topic[locale].title, locale)}</Text>
        <Text variant="small" tone="muted">{fillBusiness(topic[locale].summary, locale)}</Text>
      </View>
      <Feather name="chevron-right" size={18} color={colors.subtle} />
    </Pressable>
  );
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
      <Text variant="title">{t.help.title}</Text>
      <Text tone="muted">{t.help.desc}</Text>
      {HELP_TOPICS.filter((x) => x.kind !== 'policy').map(card)}
      <Text variant="h3" style={{ marginTop: 12 }}>{t.help.policies}</Text>
      <Text variant="small" tone="muted">{t.help.policiesDesc}</Text>
      {HELP_TOPICS.filter((x) => x.kind === 'policy').map(card)}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
        <Button style={{ flex: 1 }} icon="message-circle" title="WhatsApp" onPress={() => Linking.openURL(`https://wa.me/${SITE.phone.replace(/\D/g, '')}`)} />
        <Button style={{ flex: 1 }} variant="secondary" icon="mail" title="Email" onPress={() => Linking.openURL(`mailto:${SITE.email}`)} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: radius.lg, padding: 16 },
});
