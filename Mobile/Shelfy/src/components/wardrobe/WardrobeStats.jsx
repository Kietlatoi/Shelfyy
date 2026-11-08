import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../constants/colors';
import { typography } from '../../constants/typography';
import { radius, spacing } from '../../constants/spacing';

export default function WardrobeStats({ stats, totalCount = 0 }) {
  const total = stats?.totalItems ?? totalCount ?? 0;
  const worn = stats?.wornCount ?? stats?.wornItemsCount ?? 0;
  const storageLimit = stats?.storageLimit ?? 100;

  return (
    <View style={styles.container}>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{total}</Text>
        <Text style={styles.statText}>Món trong tủ</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{worn}</Text>
        <Text style={styles.statText}>Đã mặc</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{storageLimit < 0 ? '∞' : storageLimit}</Text>
        <Text style={styles.statText}>Hạn mức lưu trữ</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryContainer, borderRadius: radius.lg, marginHorizontal: spacing.xl, marginVertical: spacing.md, paddingVertical: spacing.md },
  statItem: { flex: 1, alignItems: 'center', paddingHorizontal: spacing.xs, gap: spacing.xs },
  statValue: { ...typography.headlineSm, color: colors.onSurface, fontVariant: ['tabular-nums'] },
  statText: { ...typography.caption, textAlign: 'center', color: colors.onSurfaceMedium },
  divider: { width: 1, height: 32, backgroundColor: colors.borderMedium },
});
