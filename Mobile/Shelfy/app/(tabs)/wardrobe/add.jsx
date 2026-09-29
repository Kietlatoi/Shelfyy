import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { wardrobeApi } from '../../../src/api/wardrobeApi';
import { uploadApi } from '../../../src/api/uploadApi';
import AppButton from '../../../src/components/common/AppButton';
import AppInput from '../../../src/components/common/AppInput';
import LoadingOverlay from '../../../src/components/common/LoadingOverlay';
import ErrorBanner from '../../../src/components/common/ErrorBanner';
import { colors } from '../../../src/constants/colors';
import { typography } from '../../../src/constants/typography';
import { radius, spacing } from '../../../src/constants/spacing';
import { CATEGORIES, SEASONS, SIZES } from '../../../src/constants/categories';

export default function AddWardrobeItemScreen() {
  const [imageUri, setImageUri] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
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

  const pickImageFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể chọn ảnh: ' + err.message);
    }
  };

  const takePhotoWithCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Quyền hạn', 'Cần cấp quyền truy cập Camera để chụp ảnh trang phục.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể chụp ảnh: ' + err.message);
    }
  };

  const showImagePickerOptions = () => {
    Alert.alert('Chọn ảnh trang phục', 'Bạn muốn chụp ảnh mới hay chọn từ thư viện?', [
      { text: 'Chụp ảnh', onPress: takePhotoWithCamera },
      { text: 'Chọn từ thư viện', onPress: pickImageFromGallery },
      { text: 'Hủy', style: 'cancel' },
    ]);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Vui lòng nhập tên món đồ');
      return;
    }

    setError('');
    setLoading(true);

    try {
      let uploadedImage = uploadResult;

      // If user selected image and haven't uploaded yet
      if (imageUri && !uploadedImage) {
        setLoadingMessage('Đang tải ảnh lên Cloudinary...');
        const uploadRes = await uploadApi.uploadClothing(imageUri, 'clothing.jpg', 'image/jpeg');
        uploadedImage = uploadRes;
        setUploadResult(uploadRes);
      }

      setLoadingMessage('Đang lưu thông tin món đồ...');
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
        image: uploadedImage
          ? { secureUrl: uploadedImage.secureUrl, publicId: uploadedImage.publicId }
          : null,
        thumbnail: uploadedImage
          ? { secureUrl: uploadedImage.thumbnailUrl, publicId: uploadedImage.publicId }
          : null,
      };

      await wardrobeApi.createItem(payload);
      Alert.alert('Thành công', 'Đã thêm món đồ vào tủ đồ!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (err) {
      setError(err.message || 'Không thể tạo món đồ. Vui lòng thử lại.');
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <LoadingOverlay visible={loading} message={loadingMessage} />

      {/* Navigation header */}
      <View style={styles.navBar}>
        <Pressable onPress={() => router.back()} style={styles.navBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.navTitle}>Thêm đồ mới</Text>
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

          {/* Photo Picker Box */}
          <Pressable onPress={showImagePickerOptions} style={styles.imagePickerBox}>
            {imageUri ? (
              <View style={styles.imagePreviewWrapper}>
                <Image
                  source={{ uri: imageUri }}
                  style={styles.imagePreview}
                  contentFit="cover"
                />
                <View style={styles.changePhotoBadge}>
                  <MaterialIcons name="edit" size={16} color={colors.white} />
                  <Text style={styles.changePhotoText}>Đổi ảnh</Text>
                </View>
              </View>
            ) : (
              <View style={styles.uploadPlaceholder}>
                <View style={styles.cameraIconCircle}>
                  <MaterialIcons name="add-a-photo" size={32} color={colors.primary} />
                </View>
                <Text style={styles.uploadTitle}>Chọn hoặc chụp ảnh trang phục</Text>
                <Text style={styles.uploadSubtitle}>Nhấn để chụp camera hoặc chọn từ album</Text>
              </View>
            )}
          </Pressable>

          {/* Form Fields */}
          <View style={styles.formSection}>
            <AppInput
              label="Tên món đồ *"
              placeholder="VD: Áo sơ mi Oxford, Quần jean ống rộng..."
              value={name}
              onChangeText={setName}
            />

            <AppInput
              label="Thương hiệu"
              placeholder="VD: Uniqlo, Zara, Routine..."
              value={brand}
              onChangeText={setBrand}
            />

            {/* Category selection */}
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

            {/* Size selection */}
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

            {/* Season selection */}
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
                  placeholder="VD: Trắng, Đen..."
                  value={color}
                  onChangeText={setColor}
                />
              </View>
              <View style={styles.col}>
                <AppInput
                  label="Chất liệu"
                  placeholder="VD: Cotton, Lụa..."
                  value={material}
                  onChangeText={setMaterial}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.col}>
                <AppInput
                  label="Họa tiết"
                  placeholder="VD: Trơn, Kẻ sọc..."
                  value={pattern}
                  onChangeText={setPattern}
                />
              </View>
              <View style={styles.col}>
                <AppInput
                  label="Giá mua (VNĐ)"
                  placeholder="VD: 350000"
                  value={purchasePrice}
                  onChangeText={setPurchasePrice}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <AppButton
              title="Lưu vào tủ đồ"
              onPress={handleSave}
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
    borderWidth: 2,
    borderColor: colors.borderSubtle,
    borderStyle: 'dashed',
    overflow: 'hidden',
    marginBottom: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadPlaceholder: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  cameraIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  uploadTitle: {
    ...typography.titleSm,
    color: colors.onSurface,
  },
  uploadSubtitle: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
    marginTop: 4,
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
