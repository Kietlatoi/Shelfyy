import React, { useEffect, useState } from 'react';
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
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../../src/contexts/AuthContext';
import { subscriptionApi } from '../../../src/api/subscriptionApi';
import AppButton from '../../../src/components/common/AppButton';
import { colors } from '../../../src/constants/colors';
import { typography } from '../../../src/constants/typography';
import { radius, shadows, spacing } from '../../../src/constants/spacing';

function formatPrice(amount) {
  return `${new Intl.NumberFormat('vi-VN').format(Number(amount) || 0)} ₫`;
}

export default function PremiumScreen() {
  const { user } = useAuth();
  const [catalog, setCatalog] = useState(null);
  const [planStatus, setPlanStatus] = useState(null);

  useEffect(() => {
    let isMounted = true;
    Promise.all([subscriptionApi.getPlans(), subscriptionApi.getMyPlan()])
      .then(([nextCatalog, nextPlan]) => {
        if (isMounted) {
          setCatalog(nextCatalog);
          setPlanStatus(nextPlan);
        }
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, []);

  const getPlan = (id) => catalog?.plans?.find((plan) => plan.id === id);
  const currentPlan = planStatus?.planId || user?.plan || 'FREE';
  const purchaseEnabled = Boolean(catalog?.purchaseEnabled);
  const proPrice = getPlan('PRO')?.price;
  const premiumPrice = getPlan('PREMIUM')?.price;

  const handleUpgrade = (planType) => {
    if (planType === currentPlan) {
      Alert.alert('Thông báo', 'Bạn đang sử dụng gói này rồi!');
      return;
    }

    Alert.alert('PayOS sắp ra mắt', `Gói ${planType} chưa mở bán trong bản demo này.`);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
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
                <Text style={styles.priceHighlight}>{proPrice ? formatPrice(proPrice) : '99.000 ₫'}</Text> / tháng
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
              <Text style={styles.featureText}>100 lượt thử đồ ảo AI mỗi tháng</Text>
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
            title={currentPlan === 'PRO' ? 'Gói hiện tại của bạn' : 'PayOS sắp ra mắt'}
            onPress={() => handleUpgrade('PRO')}
            disabled={currentPlan === 'PRO' || !purchaseEnabled}
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
                <Text style={styles.priceHighlight}>{premiumPrice ? formatPrice(premiumPrice) : '799.000 ₫'}</Text> / năm
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
              <Text style={styles.featureText}>Thử đồ ảo AI tối đa 500 lượt mỗi tháng</Text>
            </View>
            <View style={styles.featureRow}>
              <MaterialIcons name="star" size={18} color={colors.gold} />
              <Text style={styles.featureText}>Ưu tiên xử lý AI</Text>
            </View>
          </View>

          <AppButton
            title={currentPlan === 'PREMIUM' ? 'Gói hiện tại của bạn' : 'PayOS sắp ra mắt'}
            onPress={() => handleUpgrade('PREMIUM')}
            disabled={currentPlan === 'PREMIUM' || !purchaseEnabled}
            size="lg"
            variant="secondary"
            style={styles.planBtn}
          />
        </View>
        <Text style={styles.paymentNote}>
          {purchaseEnabled
            ? 'Thanh toán PayOS sẽ được bật ở phiên bản thương mại.'
            : 'PayOS sắp ra mắt. Hiện tại mọi tài khoản sử dụng gói FREE.'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  paymentNote: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: spacing.xl,
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
