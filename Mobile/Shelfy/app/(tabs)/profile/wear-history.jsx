import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { dailyOutfitApi } from '../../../src/api/dailyOutfitApi';
import EmptyState from '../../../src/components/common/EmptyState';
import { colors } from '../../../src/constants/colors';
import { typography } from '../../../src/constants/typography';
import { radius, shadows, spacing } from '../../../src/constants/spacing';
import { formatDate, formatRelativeDate } from '../../../src/utils/format';
import { getCategoryLabel } from '../../../src/constants/categories';

export default function WearHistoryScreen() {
  const [history, setHistory] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = useCallback(async (pageToFetch = 0) => {
    try {
      const res = await dailyOutfitApi.list({ page: pageToFetch, size: 10 });
      const items = res?.content || res?.items || (Array.isArray(res) ? res : []);
      const totalP = res?.totalPages ?? 1;

      setTotalPages(totalP);
      if (pageToFetch === 0) {
        setHistory(items);
      } else {
        setHistory((prev) => [...prev, ...items]);
      }
      setPage(pageToFetch);
    } catch (err) {
      console.warn('Error loading wear history:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { void fetchHistory(0); }, 0);
    return () => clearTimeout(timer);
  }, [fetchHistory]);

  const handleLoadMore = () => {
    if (!loadingMore && page + 1 < totalPages) {
      setLoadingMore(true);
      fetchHistory(page + 1);
    }
  };

  const renderHistoryCard = ({ item }) => {
    const outfit = item.outfit || item;
    const outfitItems = outfit.items || [];
    const wornDate = item.wornDate || item.date || item.confirmedAt;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.dateRow}>
            <View style={styles.dot} />
            <Text style={styles.dateText}>{formatDate(wornDate)}</Text>
            <Text style={styles.relativeDateText}>({formatRelativeDate(wornDate)})</Text>
          </View>
          {outfit.occasion ? (
            <View style={styles.occasionBadge}>
              <Text style={styles.occasionText}>{outfit.occasion}</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.outfitName}>
          {outfit.name || `Outfit ngày ${formatDate(wornDate)}`}
        </Text>

        {outfitItems.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.itemsScroll}
          >
            {outfitItems.map((clothing, idx) => (
              <Pressable
                key={clothing.id || idx}
                onPress={() => clothing.id && router.push(`/(tabs)/wardrobe/${clothing.id}`)}
                style={styles.itemThumbCard}
              >
                <Image
                  source={{ uri: clothing.imageUrl || clothing.thumbnailUrl }}
                  style={styles.itemThumb}
                  contentFit="cover"
                />
                <Text style={styles.itemThumbName} numberOfLines={1}>
                  {clothing.name || 'Món đồ'}
                </Text>
                <Text style={styles.itemThumbCat}>
                  {getCategoryLabel(clothing.category)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <Text style={styles.noItemsText}>Không có chi tiết món đồ</Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.navBar}>
        <Pressable onPress={() => router.back()} style={styles.navBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.navTitle}>Lịch sử trang phục</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading && history.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Đang tải lịch sử trang phục...</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item, index) => String(item.id || index)}
          renderItem={renderHistoryCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchHistory(0);
              }}
              tintColor={colors.primary}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            !loading ? (
              <EmptyState
                icon="history"
                title="Chưa có lịch sử trang phục"
                description="Mỗi khi bạn chọn hoặc xác nhận outfit mặc trong ngày, lịch sử sẽ được lưu trữ tự động tại đây."
                actionTitle="Xem gợi ý hôm nay"
                onAction={() => router.push('/(tabs)/suggest')}
              />
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  navBtn: {
    padding: spacing.xs,
  },
  navTitle: {
    ...typography.titleMd,
    color: colors.onSurface,
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing['4xl'],
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.sm,
    marginBottom: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginRight: spacing.xs + 2,
  },
  dateText: {
    ...typography.titleSm,
    color: colors.onSurface,
  },
  relativeDateText: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
    marginLeft: spacing.xs,
  },
  occasionBadge: {
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  occasionText: {
    ...typography.caption,
    color: colors.primaryDark,
    fontWeight: '600',
  },
  outfitName: {
    ...typography.bodyMd,
    color: colors.onSurfaceMedium,
    marginBottom: spacing.md,
  },
  itemsScroll: {
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  itemThumbCard: {
    width: 84,
    alignItems: 'center',
  },
  itemThumb: {
    width: 84,
    height: 94,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceVariant,
    marginBottom: 4,
  },
  itemThumbName: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.onSurface,
    textAlign: 'center',
  },
  itemThumbCat: {
    ...typography.caption,
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  noItemsText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontStyle: 'italic',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    marginTop: spacing.sm,
  },
  footerLoader: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
});
