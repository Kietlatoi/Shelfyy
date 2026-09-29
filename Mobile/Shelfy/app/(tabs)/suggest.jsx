import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { suggestionApi } from '../../src/api/suggestionApi';
import { dailyOutfitApi } from '../../src/api/dailyOutfitApi';
import { weatherApi } from '../../src/api/weatherApi';
import { getCurrentLocation } from '../../src/utils/geolocation';
import AppButton from '../../src/components/common/AppButton';
import EmptyState from '../../src/components/common/EmptyState';
import LoadingOverlay from '../../src/components/common/LoadingOverlay';
import { colors } from '../../src/constants/colors';
import { typography } from '../../src/constants/typography';
import { radius, shadows, spacing } from '../../src/constants/spacing';
import { getCategoryLabel } from '../../src/constants/categories';

export default function SuggestScreen() {
  const [suggestion, setSuggestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [wardrobeEmpty, setWardrobeEmpty] = useState(false);
  const [refreshError, setRefreshError] = useState('');

  const fetchLatestSuggestion = useCallback(async () => {
    try {
      const data = await suggestionApi.latestToday();
      // A background refresh must not erase a suggestion already on screen.
      if (data) {
        setSuggestion(data);
        setWardrobeEmpty(false);
      }
    } catch {
      setRefreshError('Chưa thể cập nhật gợi ý. Bạn có thể kéo xuống để thử lại.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { void fetchLatestSuggestion(); }, 0);
    return () => clearTimeout(timer);
  }, [fetchLatestSuggestion]);

  const handleGenerateSuggestion = async () => {
    if (refreshing || generating || confirming) return;
    setGenerating(true);
    setRefreshError('');
    setWardrobeEmpty(false);

    try {
      // Step 1: ensure weather snapshot exists
      try {
        const loc = await getCurrentLocation();
        await weatherApi.createSnapshot({ lat: loc.lat, lon: loc.lon });
      } catch {
        // Continue if weather snapshot creation fails
      }

      // Step 2: call generate suggestion
      const newSuggestion = await suggestionApi.generateToday();
      setSuggestion(newSuggestion);
    } catch (err) {
      if (err.message && err.message.includes('WARDROBE_CONTEXT_EMPTY')) {
        setWardrobeEmpty(true);
      } else {
        Alert.alert('Thông báo', err.message || 'Chưa thể tạo gợi ý lúc này. Vui lòng thử lại sau.');
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleConfirmToday = async () => {
    if (!suggestion) return;

    const items = suggestion.outfit?.items || suggestion.items || [];
    const itemIds = items.map((i) => i.id).filter(Boolean);

    setConfirming(true);
    setRefreshError('');
    try {
      await dailyOutfitApi.confirmToday({
        itemIds,
        suggestionId: suggestion.id,
        name: suggestion.title || 'Outfit hôm nay',
        occasion: suggestion.occasion || 'Hằng ngày',
      });

      Alert.alert(
        'Thành công! 🎉',
        'Đã xác nhận outfit mặc hôm nay và cập nhật vào lịch sử trang phục của bạn.'
      );
      fetchLatestSuggestion();
    } catch (err) {
      Alert.alert('Lỗi', err.message || 'Không thể xác nhận trang phục hôm nay.');
    } finally {
      setConfirming(false);
    }
  };

  const onRefresh = async () => {
    if (refreshing || generating || confirming) return;
    setRefreshing(true);
    setRefreshError('');
    await fetchLatestSuggestion();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Đang tải gợi ý trang phục...</Text>
      </SafeAreaView>
    );
  }

  const items = suggestion?.outfit?.items || suggestion?.items || [];
  const hasItems = items.length > 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <LoadingOverlay visible={generating} message="AI đang phân tích tủ đồ & thời tiết..." />

      {/* Screen Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gợi ý hôm nay</Text>
        <Text style={styles.headerSubtitle}>
          Phối đồ thông minh theo thời tiết và phong cách
        </Text>
      </View>

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
        {refreshError ? <Text style={styles.refreshError}>{refreshError}</Text> : null}
        {wardrobeEmpty ? (
          <EmptyState
            icon="checkroom"
            title="Tủ đồ chưa có trang phục"
            description="Bạn cần thêm các món đồ vào tủ đồ của mình trước để AI có thể phân tích và tạo gợi ý trang phục!"
            actionTitle="Thêm đồ vào tủ"
            onAction={() => router.push('/(tabs)/wardrobe/add')}
          />
        ) : suggestion && hasItems ? (
          <View>
            {/* Suggestion Card */}
            <View style={styles.heroCard}>
              <View style={styles.confidenceRow}>
                <View style={styles.badge}>
                  <MaterialIcons name="auto-awesome" size={14} color={colors.white} />
                  <Text style={styles.badgeText}>AI Stylist</Text>
                </View>

                {suggestion.confidence ? (
                  <Text style={styles.confidenceText}>
                    Độ phù hợp: {Math.round(suggestion.confidence * 100)}%
                  </Text>
                ) : null}
              </View>

              <Text style={styles.suggestionTitle}>
                {suggestion.title || 'Outfit phong cách cho ngày hôm nay'}
              </Text>

              {suggestion.description ? (
                <Text style={styles.suggestionDesc}>{suggestion.description}</Text>
              ) : null}

              {/* Weather reason / tip */}
              {suggestion.weatherReason || suggestion.tips ? (
                <View style={styles.tipBox}>
                  <MaterialIcons name="lightbulb" size={18} color={colors.gold} />
                  <Text style={styles.tipText}>
                    {suggestion.weatherReason || suggestion.tips}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Items Included */}
            <Text style={styles.sectionTitle}>Các món đồ phối hợp ({items.length})</Text>

            <View style={styles.itemsGrid}>
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
                  />
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemCategory}>
                      {getCategoryLabel(item.category)}
                    </Text>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.itemBrand} numberOfLines={1}>
                      {item.brand || 'Khác'}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>

            {/* Action buttons */}
            <View style={styles.actionsBox}>
              <AppButton
                title="Xác nhận mặc hôm nay"
                onPress={handleConfirmToday}
                loading={confirming}
                disabled={refreshing || generating}
                size="lg"
                icon={<Ionicons name="checkmark-circle" size={20} color={colors.white} />}
                style={styles.confirmBtn}
              />

              <AppButton
                title="Tạo gợi ý khác"
                disabled={refreshing || confirming}
                onPress={handleGenerateSuggestion}
                variant="outline"
                size="md"
                icon={<MaterialIcons name="refresh" size={18} color={colors.primary} />}
                style={styles.retryBtn}
              />
            </View>
          </View>
        ) : (
          /* Empty / Initial State */
          <View style={styles.emptyHero}>
            <View style={styles.emptyIconCircle}>
              <MaterialIcons name="auto-awesome" size={44} color={colors.primary} />
            </View>

            <Text style={styles.emptyTitle}>Sẵn sàng cho ngày mới?</Text>
            <Text style={styles.emptyDesc}>
              Shelfy sẽ phân tích thời tiết hôm nay, lịch trình các sự kiện và tủ đồ hiện tại để phối set đồ phù hợp và thoải mái nhất cho bạn.
            </Text>

            <AppButton
              title="Tạo gợi ý hôm nay"
              disabled={refreshing}
              onPress={handleGenerateSuggestion}
              size="lg"
              icon={<MaterialIcons name="auto-awesome" size={20} color={colors.white} />}
              style={styles.generateBtn}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  refreshError: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.md,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    marginTop: spacing.sm,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  headerTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
    fontWeight: '700',
  },
  headerSubtitle: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing['4xl'],
  },
  heroCard: {
    backgroundColor: colors.primaryContainer,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  badgeText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '700',
    marginLeft: 4,
  },
  confidenceText: {
    ...typography.labelSm,
    color: colors.primaryDark,
    fontWeight: '600',
  },
  suggestionTitle: {
    ...typography.titleLg,
    color: colors.onPrimaryContainer,
    fontWeight: '700',
  },
  suggestionDesc: {
    ...typography.bodySm,
    color: colors.primaryDark,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  tipText: {
    ...typography.bodySm,
    color: colors.onSurface,
    flex: 1,
    lineHeight: 18,
  },
  sectionTitle: {
    ...typography.titleMd,
    color: colors.onSurface,
    marginBottom: spacing.md,
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  itemCard: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
    ...shadows.sm,
  },
  itemImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.surfaceVariant,
  },
  itemInfo: {
    padding: spacing.sm + 2,
  },
  itemCategory: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  itemName: {
    ...typography.labelMd,
    color: colors.onSurface,
    marginTop: 2,
  },
  itemBrand: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  actionsBox: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  confirmBtn: {
    width: '100%',
  },
  retryBtn: {
    width: '100%',
  },
  emptyHero: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing['2xl'],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.sm,
    marginTop: spacing.md,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  emptyDesc: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing['2xl'],
  },
  generateBtn: {
    width: '100%',
  },
});
