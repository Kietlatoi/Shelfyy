import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { trialApi } from '../../src/api/trialApi';
import { wardrobeApi } from '../../src/api/wardrobeApi';
import { pageContent } from '../../src/api/apiClient';
import AppButton from '../../src/components/common/AppButton';
import LoadingOverlay from '../../src/components/common/LoadingOverlay';
import TrialHistoryCard from '../../src/components/common/TrialHistoryCard';
import { useTrialHistory } from '../../src/hooks/useTrialHistory';
import { isTrialPending } from '../../src/utils/trialHistory';
import { colors } from '../../src/constants/colors';
import { typography } from '../../src/constants/typography';
import { radius, shadows, spacing } from '../../src/constants/spacing';
import { getCategoryLabel } from '../../src/constants/categories';

export default function TrialScreen() {
  const [personImageUri, setPersonImageUri] = useState(null);
  const [personBase64, setPersonBase64] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [wardrobeItems, setWardrobeItems] = useState([]);
  const [itemPickerVisible, setItemPickerVisible] = useState(false);
  const { history, historyError, refreshHistory: loadHistory } = useTrialHistory();

  // Job state
  const [processing, setProcessing] = useState(false);
  const [jobStatus, setJobStatus] = useState('');
  const [result, setResult] = useState(null);
  const pollIntervalRef = useRef(null);

  // Load wardrobe & history on mount
  useEffect(() => {
    loadWardrobe();

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const loadWardrobe = async () => {
    try {
      const res = await wardrobeApi.getItems({ size: 50 });
      setWardrobeItems(pageContent(res));
    } catch {
      // Ignore
    }
  };

  const pickPersonImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setPersonImageUri(asset.uri);
        setPersonBase64(`data:image/jpeg;base64,${asset.base64}`);
      }
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể chọn ảnh: ' + err.message);
    }
  };

  const takePersonPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Cần quyền camera', 'Vui lòng cấp quyền camera để chụp ảnh chân dung.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setPersonImageUri(asset.uri);
        setPersonBase64(`data:image/jpeg;base64,${asset.base64}`);
      }
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể chụp ảnh: ' + err.message);
    }
  };

  const showPortraitOptions = () => {
    Alert.alert('Ảnh chân dung người mẫu', 'Chọn phương thức thêm ảnh của bạn:', [
      { text: 'Chụp ảnh mới', onPress: takePersonPhoto },
      { text: 'Chọn từ thư viện', onPress: pickPersonImage },
      { text: 'Hủy', style: 'cancel' },
    ]);
  };

  const handleStartTrial = async () => {
    if (!personImageUri) {
      Alert.alert('Chưa có ảnh', 'Vui lòng chọn hoặc chụp ảnh chân dung trước.');
      return;
    }
    if (!selectedItem) {
      Alert.alert('Chưa chọn đồ', 'Vui lòng chọn một món đồ từ tủ đồ của bạn.');
      return;
    }

    setProcessing(true);
    setJobStatus('Đang gửi yêu cầu thử đồ...');
    setResult(null);

    try {
      const job = await trialApi.generate({
        personImageDataUrl: personBase64,
        clothingItemId: selectedItem.id,
      });

      const jobId = job?.jobId || job?.id;
      if (!jobId) {
        throw new Error('Không nhận được mã tiến trình (jobId)');
      }

      setJobStatus('AI đang tiến hành may mặc ảo...');

      // Start polling
      pollIntervalRef.current = setInterval(async () => {
        try {
          const statusRes = await trialApi.getStatus(jobId);
          if (statusRes.status === 'DONE' || statusRes.status === 'SUCCESS') {
            clearInterval(pollIntervalRef.current);
            setResult(statusRes);
            setProcessing(false);
            loadHistory();
          } else if (statusRes.status === 'FAILED') {
            clearInterval(pollIntervalRef.current);
            setProcessing(false);
            Alert.alert('Thất bại', statusRes.errorMessage || 'Quá trình thử đồ ảo không thành công.');
            loadHistory();
          }
        } catch {
          // Poll attempt failed, will retry next interval
        }
      }, 3000);
    } catch (err) {
      setProcessing(false);
      Alert.alert('Lỗi', err.message || 'Không thể bắt đầu thử đồ ảo.');
    }
  };

  const handleSaveResult = async () => {
    if (!result?.jobId) return;
    try {
      await trialApi.setSaved(result.jobId, true);
      Alert.alert('Đã lưu', 'Kết quả thử đồ đã được lưu vào bộ sưu tập của bạn!');
      loadHistory();
    } catch (err) {
      Alert.alert('Lỗi', err.message || 'Không thể lưu kết quả');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <LoadingOverlay visible={processing} message={jobStatus || 'Đang xử lý...'} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Thử đồ ảo AI</Text>
        <Text style={styles.headerSubtitle}>
          Xem trước trang phục trên dáng người của bạn
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Step Cards Row */}
        <View style={styles.selectorRow}>
          {/* Person Image Card */}
          <Pressable onPress={showPortraitOptions} style={styles.selectorCard}>
            {personImageUri ? (
              <View style={styles.thumbWrapper}>
                <Image source={{ uri: personImageUri }} style={styles.thumbImage} contentFit="cover" />
                <View style={styles.reselectPill}>
                  <Text style={styles.reselectText}>Đổi ảnh</Text>
                </View>
              </View>
            ) : (
              <View style={styles.emptySelector}>
                <View style={styles.iconCircle}>
                  <MaterialIcons name="person" size={28} color={colors.primary} />
                </View>
                <Text style={styles.selectorLabel}>Ảnh của bạn</Text>
                <Text style={styles.selectorPrompt}>Nhấn để chụp / chọn</Text>
              </View>
            )}
          </Pressable>

          {/* Clothing Item Card */}
          <Pressable
            onPress={() => setItemPickerVisible(true)}
            style={styles.selectorCard}
          >
            {selectedItem ? (
              <View style={styles.thumbWrapper}>
                <Image
                  source={{ uri: selectedItem.imageUrl || selectedItem.thumbnailUrl }}
                  style={styles.thumbImage}
                  contentFit="cover"
                />
                <View style={styles.reselectPill}>
                  <Text style={styles.reselectText}>Đổi món đồ</Text>
                </View>
              </View>
            ) : (
              <View style={styles.emptySelector}>
                <View style={styles.iconCircle}>
                  <Ionicons name="shirt-outline" size={26} color={colors.secondary} />
                </View>
                <Text style={styles.selectorLabel}>Chọn trang phục</Text>
                <Text style={styles.selectorPrompt}>Chọn từ tủ đồ</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* Start Button */}
        <AppButton
          title="Bắt đầu thử đồ ngay"
          onPress={handleStartTrial}
          loading={processing}
          size="lg"
          icon={<MaterialIcons name="auto-fix-high" size={20} color={colors.white} />}
          style={styles.startBtn}
        />

        {/* Try-on Result Card */}
        {result && (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultTitle}>Kết quả thử đồ AI</Text>
              {result.accuracy ? (
                <View style={styles.accuracyBadge}>
                  <Text style={styles.accuracyText}>Độ nét: {result.accuracy}</Text>
                </View>
              ) : null}
            </View>

            <Image
              source={{ uri: result.resultImageUrl }}
              style={styles.resultImage}
              contentFit="cover"
              transition={300}
            />

            <View style={styles.resultActions}>
              <AppButton
                title="Lưu kết quả"
                onPress={handleSaveResult}
                size="md"
                icon={<MaterialIcons name="bookmark" size={18} color={colors.white} />}
                style={styles.saveBtn}
              />
            </View>
          </View>
        )}

        {/* Recent Try-on History */}
        {(history.length > 0 || historyError) && (
          <View style={styles.historySection}>
            <View style={styles.historyHeader}>
              <Text style={styles.sectionTitle}>Lịch sử thử đồ gần đây</Text>
              <Pressable onPress={loadHistory} accessibilityRole="button">
                <Text style={styles.historyRefresh}>Cập nhật</Text>
              </Pressable>
            </View>
            {historyError ? <Text style={styles.historyError}>{historyError}</Text> : null}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.historyScroll}>
              {history.map((item, idx) => (
                <TrialHistoryCard key={item.jobId || idx} item={item} onPress={() => {
                  if (isTrialPending(item)) loadHistory();
                  else if (item.status === 'FAILED') Alert.alert('Thử đồ thất bại', item.errorMessage || 'Lượt thử này không tạo được ảnh.');
                  else if (item.resultImageUrl) setResult(item);
                  else Alert.alert('Chưa có ảnh', 'Lượt thử này chưa có ảnh kết quả.');
                }} />
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* Item Picker Modal */}
      <Modal visible={itemPickerVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn trang phục thử đồ</Text>
              <Pressable onPress={() => setItemPickerVisible(false)}>
                <MaterialIcons name="close" size={24} color={colors.onSurface} />
              </Pressable>
            </View>

            {wardrobeItems.length === 0 ? (
              <View style={styles.modalEmpty}>
                <Text style={styles.modalEmptyText}>Tủ đồ của bạn chưa có trang phục nào.</Text>
              </View>
            ) : (
              <FlatList
                data={wardrobeItems}
                keyExtractor={(item) => String(item.id)}
                numColumns={2}
                contentContainerStyle={styles.pickerGrid}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => {
                      setSelectedItem(item);
                      setItemPickerVisible(false);
                    }}
                    style={[
                      styles.pickerItem,
                      selectedItem?.id === item.id && styles.pickerItemActive,
                    ]}
                  >
                    <Image
                      source={{ uri: item.thumbnailUrl || item.imageUrl }}
                      style={styles.pickerThumb}
                      contentFit="cover"
                    />
                    <Text style={styles.pickerName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.pickerCategory}>
                      {getCategoryLabel(item.category)}
                    </Text>
                  </Pressable>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
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
  selectorRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  selectorCard: {
    flex: 1,
    aspectRatio: 0.8,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
    ...shadows.sm,
  },
  thumbWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  reselectPill: {
    position: 'absolute',
    bottom: spacing.sm,
    alignSelf: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  reselectText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '600',
  },
  emptySelector: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  selectorLabel: {
    ...typography.labelMd,
    color: colors.onSurface,
    textAlign: 'center',
  },
  selectorPrompt: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
    marginTop: 2,
    textAlign: 'center',
  },
  startBtn: {
    marginBottom: spacing.xl,
  },
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.md,
    marginBottom: spacing.xl,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  resultTitle: {
    ...typography.titleMd,
    color: colors.onSurface,
    fontWeight: '700',
  },
  accuracyBadge: {
    backgroundColor: colors.successLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  accuracyText: {
    ...typography.caption,
    color: colors.onSuccess,
    fontWeight: '700',
  },
  resultImage: {
    width: '100%',
    aspectRatio: 0.8,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceVariant,
    marginBottom: spacing.md,
  },
  resultActions: {
    width: '100%',
  },
  saveBtn: {
    width: '100%',
  },
  historySection: {
    marginTop: spacing.sm,
  },
  sectionTitle: {
    ...typography.titleSm,
    color: colors.onSurface,
    marginBottom: spacing.md,
  },
  historyScroll: {
    gap: spacing.md,
  },
  historyHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  historyRefresh: { ...typography.labelSm, color: colors.primary, padding: spacing.xs },
  historyError: { ...typography.bodySm, color: colors.onSurfaceVariant, marginBottom: spacing.sm },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    height: '75%',
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...typography.titleLg,
    color: colors.onSurface,
    fontWeight: '700',
  },
  modalEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalEmptyText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  pickerGrid: {
    paddingBottom: spacing.xl,
  },
  pickerItem: {
    flex: 1,
    margin: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.xs + 2,
    alignItems: 'center',
  },
  pickerItemActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryContainer,
  },
  pickerThumb: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceVariant,
    marginBottom: 4,
  },
  pickerName: {
    ...typography.labelSm,
    color: colors.onSurface,
    textAlign: 'center',
  },
  pickerCategory: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
  },
});
