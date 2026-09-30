import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { paymentApi } from '../../src/api/paymentApi';
import AppButton from '../../src/components/common/AppButton';
import { colors } from '../../src/constants/colors';
import { typography } from '../../src/constants/typography';
import { radius, spacing } from '../../src/constants/spacing';

const FINAL_STATES = new Set(['PAID', 'CANCELLED', 'EXPIRED', 'FAILED', 'REVIEW']);

export default function PaymentResultScreen() {
  const params = useLocalSearchParams();
  const orderCode = Array.isArray(params.orderCode) ? params.orderCode[0] : params.orderCode;
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);

  const checkPayment = useCallback(async (waitForWebhook = true) => {
    if (!orderCode) {
      setError('Thiếu mã giao dịch PayOS.');
      setChecking(false);
      return;
    }
    setError('');
    setChecking(true);
    try {
      const result = waitForWebhook
        ? await paymentApi.waitForFinalStatus(orderCode)
        : await paymentApi.getPayment(orderCode);
      setPayment(result);
    } catch (nextError) {
      setError(nextError.message || 'Không thể kiểm tra giao dịch.');
    } finally {
      setChecking(false);
    }
  }, [orderCode]);

  useEffect(() => {
    Promise.resolve().then(() => checkPayment(true)).catch(() => {});
  }, [checkPayment]);

  const status = payment?.status;
  const paid = status === 'PAID';
  const pending = !error && (!status || !FINAL_STATES.has(status));
  const icon = paid ? 'check-circle' : pending ? 'schedule' : 'error-outline';
  const iconColor = paid ? colors.success : pending ? colors.primary : colors.error;
  const title = paid
    ? 'Thanh toán thành công'
    : pending ? 'Đang xác nhận thanh toán' : 'Thanh toán chưa hoàn tất';
  const description = paid
    ? `Gói ${payment.planId} đã được kích hoạt cho tài khoản của bạn.`
    : pending
      ? 'Shelfy đang chờ PayOS xác nhận. Bạn có thể kiểm tra lại sau nếu ngân hàng đã trừ tiền.'
      : error || (status === 'REVIEW'
        ? 'Giao dịch cần được kiểm tra thủ công. Quyền lợi chưa được kích hoạt.'
        : 'Giao dịch đã bị hủy, hết hạn hoặc không thành công.');

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.card}>
        <View style={[styles.iconCircle, { backgroundColor: `${iconColor}18` }]}>
          <MaterialIcons name={icon} size={52} color={iconColor} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        {orderCode && <Text style={styles.orderCode}>Mã đơn: {orderCode}</Text>}
        {checking && <Text style={styles.checking}>Đang kết nối PayOS...</Text>}
        {!checking && !paid && (
          <AppButton title="Kiểm tra lại" onPress={() => checkPayment(false)} style={styles.button} />
        )}
        <AppButton
          title={paid ? 'Xem gói của tôi' : 'Quay lại trang gói'}
          onPress={() => router.replace('/(tabs)/profile/premium')}
          variant={paid ? 'primary' : 'secondary'}
          style={styles.button}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  card: {
    alignItems: 'center',
    padding: spacing['2xl'],
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: { ...typography.headlineMd, color: colors.onSurface, textAlign: 'center' },
  description: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  orderCode: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: spacing.lg },
  checking: { ...typography.bodySm, color: colors.primary, marginTop: spacing.md },
  button: { width: '100%', marginTop: spacing.lg },
});
