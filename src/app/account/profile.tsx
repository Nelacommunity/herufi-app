import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { Button, Input, Text } from '@/components/ui';
import { RequireUser } from '@/components/shop/require-user';
import { useI18n } from '@/i18n';
import { initials } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { useAsync } from '@/lib/use-async';
import { useStore } from '@/providers/store';
import { useToast } from '@/providers/toast';
import { useTheme } from '@/theme';

type ProfileRow = { full_name: string | null; phone: string | null; avatar_url: string | null };

function Profile() {
  const { user } = useStore();
  const data = useAsync(async () => (await supabase.from('profiles').select('full_name, phone, avatar_url').eq('user_id', user!.id).maybeSingle()).data as ProfileRow | null, [user?.id]);
  if (data.loading) return <ActivityIndicator style={{ marginTop: 40 }} />;
  return <ProfileForm initial={data.data ?? { full_name: user?.name ?? '', phone: '', avatar_url: null }} />;
}

function ProfileForm({ initial }: { initial: ProfileRow }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const ac = t.account;
  const { user, refreshUser } = useStore();
  const toast = useToast();
  const [name, setName] = useState(initial.full_name ?? '');
  const [phone, setPhone] = useState(initial.phone ?? '');
  const [avatar, setAvatar] = useState<string | null>(initial.avatar_url);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function pickPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (res.canceled || !res.assets[0]) return;
    const asset = res.assets[0];
    setUploading(true);
    try {
      const ext = (asset.mimeType ?? 'image/jpeg').split('/')[1] ?? 'jpeg';
      const body = await (await fetch(asset.uri)).arrayBuffer();
      // Avatars live under avatars/<user_id>/… (enforced by storage RLS).
      const path = `${user!.id}/avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('avatars').upload(path, body, { contentType: asset.mimeType ?? 'image/jpeg' });
      if (error) throw error;
      const url = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
      await supabase.from('profiles').update({ avatar_url: url }).eq('user_id', user!.id);
      setAvatar(url);
      toast({ tone: 'success', title: ac.photoUpdated });
    } catch (e) {
      toast({ tone: 'error', title: ac.uploadFailed, description: (e as Error).message });
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (name.trim().length < 2) return toast({ tone: 'error', title: t.checkout.errors.name });
    setBusy(true);
    const { error } = await supabase.from('profiles').update({ full_name: name.trim(), phone: phone.trim() || null }).eq('user_id', user!.id);
    await supabase.auth.updateUser({ data: { full_name: name.trim() } });
    setBusy(false);
    if (error) return toast({ tone: 'error', title: t.errors.generic });
    await refreshUser();
    toast({ tone: 'success', title: ac.profileSaved });
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
      <Pressable onPress={pickPhoto} style={{ alignSelf: 'center', alignItems: 'center', gap: 8 }} accessibilityLabel={ac.changePhotoAria}>
        <View style={[styles.avatar, { backgroundColor: colors.foreground }]}>
          {avatar ? <Image source={avatar} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Text style={{ color: colors.background, fontSize: 30, fontWeight: '700' }}>{initials(name, user?.email)}</Text>}
          <View style={styles.cam}>{uploading ? <ActivityIndicator color="#fff" /> : <Feather name="camera" size={16} color="#fff" />}</View>
        </View>
        <Text variant="label">{ac.changePhoto}</Text>
      </Pressable>
      <Input label={t.checkout.fullName} value={name} onChangeText={setName} autoComplete="name" />
      <Input label={ac.phone} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="07XX XXX XXX" />
      <Input label={t.auth.email} value={user?.email ?? ''} editable={false} hint={ac.emailHint} style={{ opacity: 0.6 }} />
      <Button title={t.common.saveChanges} loading={busy} onPress={save} />
    </ScrollView>
  );
}

export default function ProfileScreen() {
  return <RequireUser><Profile /></RequireUser>;
}

const styles = StyleSheet.create({
  avatar: { width: 104, height: 104, borderRadius: 52, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  cam: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 30, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
});
