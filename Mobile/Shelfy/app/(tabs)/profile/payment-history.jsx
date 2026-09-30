import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { paymentApi } from '../../../src/api/paymentApi';
import { colors } from '../../../src/constants/colors';
import { typography } from '../../../src/constants/typography';
import { radius, spacing } from '../../../src/constants/spacing';

const STATUS_LABELS = {
  CREATING: 'Đang tạo', PENDING: 'Đang chờ', PAID: 'Đã thanh toán',
  CANCELLED: 'Đã hủy', EXPIRED: 'Hết hạn', FAILED: 'Thất bại',
  REVIEW: 'Cần kiểm tra', REFUNDED: 'Đã hoàn tiền',
};

function dateValue(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function money(value) {
  return `${new Intl.NumberFormat('vi-VN').format(Number(value) || 0)} ₫`;
}

export default function PaymentHistoryScreen() {
  const [payments, setPayments] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setRefreshing(true);
    setError('');
    try {
      setPayments(await paymentApi.listPayments());
    } catch (nextError) {
      setError(nextError.message || 'Không thể tải lịch sử thanh toán.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(load).catch(() => {});
  }, [load]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.navBar}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.navTitle}>Lịch sử thanh toán</Text>
        <View style={styles.backButton} />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
      >
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!refreshing && payments.length === 0 ? (
          <View style={styles.empty}>
            <MaterialIcons name="receipt-long" size={44} color={colors.onSurfaceDisabled} />
            <Text style={styles.emptyTitle}>Chưa có giao dịch</Text>
            <Text style={styles.emptyText}>Các lần thanh toán PayOS sẽ xuất hiện tại đây.</Text>
          </View>
        ) : payments.map((payment) => {
          const createdAt = dateValue(payment.createdAt);
          const paid = payment.status === 'PAID';
          return (
            <View key={payment.id} style={styles.card}>
              <View style={styles.row}>
                <View>
                  <Text style={styles.plan}>Gói {payment.planName || payment.planId}</Text>
                  <Text style={styles.order}>Mã đơn {payment.orderCode}</Text>
                </View>
                <View style={[styles.badge, paid && styles.paidBadge]}>
                  <Text style={[styles.badgeText, paid && styles.paidText]}>
                    {STATUS_LABELS[payment.status] || payment.status}
                  </Text>
                </View>
              </View>
              <Text style={styles.amount}>{money(payment.price)}</Text>
              {createdAt && (
                <Text style={styles.date}>{createdAt.toLocaleString('vi-VN')}</Text>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  navBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle,
  },
  backButton: { width: 40, padding: spacing.xs },
  navTitle: { ...typography.titleMd, color: colors.onSurface },
  content: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  card: { padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  plan: { ...typography.titleMd, color: colors.onSurface },
  order: { ...typography.caption, color: colors.onSurfaceVariant, marginTop: 2 },
  amount: { ...typography.titleLg, color: colors.onSurface, marginTop: spacing.md },
  date: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 2 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.full, backgroundColor: colors.surfaceVariant },
  paidBadge: { backgroundColor: colors.successLight },
  badgeText: { ...typography.caption, color: colors.onSurfaceVariant },
  paidText: { color: colors.success },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing['4xl'] },
  emptyTitle: { ...typography.titleMd, color: colors.onSurface, marginTop: spacing.md },
  emptyText: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: spacing.xs },
  error: { ...typography.bodySm, color: colors.error, textAlign: 'center' },
});
