import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { wardrobeApi } from '../../../src/api/wardrobeApi';
import { wardrobePreferenceApi } from '../../../src/api/wardrobePreferenceApi';
import { dailyOutfitApi } from '../../../src/api/dailyOutfitApi';
import AppButton from '../../../src/components/common/AppButton';
import Badge from '../../../src/components/common/Badge';
import { colors } from '../../../src/constants/colors';
import { typography } from '../../../src/constants/typography';
import { radius, shadows, spacing } from '../../../src/constants/spacing';
import { getCategoryLabel } from '../../../src/constants/categories';
import { ITEM_STATUS_OPTIONS, statusOptionFor } from '../../../src/constants/itemStatus';
import { formatDate, formatVND } from '../../../src/utils/format';

async function loadWardrobeItemDetail(id) {
  const item = await wardrobeApi.getItem(id);
  let favorite = Boolean(item.favorite);
  let status = item.status || 'IN_USE';
  try {
    const preferences = await wardrobePreferenceApi.getPreferences([id]);
    if (Array.isArray(preferences) && preferences.length > 0) {
      favorite = Boolean(preferences[0].favorite);
      status = preferences[0].status || status;
    }
  } catch {
    // Keep the canonical Firestore item fields when preference lookup fails.
  }
  return { item, favorite, status };
}

