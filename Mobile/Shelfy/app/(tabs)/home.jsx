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
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import WeatherCard from '../../src/components/home/WeatherCard';
import CalendarCard from '../../src/components/home/CalendarCard';
import TodayOutfitPanel from '../../src/components/home/TodayOutfitPanel';
import Avatar from '../../src/components/common/Avatar';
import { colors } from '../../src/constants/colors';
import { typography } from '../../src/constants/typography';
import { spacing, radius, shadows } from '../../src/constants/spacing';

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
        {/* Top Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Xin chào 👋</Text>
            <Text style={styles.userName} numberOfLines={1}>
              {user?.fullName || user?.email?.split('@')[0] || 'Bạn'}
            </Text>
          </View>

          <Pressable onPress={() => router.push('/(tabs)/profile')}>
            <Avatar
              uri={user?.avatarUrl}
              name={user?.fullName || user?.email}
              size={46}
            />
          </Pressable>
        </View>

        {/* Quick AI Try-on Banner */}
        <Pressable
          onPress={() => router.push('/(tabs)/trial')}
          style={styles.heroBanner}
        >
          <View style={styles.heroContent}>
            <View style={styles.heroBadge}>
              <MaterialIcons name="auto-awesome" size={14} color={colors.white} />
              <Text style={styles.heroBadgeText}>AI Try-On</Text>
            </View>
            <Text style={styles.heroTitle}>Thử đồ ảo thông minh</Text>
            <Text style={styles.heroDesc}>
              Xem trước trang phục trên ảnh của bạn chỉ sau vài giây.
            </Text>
          </View>
          <View style={styles.heroIconCircle}>
            <MaterialIcons name="camera-alt" size={28} color={colors.primary} />
          </View>
        </Pressable>

        {/* Weather Card */}
        <WeatherCard key={`weather-${refreshKey}`} />

        {/* Today's Outfit */}
        <TodayOutfitPanel key={`outfit-${refreshKey}`} />

        {/* Calendar Schedule */}
        <CalendarCard key={`calendar-${refreshKey}`} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  greeting: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
  },
  userName: {
    ...typography.headlineMd,
    color: colors.onSurface,
    fontWeight: '700',
  },
  heroBanner: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    ...shadows.glow(colors.primary),
  },
  heroContent: {
    flex: 1,
    paddingRight: spacing.md,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
    marginBottom: spacing.xs,
  },
  heroBadgeText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '700',
    marginLeft: 4,
  },
  heroTitle: {
    ...typography.titleLg,
    color: colors.white,
    fontWeight: '700',
  },
  heroDesc: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
    lineHeight: 16,
  },
  heroIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
