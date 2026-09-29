import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { wardrobeApi } from '../../../../src/api/wardrobeApi';
import { uploadApi } from '../../../../src/api/uploadApi';
import AppButton from '../../../../src/components/common/AppButton';
import AppInput from '../../../../src/components/common/AppInput';
import LoadingOverlay from '../../../../src/components/common/LoadingOverlay';
import ErrorBanner from '../../../../src/components/common/ErrorBanner';
import { colors } from '../../../../src/constants/colors';
import { typography } from '../../../../src/constants/typography';
import { radius, spacing } from '../../../../src/constants/spacing';
import { CATEGORIES, SEASONS, SIZES } from '../../../../src/constants/categories';

export default function EditWardrobeItemScreen() {
  const { id } = useLocalSearchParams();
  const [initialLoading, setInitialLoading] = useState(true);
  const [imageUri, setImageUri] = useState(null);
  const [imageResource, setImageResource] = useState(null);
  const [isNewImage, setIsNewImage] = useState(false);
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('TOP');
  const [color, setColor] = useState('');
  const [season, setSeason] = useState('Bốn mùa');
  const [size, setSize] = useState('M');
  const [pattern, setPattern] = useState('Trơn');
  const [material, setMaterial] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadItem() {
      try {
        setInitialLoading(true);
        const item = await wardrobeApi.getItem(id);
        setName(item.name || '');
        setBrand(item.brand || '');
        setCategory(item.category || 'TOP');
        setColor(item.color || '');
        setSeason(item.season || 'Bốn mùa');
        setSize(item.size || 'M');
        setPattern(item.pattern || 'Trơn');
        setMaterial(item.material || '');
        setPurchasePrice(item.purchasePrice ? String(item.purchasePrice) : '');
        setImageUri(item.imageUrl || item.thumbnailUrl || null);
        setImageResource(item.image || null);
      } catch (err) {
        Alert.alert('Lỗi', err.message || 'Không thể tải thông tin món đồ');
      } finally {
        setInitialLoading(false);
      }
    }

    if (id) loadItem();
  }, [id]);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
        setIsNewImage(true);
      }
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể chọn ảnh: ' + err.message);
    }
  };

  const handleUpdate = async () => {
    if (!name.trim()) {
      setError('Vui lòng nhập tên món đồ');
      return;
    }

    setError('');
    setLoading(true);

    try {
      let finalThumbnailUrl = imageUri;
      let finalImageResource = imageResource;

      if (isNewImage && imageUri) {
        setLoadingMessage('Đang tải ảnh mới lên...');
        const uploadRes = await uploadApi.uploadClothing(imageUri, 'clothing.jpg', 'image/jpeg');
        finalThumbnailUrl = uploadRes.thumbnailUrl || uploadRes.url;
        finalImageResource = { secureUrl: uploadRes.secureUrl, publicId: uploadRes.publicId };
      }

      setLoadingMessage('Đang lưu cập nhật...');
      const payload = {
        name: name.trim(),
        brand: brand.trim() || 'Khác',
        category,
        color: color.trim() || null,
        season: season || 'Bốn mùa',
        size: size || null,
        pattern: pattern.trim() || 'Trơn',
        material: material.trim() || null,
        purchasePrice: purchasePrice ? Number(purchasePrice) : null,
        image: finalImageResource,
        thumbnail: finalImageResource
          ? { secureUrl: finalThumbnailUrl, publicId: finalImageResource.publicId }
          : null,
      };

      await wardrobeApi.updateItem(id, payload);
      Alert.alert('Thành công', 'Đã cập nhật thông tin món đồ!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (err) {
      setError(err.message || 'Không thể cập nhật món đồ. Vui lòng thử lại.');
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <LoadingOverlay visible={loading} message={loadingMessage} />

      <View style={styles.navBar}>
        <Pressable onPress={() => router.back()} style={styles.navBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.navTitle}>Chỉnh sửa món đồ</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <ErrorBanner message={error} onDismiss={() => setError('')} />

          {/* Photo box */}
          <Pressable onPress={pickImage} style={styles.imagePickerBox}>
            {imageUri ? (
              <View style={styles.imagePreviewWrapper}>
                <Image
                  source={{ uri: imageUri }}
                  style={styles.imagePreview}
                  contentFit="cover"
                />
                <View style={styles.changePhotoBadge}>
                  <MaterialIcons name="camera-alt" size={16} color={colors.white} />
                  <Text style={styles.changePhotoText}>Đổi ảnh khác</Text>
                </View>
              </View>
            ) : (
              <View style={styles.uploadPlaceholder}>
                <MaterialIcons name="add-photo-alternate" size={36} color={colors.primary} />
                <Text style={styles.uploadTitle}>Chọn ảnh trang phục</Text>
              </View>
            )}
          </Pressable>

          <View style={styles.formSection}>
            <AppInput
              label="Tên món đồ *"
              placeholder="VD: Áo sơ mi Oxford"
              value={name}
              onChangeText={setName}
            />

            <AppInput
              label="Thương hiệu"
              placeholder="VD: Uniqlo, Zara..."
              value={brand}
              onChangeText={setBrand}
            />

            {/* Category */}
            <Text style={styles.fieldLabel}>Phân loại trang phục *</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsScroll}
            >
              {CATEGORIES.filter((c) => c.value !== 'ALL').map((cat) => (
                <Pressable
                  key={cat.value}
                  onPress={() => setCategory(cat.value)}
                  style={[
                    styles.chipBtn,
                    category === cat.value && styles.chipBtnActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipBtnText,
                      category === cat.value && styles.chipBtnTextActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Size */}
            <Text style={styles.fieldLabel}>Kích cỡ (Size)</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsScroll}
            >
              {SIZES.map((sz) => (
                <Pressable
                  key={sz}
                  onPress={() => setSize(sz)}
                  style={[
                    styles.chipBtn,
                    size === sz && styles.chipBtnActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipBtnText,
                      size === sz && styles.chipBtnTextActive,
                    ]}
                  >
                    {sz}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Season */}
            <Text style={styles.fieldLabel}>Mùa thích hợp</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsScroll}
            >
              {SEASONS.map((sn) => (
                <Pressable
                  key={sn}
                  onPress={() => setSeason(sn)}
                  style={[
                    styles.chipBtn,
                    season === sn && styles.chipBtnActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipBtnText,
                      season === sn && styles.chipBtnTextActive,
                    ]}
                  >
                    {sn}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.row}>
              <View style={styles.col}>
                <AppInput
                  label="Màu sắc"
                  value={color}
                  onChangeText={setColor}
                />
              </View>
              <View style={styles.col}>
                <AppInput
                  label="Chất liệu"
                  value={material}
                  onChangeText={setMaterial}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.col}>
                <AppInput
                  label="Họa tiết"
                  value={pattern}
                  onChangeText={setPattern}
                />
              </View>
              <View style={styles.col}>
                <AppInput
                  label="Giá mua (VNĐ)"
                  value={purchasePrice}
                  onChangeText={setPurchasePrice}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <AppButton
              title="Lưu thay đổi"
              onPress={handleUpdate}
              size="lg"
              style={styles.saveBtn}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  },
  container: {
    flex: 1,
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
    padding: spacing.lg,
    paddingBottom: spacing['4xl'],
  },
  imagePickerBox: {
    width: '100%',
    height: 240,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
    marginBottom: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadPlaceholder: {
    alignItems: 'center',
  },
  uploadTitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  imagePreviewWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  changePhotoBadge: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderRadius: radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  changePhotoText: {
    ...typography.labelSm,
    color: colors.white,
    marginLeft: 4,
  },
  formSection: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  fieldLabel: {
    ...typography.labelMd,
    color: colors.onSurfaceMedium,
    marginBottom: spacing.xs + 2,
  },
  chipsScroll: {
    gap: spacing.xs + 2,
    marginBottom: spacing.lg,
  },
  chipBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  chipBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipBtnText: {
    ...typography.labelSm,
    color: colors.onSurfaceMedium,
  },
  chipBtnTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  col: {
    flex: 1,
  },
  saveBtn: {
    marginTop: spacing.md,
  },
});
