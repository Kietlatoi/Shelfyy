import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../../src/contexts/AuthContext';
import { paymentApi } from '../../../src/api/paymentApi';
import AppButton from '../../../src/components/common/AppButton';
import LoadingOverlay from '../../../src/components/common/LoadingOverlay';
import { colors } from '../../../src/constants/colors';
import { typography } from '../../../src/constants/typography';
import { radius, shadows, spacing } from '../../../src/constants/spacing';

export default function PremiumScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const currentPlan = user?.plan || 'FREE';

  const handleUpgrade = async (planType) => {
    if (planType === currentPlan) {
      Alert.alert('Thông báo', 'Bạn đang sử dụng gói này rồi!');
      return;
    }

    setLoading(true);
    try {
      const res = await paymentApi.createVnpayPayment(planType);
      if (res?.paymentUrl) {
        await WebBrowser.openBrowserAsync(res.paymentUrl);
      } else {
        Alert.alert(
          'Đăng ký thành công',
          `Yêu cầu nâng cấp gói ${planType} đã được ghi nhận. Quản trị viên sẽ xử lý sớm!`
        );
      }
    } catch (err) {
      Alert.alert(
        'Thông báo',
        err.message || 'Cổng thanh toán VNPay đang bảo trì. Vui lòng liên hệ hỗ trợ hoặc thử lại sau.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <LoadingOverlay visible={loading} message="Đang kết nối cổng thanh toán VNPay..." />

      <View style={styles.navBar}>
        <Pressable onPress={() => router.back()} style={styles.navBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.navTitle}>Nâng cấp tài khoản</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Header */}
        <View style={styles.heroSection}>
          <View style={styles.diamondCircle}>
            <MaterialIcons name="diamond" size={36} color={colors.gold} />
          </View>
          <Text style={styles.heroTitle}>Trải nghiệm Shelfy không giới hạn</Text>
          <Text style={styles.heroSubtitle}>
            Mở khóa toàn bộ sức mạnh của AI Stylist và tủ đồ kỹ thuật số
          </Text>
        </View>

        {/* Free Plan */}
        <View style={styles.planCard}>
          <View style={styles.planHeader}>
            <View>
              <Text style={styles.planName}>Gói Cơ Bản (FREE)</Text>
              <Text style={styles.planPrice}>Miễn phí trọn đời</Text>
            </View>
            {currentPlan === 'FREE' && (
              <View style={styles.currentBadge}>
                <Text style={styles.currentText}>Đang dùng</Text>
              </View>
            )}
          </View>

          <View style={styles.featuresList}>
            <View style={styles.featureRow}>
              <MaterialIcons name="check" size={18} color={colors.success} />
              <Text style={styles.featureText}>Thử đồ ảo AI: 5 lượt/ngày</Text>
            </View>
            <View style={styles.featureRow}>
              <MaterialIcons name="check" size={18} color={colors.success} />
              <Text style={styles.featureText}>Lưu trữ tối đa 100 món đồ</Text>
            </View>
            <View style={styles.featureRow}>
              <MaterialIcons name="check" size={18} color={colors.success} />
              <Text style={styles.featureText}>Gợi ý phối đồ hàng ngày theo thời tiết</Text>
            </View>
          </View>
        </View>

        {/* PRO Plan */}
        <View style={[styles.planCard, styles.proCard]}>
          <View style={styles.popularBadge}>
            <Text style={styles.popularText}>PHỔ BIẾN NHẤT 🔥</Text>
          </View>

          <View style={styles.planHeader}>
            <View>
              <Text style={[styles.planName, styles.proTitle]}>Gói PRO</Text>
              <Text style={styles.planPrice}>
                <Text style={styles.priceHighlight}>99.000 ₫</Text> / tháng
              </Text>
            </View>
            {currentPlan === 'PRO' && (
              <View style={styles.currentBadge}>
                <Text style={styles.currentText}>Đang dùng</Text>
              </View>
            )}
          </View>

          <View style={styles.featuresList}>
            <View style={styles.featureRow}>
              <MaterialIcons name="check" size={18} color={colors.primary} />
              <Text style={styles.featureText}>100 lượt thử đồ ảo AI chất lượng cao</Text>
            </View>
            <View style={styles.featureRow}>
              <MaterialIcons name="check" size={18} color={colors.primary} />
              <Text style={styles.featureText}>Lưu trữ tủ đồ không giới hạn</Text>
            </View>
            <View style={styles.featureRow}>
              <MaterialIcons name="check" size={18} color={colors.primary} />
              <Text style={styles.featureText}>Phối đồ thông minh theo lịch trình Google Calendar</Text>
            </View>
            <View style={styles.featureRow}>
              <MaterialIcons name="check" size={18} color={colors.primary} />
              <Text style={styles.featureText}>Tốc độ xử lý AI ưu tiên cao</Text>
            </View>
          </View>

          <AppButton
            title={currentPlan === 'PRO' ? 'Gói hiện tại của bạn' : 'Nâng cấp lên PRO'}
            onPress={() => handleUpgrade('PRO')}
            disabled={currentPlan === 'PRO'}
            size="lg"
            style={styles.planBtn}
          />
        </View>

        {/* PREMIUM Plan */}
        <View style={[styles.planCard, styles.premiumCard]}>
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>TIẾT KIỆM 33%</Text>
          </View>

          <View style={styles.planHeader}>
            <View>
              <Text style={[styles.planName, styles.premiumTitle]}>Gói PREMIUM</Text>
              <Text style={styles.planPrice}>
                <Text style={styles.priceHighlight}>799.000 ₫</Text> / năm
              </Text>
            </View>
            {currentPlan === 'PREMIUM' && (
              <View style={styles.currentBadge}>
                <Text style={styles.currentText}>Đang dùng</Text>
              </View>
            )}
          </View>

          <View style={styles.featuresList}>
            <View style={styles.featureRow}>
              <MaterialIcons name="star" size={18} color={colors.gold} />
              <Text style={styles.featureText}>Toàn bộ quyền lợi của gói PRO</Text>
            </View>
            <View style={styles.featureRow}>
              <MaterialIcons name="star" size={18} color={colors.gold} />
              <Text style={styles.featureText}>Thử đồ ảo AI không giới hạn</Text>
            </View>
            <View style={styles.featureRow}>
              <MaterialIcons name="star" size={18} color={colors.gold} />
              <Text style={styles.featureText}>Hỗ trợ riêng 24/7 từ chuyên gia stylist</Text>
            </View>
          </View>

          <AppButton
            title={currentPlan === 'PREMIUM' ? 'Gói hiện tại của bạn' : 'Nâng cấp PREMIUM'}
            onPress={() => handleUpgrade('PREMIUM')}
            disabled={currentPlan === 'PREMIUM'}
            size="lg"
            variant="secondary"
            style={styles.planBtn}
          />
        </View>
      </ScrollView>
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
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing['4xl'],
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
    marginTop: spacing.sm,
  },
  diamondCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  heroTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
    fontWeight: '800',
    textAlign: 'center',
  },
  heroSubtitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 280,
  },
  planCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.sm,
    marginBottom: spacing.xl,
    position: 'relative',
  },
  proCard: {
    borderColor: colors.primary,
    borderWidth: 2,
    ...shadows.glow(colors.primary),
  },
  premiumCard: {
    borderColor: colors.secondary,
    borderWidth: 1.5,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    right: spacing.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  popularText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '800',
  },
  discountBadge: {
    position: 'absolute',
    top: -12,
    right: spacing.lg,
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  discountText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '800',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  planName: {
    ...typography.titleLg,
    color: colors.onSurface,
    fontWeight: '700',
  },
  proTitle: {
    color: colors.primary,
  },
  premiumTitle: {
    color: colors.secondaryDark,
  },
  planPrice: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginTop: 4,
  },
  priceHighlight: {
    ...typography.titleLg,
    color: colors.onSurface,
    fontWeight: '800',
  },
  currentBadge: {
    backgroundColor: colors.surfaceVariant,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  currentText: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  featuresList: {
    gap: spacing.sm + 2,
    marginBottom: spacing.xl,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  featureText: {
    ...typography.bodySm,
    color: colors.onSurfaceMedium,
    flex: 1,
  },
  planBtn: {
    width: '100%',
  },
});
