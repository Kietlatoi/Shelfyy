import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import WeatherCard from '../../src/components/home/WeatherCard';
import TodayOutfitPanel from '../../src/components/home/TodayOutfitPanel';
import Avatar from '../../src/components/common/Avatar';
import { colors } from '../../src/constants/colors';
import { typography } from '../../src/constants/typography';
import { spacing, radius } from '../../src/constants/spacing';

export default function HomeScreen() {
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshKey((prev) => prev + 1);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.wordmark}>shelfy<Text style={styles.wordmarkStar}> ✳</Text></Text>
            <Text style={styles.greeting} numberOfLines={1}>
              Xin chào, {user?.fullName || user?.email?.split('@')[0] || 'bạn'}.
            </Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Mở hồ sơ cá nhân" onPress={() => router.push('/(tabs)/profile')}>
            <Avatar uri={user?.avatarUrl} name={user?.fullName || user?.email} size={44} />
          </Pressable>
        </View>

        <View style={styles.intro}>
          <Text style={styles.eyebrow}>MỘT NGÀY MỚI. MỘT CHÚT CẢM HỨNG.</Text>
          <Text accessibilityRole="header" style={styles.headline}>Tủ đồ quen.{'\n'}<Text style={styles.headlineAccent}>Phong cách mới.</Text></Text>
        </View>

        <WeatherCard key={`weather-${refreshKey}`} />
        <TodayOutfitPanel key={`outfit-${refreshKey}`} />

        <Pressable accessibilityRole="button" accessibilityLabel="Mở phòng thử đồ AI" onPress={() => router.push('/(tabs)/trial')} style={styles.heroBanner}>
          <View style={styles.heroContent}>
            <Text style={styles.heroBadgeText}>PHÒNG THỬ AI</Text>
            <Text style={styles.heroTitle}>Thêm một cách{'\n'}để là chính mình.</Text>
            <Text style={styles.heroDesc}>Thử trang phục trên ảnh của bạn.</Text>
            <View style={styles.heroLink}>
              <Text style={styles.heroLinkText}>Khám phá ngay</Text>
              <MaterialIcons name="north-east" size={18} color={colors.accent} />
            </View>
          </View>
          <View style={styles.heroIconCircle}>
            <MaterialIcons name="checkroom" size={46} color={colors.accent} />
          </View>
        </Pressable>

        <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/wardrobe')} style={styles.wardrobeLink}>
          <View style={styles.wardrobeIcon}><MaterialIcons name="inventory-2" size={22} color={colors.primary} /></View>
          <View style={styles.headerCopy}>
            <Text style={styles.linkTitle}>Mở tủ đồ của bạn</Text>
            <Text style={styles.linkDesc}>Những món quen, luôn ở bên mình.</Text>
          </View>
          <MaterialIcons name="arrow-forward" size={20} color={colors.primary} />
        </Pressable>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.xl, paddingBottom: spacing['3xl'] },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing['2xl'] },
  headerCopy: { flex: 1, minWidth: 0 },
  wordmark: { ...typography.displayLg, fontSize: 30, letterSpacing: -1.5, color: colors.onSurface },
  wordmarkStar: { color: colors.secondary, fontSize: 24 },
  greeting: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 2 },
  intro: { marginBottom: spacing.xl },
  eyebrow: { ...typography.eyebrow, color: colors.secondary, marginBottom: spacing.sm },
  headline: { ...typography.editorialLg, color: colors.onSurface },
  headlineAccent: { color: colors.primaryLight },
  heroBanner: { backgroundColor: colors.primaryDark, borderRadius: radius.xl, padding: spacing.xl, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  heroContent: { flex: 1, minWidth: 0 },
  heroBadgeText: { ...typography.eyebrow, color: colors.accent, marginBottom: spacing.md },
  heroTitle: { ...typography.editorialMd, fontSize: 24, lineHeight: 34, color: colors.white },
  heroDesc: { ...typography.bodySm, color: colors.primaryContainer, marginTop: spacing.sm, lineHeight: 20 },
  heroLink: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg },
  heroLinkText: { ...typography.labelSm, color: colors.accent },
  heroIconCircle: { width: 70, height: 100, borderRadius: 40, borderWidth: 1, borderColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  wardrobeLink: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderBottomWidth: 1, borderColor: colors.borderMedium, paddingVertical: spacing.lg },
  wardrobeIcon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.primaryContainer, alignItems: 'center', justifyContent: 'center' },
  linkTitle: { ...typography.titleSm, color: colors.onSurface },
  linkDesc: { ...typography.caption, color: colors.onSurfaceVariant, marginTop: spacing.xs },
});
