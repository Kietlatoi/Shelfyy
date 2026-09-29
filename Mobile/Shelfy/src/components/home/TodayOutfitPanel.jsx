import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { dailyOutfitApi } from '../../api/dailyOutfitApi';
import AppButton from '../common/AppButton';
import { colors } from '../../constants/colors';
import { typography } from '../../constants/typography';
import { radius, shadows, spacing } from '../../constants/spacing';
import { formatDate } from '../../utils/format';

export default function TodayOutfitPanel() {
  const [todayOutfit, setTodayOutfit] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchTodayOutfit = useCallback(async () => {
    try {
      const data = await dailyOutfitApi.getToday();
      setTodayOutfit(data);
    } catch {
      setTodayOutfit(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { void fetchTodayOutfit(); }, 0);
    return () => clearTimeout(timer);
  }, [fetchTodayOutfit]);

  if (loading) {
    return (
      <View style={[styles.card, styles.loadingCard]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  const items = todayOutfit?.outfit?.items || todayOutfit?.items || [];
  const hasOutfit = items.length > 0;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Ionicons name="shirt" size={20} color={colors.primary} />
          <Text style={styles.title}>Outfit hôm nay</Text>
        </View>

        {hasOutfit && (
          <Pressable
            onPress={() => router.push('/(tabs)/suggest')}
            style={styles.changeBtn}
          >
            <Text style={styles.changeBtnText}>Đổi outfit</Text>
          </Pressable>
        )}
      </View>

      {hasOutfit ? (
        <View>
          <Text style={styles.outfitName}>
            {todayOutfit?.outfit?.name || `Trang phục ngày ${formatDate(new Date())}`}
          </Text>
          <Text style={styles.itemCountText}>Bao gồm {items.length} món đồ</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.itemsScroll}
          >
            {items.map((item, idx) => (
              <Pressable
                key={item.id || idx}
                onPress={() => router.push(`/(tabs)/wardrobe/${item.id}`)}
                style={styles.itemCard}
              >
                <Image
                  source={{ uri: item.imageUrl || item.thumbnailUrl }}
                  style={styles.itemImage}
                  contentFit="cover"
                  transition={200}
                />
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.name || 'Món đồ'}
                </Text>
                <Text style={styles.itemCategory}>{item.category || ''}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <MaterialIcons name="auto-awesome" size={32} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Bạn chưa chọn outfit hôm nay</Text>
          <Text style={styles.emptyDesc}>
            Hãy để AI gợi ý trang phục hoàn hảo theo thời tiết và lịch trình của bạn.
          </Text>

          <View style={styles.actionButtonsRow}>
            <AppButton
              title="Xem gợi ý AI"
              onPress={() => router.push('/(tabs)/suggest')}
              size="md"
              icon={<MaterialIcons name="auto-awesome" size={18} color={colors.white} />}
              style={styles.suggestBtn}
            />
            <AppButton
              title="Mở tủ đồ"
              onPress={() => router.push('/(tabs)/wardrobe')}
              variant="outline"
              size="md"
              icon={<Ionicons name="shirt-outline" size={18} color={colors.primary} />}
              style={styles.wardrobeBtn}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.sm,
    marginBottom: spacing.lg,
  },
  loadingCard: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    ...typography.titleMd,
    color: colors.onSurface,
    marginLeft: spacing.xs,
  },
  changeBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  changeBtnText: {
    ...typography.labelSm,
    color: colors.primary,
  },
  outfitName: {
    ...typography.titleSm,
    color: colors.onSurface,
  },
  itemCountText: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.md,
  },
  itemsScroll: {
    paddingVertical: spacing.xs,
  },
  itemCard: {
    width: 90,
    marginRight: spacing.md,
    alignItems: 'center',
  },
  itemImage: {
    width: 90,
    height: 100,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceVariant,
    marginBottom: spacing.xs,
  },
  itemName: {
    ...typography.labelSm,
    color: colors.onSurface,
    textAlign: 'center',
  },
  itemCategory: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    ...typography.titleMd,
    color: colors.onSurface,
    marginBottom: spacing.xs,
  },
  emptyDesc: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
    maxWidth: 260,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  suggestBtn: {
    flex: 1,
  },
  wardrobeBtn: {
    flex: 1,
  },
});
