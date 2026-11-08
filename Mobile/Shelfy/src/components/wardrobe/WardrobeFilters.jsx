import React from 'react';
import { ScrollView, StyleSheet, Pressable, Text } from 'react-native';
import { CATEGORIES } from '../../constants/categories';
import { colors } from '../../constants/colors';
import { typography } from '../../constants/typography';
import { radius, spacing } from '../../constants/spacing';

export default function WardrobeFilters({
  selectedCategory = 'ALL',
  onSelectCategory,
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {CATEGORIES.map((cat) => {
        const isSelected = selectedCategory === cat.value;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            key={cat.value}
            onPress={() => onSelectCategory(cat.value)}
            style={[
              styles.chip,
              isSelected && styles.chipActive,
            ]}
          >
            <Text
              style={[
                styles.chipText,
                isSelected && styles.chipTextActive,
              ]}
            >
              {cat.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  chipActive: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  chipText: {
    ...typography.labelSm,
    color: colors.onSurfaceMedium,
  },
  chipTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
});
