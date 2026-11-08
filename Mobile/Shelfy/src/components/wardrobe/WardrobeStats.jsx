import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
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
        <MaterialIcons name="inventory" size={16} color={colors.primary} />
        <Text style={styles.statText}>
          Tổng số: <Text style={styles.statBold}>{total}</Text> món
        </Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.statItem}>
        <MaterialIcons name="check-circle" size={16} color={colors.success} />
        <Text style={styles.statText}>
          Đã mặc: <Text style={styles.statBold}>{worn}</Text>
        </Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.statItem}>
        <MaterialIcons name="cloud-queue" size={16} color={colors.secondary} />
        <Text style={styles.statText}>
          Lưu trữ: <Text style={styles.statBold}>{storageLimit < 0 ? `${total} · Không giới hạn` : `${total}/${storageLimit}`}</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceVariant,
    borderRadius: radius.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
  },
  statBold: {
    fontWeight: '700',
    color: colors.onSurface,
  },
  divider: {
    width: 1,
    height: 14,
    backgroundColor: colors.borderMedium,
  },
});