export default function WardrobeItemDetailScreen() {
  const { id } = useLocalSearchParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [favorite, setFavorite] = useState(false);
  const [status, setStatus] = useState('IN_USE');
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchItemDetail = async () => {
    try {
      setLoading(true);
      const result = await loadWardrobeItemDetail(id);
      setItem(result.item);
      setFavorite(result.favorite);
      setStatus(result.status);
    } catch (err) {
      Alert.alert('Lỗi', err.message || 'Không thể tải chi tiết món đồ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return undefined;
    let isMounted = true;
    loadWardrobeItemDetail(id)
      .then((result) => {
        if (!isMounted) return;
        setItem(result.item);
        setFavorite(result.favorite);
        setStatus(result.status);
      })
      .catch((err) => { if (isMounted) Alert.alert('Lỗi', err.message || 'Không thể tải chi tiết món đồ'); })
      .finally(() => { if (isMounted) setLoading(false); });
    return () => { isMounted = false; };
  }, [id]);

  const handleToggleFavorite = async () => {
    const nextFav = !favorite;
    setFavorite(nextFav);
    try {
      await wardrobePreferenceApi.updatePreference(id, { favorite: nextFav });
    } catch {
      setFavorite(!nextFav);
    }
  };

  const handleChangeStatus = async (newStatus) => {
    setStatus(newStatus);
    setStatusModalVisible(false);
    try {
      await wardrobePreferenceApi.updatePreference(id, { status: newStatus });
    } catch (err) {
      Alert.alert('Lỗi', err.message || 'Không thể cập nhật trạng thái');
    }
  };

  const handleWearToday = async () => {
    setActionLoading(true);
    try {
      await dailyOutfitApi.confirmToday({
        itemIds: [String(id)],
        name: `Mặc ${item.name}`,
        occasion: 'Hằng ngày',
      });
      Alert.alert('Thành công', 'Đã lưu món đồ vào trang phục mặc hôm nay!');
      fetchItemDetail();
    } catch (err) {
      Alert.alert('Lỗi', err.message || 'Không thể lưu trang phục hôm nay');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Xóa món đồ',
      `Bạn có chắc chắn muốn xóa "${item.name}" khỏi tủ đồ không?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await wardrobeApi.deleteItem(id);
              router.back();
            } catch (err) {
              Alert.alert('Lỗi', err.message || 'Không thể xóa món đồ');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!item) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.errorText}>Không tìm thấy thông tin món đồ.</Text>
        <AppButton
          title="Quay lại"
          onPress={() => router.back()}
          style={styles.backBtn}
        />
      </SafeAreaView>
    );
  }

  const currentStatusObj = statusOptionFor(status);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header bar */}
      <View style={styles.navBar}>
        <Pressable onPress={() => router.back()} style={styles.navBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
        </Pressable>

        <Text style={styles.navTitle} numberOfLines={1}>
          Chi tiết món đồ
        </Text>

        <Pressable onPress={handleToggleFavorite} style={styles.navBtn}>
          <MaterialIcons
            name={favorite ? 'favorite' : 'favorite-border'}
            size={24}
            color={favorite ? colors.error : colors.onSurface}
          />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Large Item Image */}
        <View style={styles.imageCard}>
          <Image
            source={{ uri: item.imageUrl || item.thumbnailUrl }}
            style={styles.mainImage}
            contentFit="contain"
            transition={300}
          />
        </View>

        {/* Title & Brand */}
        <View style={styles.infoCard}>
          <Text style={styles.brandText}>{item.brand || 'Khác'}</Text>
          <Text style={styles.nameText}>{item.name}</Text>

          {/* Chips Row */}
          <View style={styles.chipsRow}>
            <Badge label={getCategoryLabel(item.category)} tone="primary" />
            {item.size ? <Badge label={`Size ${item.size}`} tone="neutral" /> : null}
            {item.material ? <Badge label={item.material} tone="neutral" /> : null}
            {item.season ? <Badge label={item.season} tone="secondary" /> : null}
          </View>

          {/* Status selector row */}
          <Pressable
            onPress={() => setStatusModalVisible(true)}
            style={styles.statusRow}
          >
            <Text style={styles.statusLabel}>Trạng thái sử dụng:</Text>
            <View style={[styles.statusPill, { backgroundColor: currentStatusObj.bgColor }]}>
              <Text style={[styles.statusPillText, { color: currentStatusObj.color }]}>
                {currentStatusObj.label} ▾
              </Text>
            </View>
          </Pressable>

          {/* Attributes List */}
          <View style={styles.attrSection}>
            <Text style={styles.sectionHeader}>Thông số chi tiết</Text>

            <View style={styles.attrRow}>
              <Text style={styles.attrKey}>Màu sắc</Text>
              <Text style={styles.attrVal}>{item.color || 'Chưa rõ'}</Text>
            </View>

            <View style={styles.attrRow}>
              <Text style={styles.attrKey}>Họa tiết</Text>
              <Text style={styles.attrVal}>{item.pattern || 'Trơn'}</Text>
            </View>

            <View style={styles.attrRow}>
              <Text style={styles.attrKey}>Số lần đã mặc</Text>
              <Text style={styles.attrVal}>{item.wearCount || 0} lần</Text>
            </View>

            <View style={styles.attrRow}>
              <Text style={styles.attrKey}>Lần mặc gần nhất</Text>
              <Text style={styles.attrVal}>
                {item.lastWornAt ? formatDate(item.lastWornAt) : 'Chưa từng mặc'}
              </Text>
            </View>
          </View>

          {/* Purchase Details */}
          {(item.purchasePrice || item.purchaseDate) && (
            <View style={styles.attrSection}>
              <Text style={styles.sectionHeader}>Thông tin mua sắm</Text>

              {item.purchasePrice ? (
                <View style={styles.attrRow}>
                  <Text style={styles.attrKey}>Giá mua</Text>
                  <Text style={[styles.attrVal, styles.priceVal]}>
                    {formatVND(item.purchasePrice)}
                  </Text>
                </View>
              ) : null}

              {item.purchaseDate ? (
                <View style={styles.attrRow}>
                  <Text style={styles.attrKey}>Ngày mua</Text>
                  <Text style={styles.attrVal}>{formatDate(item.purchaseDate)}</Text>
                </View>
              ) : null}
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.actionContainer}>
            <AppButton
              title="Chọn mặc hôm nay"
              onPress={handleWearToday}
              loading={actionLoading}
              icon={<Ionicons name="checkmark-circle-outline" size={20} color={colors.white} />}
              size="lg"
              style={styles.wearBtn}
            />

            <View style={styles.secondaryActionsRow}>
              <AppButton
                title="Chỉnh sửa"
                onPress={() => router.push(`/(tabs)/wardrobe/edit/${item.id}`)}
                variant="outline"
                size="md"
                icon={<MaterialIcons name="edit" size={18} color={colors.primary} />}
                style={styles.editBtn}
              />
              <AppButton
                title="Xóa món đồ"
                onPress={handleDelete}
                variant="danger"
                size="md"
                icon={<MaterialIcons name="delete-outline" size={18} color={colors.white} />}
                style={styles.deleteBtn}
              />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Status Selection Modal */}
      <Modal visible={statusModalVisible} transparent animationType="fade">
        <Pressable
          onPress={() => setStatusModalVisible(false)}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Chọn trạng thái sử dụng</Text>

            {ITEM_STATUS_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => handleChangeStatus(opt.value)}
                style={[
                  styles.modalOption,
                  status === opt.value && styles.modalOptionActive,
                ]}
              >
                <View style={[styles.optionDot, { backgroundColor: opt.color }]} />
                <View style={styles.optionContent}>
                  <Text style={styles.optionLabel}>{opt.label}</Text>
                  <Text style={styles.optionDesc}>{opt.description}</Text>
                </View>
                {status === opt.value && (
                  <MaterialIcons name="check" size={20} color={colors.primary} />
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    ...typography.bodyLg,
    color: colors.error,
    marginBottom: spacing.lg,
  },
  backBtn: {
    minWidth: 140,
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
  scrollContent: {
    paddingBottom: spacing['4xl'],
  },
  imageCard: {
    width: '100%',
    height: 360,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  infoCard: {
    padding: spacing.lg,
  },
  brandText: {
    ...typography.labelSm,
    color: colors.primary,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  nameText: {
    ...typography.headlineMd,
    color: colors.onSurface,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
    marginBottom: spacing.lg,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.xl,
  },
  statusLabel: {
    ...typography.labelMd,
    color: colors.onSurfaceMedium,
  },
  statusPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  statusPillText: {
    ...typography.labelSm,
    fontWeight: '700',
  },
  attrSection: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    ...typography.titleSm,
    color: colors.onSurface,
    marginBottom: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceVariant,
  },
  attrRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs + 2,
  },
  attrKey: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
  },
  attrVal: {
    ...typography.bodySm,
    color: colors.onSurface,
    fontWeight: '500',
  },
  priceVal: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  actionContainer: {
    marginTop: spacing.md,
    gap: spacing.md,
  },
  wearBtn: {
    width: '100%',
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  editBtn: {
    flex: 1,
  },
  deleteBtn: {
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    ...shadows.lg,
  },
  modalTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
    marginBottom: spacing.lg,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
  },
  modalOptionActive: {
    backgroundColor: colors.surfaceVariant,
  },
  optionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.md,
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    ...typography.labelMd,
    color: colors.onSurface,
  },
  optionDesc: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
});
