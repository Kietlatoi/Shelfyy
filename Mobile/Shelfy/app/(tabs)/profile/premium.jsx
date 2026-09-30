import React, { useCallback, useEffect, useState } from 'react';
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
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../../src/contexts/AuthContext';
import { subscriptionApi } from '../../../src/api/subscriptionApi';
import { paymentApi } from '../../../src/api/paymentApi';
import AppButton from '../../../src/components/common/AppButton';
import { colors } from '../../../src/constants/colors';
import { typography } from '../../../src/constants/typography';
import { radius, shadows, spacing } from '../../../src/constants/spacing';

function formatPrice(amount) {
  return `${new Intl.NumberFormat('vi-VN').format(Number(amount) || 0)} ₫`;
}

function formatDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString('vi-VN') : null;
}

export default function PremiumScreen() {
  const { user } = useAuth();
  const [catalog, setCatalog] = useState(null);
  const [planStatus, setPlanStatus] = useState(null);
  const [pendingPayment, setPendingPayment] = useState(null);
  const [processingPlan, setProcessingPlan] = useState(null);

  const loadData = useCallback(async () => {
    const [nextCatalog, nextPlan, storedPending] = await Promise.all([
      subscriptionApi.getPlans(),
      subscriptionApi.getMyPlan(),
      paymentApi.getPendingPayment(),
    ]);
    setCatalog(nextCatalog);
    setPlanStatus(nextPlan);
    if (storedPending) {
      const latest = await paymentApi.getPayment(storedPending.orderCode).catch(() => null);
      setPendingPayment(latest?.status === 'PENDING' ? latest : null);
    } else {
      setPendingPayment(null);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(loadData).catch(() => {});
  }, [loadData]);

  const getPlan = (id) => catalog?.plans?.find((plan) => plan.id === id);
  const currentPlan = planStatus?.planId || user?.plan || 'FREE';
  const purchaseEnabled = Boolean(catalog?.purchaseEnabled);
  const proPrice = getPlan('PRO')?.price;
  const premiumPrice = getPlan('PREMIUM')?.price;

  const handleUpgrade = async (planType) => {
    if (!purchaseEnabled) {
      Alert.alert('Chưa thể thanh toán', 'PayOS chưa được cấu hình đầy đủ trên máy chủ.');
      return;
    }
    if (currentPlan === 'PREMIUM' && planType === 'PRO') {
      Alert.alert('Gói PREMIUM đang hoạt động', 'Bạn có thể mua PRO sau khi gói PREMIUM hết hạn.');
      return;
    }
    setProcessingPlan(planType);
    try {
      const payment = await paymentApi.createPayment(planType);
      setPendingPayment(payment);
      if (!payment.checkoutUrl) throw new Error('PayOS chưa trả về trang thanh toán.');
      const redirectUrl = Linking.createURL('/payment/result');
      const result = await WebBrowser.openAuthSessionAsync(payment.checkoutUrl, redirectUrl, {
        toolbarColor: colors.primary,
        showTitle: true,
      });
      if (result.type !== 'success') {
        const latest = await paymentApi.getPayment(payment.orderCode).catch(() => payment);
        setPendingPayment(latest.status === 'PENDING' ? latest : null);
        if (latest.status === 'PAID') {
          Alert.alert('Thanh toán thành công', `Gói ${planType} đã được kích hoạt.`);
        }
      }
      await loadData();
    } catch (error) {
      Alert.alert('Không thể thanh toán', error.message || 'Vui lòng thử lại sau.');
    } finally {
      setProcessingPlan(null);
    }
  };

  const resumePendingPayment = async () => {
    if (!pendingPayment?.checkoutUrl) return;
    setProcessingPlan(pendingPayment.planId);
    try {
      await WebBrowser.openAuthSessionAsync(
        pendingPayment.checkoutUrl,
        Linking.createURL('/payment/result'),
        { toolbarColor: colors.primary, showTitle: true },
      );
      await loadData();
    } catch (error) {
      Alert.alert('Không thể mở PayOS', error.message || 'Vui lòng thử lại sau.');
    } finally {
      setProcessingPlan(null);
    }
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
        {pendingPayment && (
          <Pressable style={styles.pendingCard} onPress={resumePendingPayment}>
            <MaterialIcons name="schedule" size={22} color={colors.primary} />
            <View style={styles.pendingTextWrap}>
              <Text style={styles.pendingTitle}>Thanh toán {pendingPayment.planId} đang chờ</Text>
              <Text style={styles.pendingText}>Nhấn để tiếp tục trên PayOS.</Text>
            </View>
          </Pressable>
        )}
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
        {currentPlan !== 'FREE' && formatDate(planStatus?.expiresAt) && (
          <Text style={styles.expiryText}>
            Gói {currentPlan} có hiệu lực đến {formatDate(planStatus.expiresAt)}
          </Text>
        )}
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
                <Text style={styles.priceHighlight}>{proPrice ? formatPrice(proPrice) : '69.000 ₫'}</Text> / tháng
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
              <Text style={styles.featureText}>Hiệu lực 30 ngày cho mỗi lần thanh toán</Text>
            </View>
          </View>

          <AppButton
            title={processingPlan === 'PRO'
              ? 'Đang tạo thanh toán...'
              : currentPlan === 'PRO' ? 'Gia hạn gói PRO' : 'Mua gói PRO qua PayOS'}
            onPress={() => handleUpgrade('PRO')}
            disabled={!purchaseEnabled || Boolean(processingPlan) || currentPlan === 'PREMIUM'}
            size="lg"
            style={styles.planBtn}
          />
        </View>

        {/* PREMIUM Plan */}
        <View style={[styles.planCard, styles.premiumCard]}>
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>TIẾT KIỆM 28%</Text>
          </View>

          <View style={styles.planHeader}>
            <View>
              <Text style={[styles.planName, styles.premiumTitle]}>Gói PREMIUM</Text>
              <Text style={styles.planPrice}>
                <Text style={styles.priceHighlight}>{premiumPrice ? formatPrice(premiumPrice) : '599.000 ₫'}</Text> / năm
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
              <Text style={styles.featureText}>Hiệu lực 365 ngày cho mỗi lần thanh toán</Text>
            </View>
          </View>

          <AppButton
            title={processingPlan === 'PREMIUM'
              ? 'Đang tạo thanh toán...'
              : currentPlan === 'PREMIUM' ? 'Gia hạn gói PREMIUM' : 'Mua gói PREMIUM qua PayOS'}
            onPress={() => handleUpgrade('PREMIUM')}
            disabled={!purchaseEnabled || Boolean(processingPlan)}
            size="lg"
            variant="secondary"
            style={styles.planBtn}
          />
        </View>
        <Text style={styles.paymentNote}>
          {purchaseEnabled
            ? 'Thanh toán một lần qua PayOS. Gói không tự động gia hạn.'
            : 'Thanh toán tạm khóa vì PayOS chưa được cấu hình đầy đủ.'}
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
  expiryText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  pendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryContainer,
  },
  pendingTextWrap: { flex: 1 },
  pendingTitle: { ...typography.titleSm, color: colors.onSurface },
  pendingText: { ...typography.bodySm, color: colors.onSurfaceVariant },
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
