import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors } from '../../constants/colors';
import { radius, spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';

export default function Badge({
  label,
  tone = 'primary', // 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'neutral'
  icon = null,
  active = false,
  onPress,
  style,
  textStyle,
}) {
  const getBadgeStyle = () => {
    if (active) {
      return {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
      };
    }

    switch (tone) {
      case 'secondary':
        return {
          backgroundColor: colors.secondaryContainer,
          borderColor: colors.secondaryContainer,
        };
      case 'success':
        return {
          backgroundColor: colors.successLight,
          borderColor: colors.successLight,
        };
      case 'warning':
        return {
          backgroundColor: colors.warningLight,
          borderColor: colors.warningLight,
        };
      case 'error':
        return {
          backgroundColor: colors.errorLight,
          borderColor: colors.errorLight,
        };
      case 'neutral':
        return {
          backgroundColor: colors.surfaceVariant,
          borderColor: colors.borderSubtle,
        };
      case 'primary':
      default:
        return {
          backgroundColor: colors.primaryContainer,
          borderColor: colors.primaryContainer,
        };
    }
  };

  const getTextColor = () => {
    if (active) return colors.white;

    switch (tone) {
      case 'secondary':
        return colors.onSecondaryContainer;
      case 'success':
        return colors.onSuccess;
      case 'warning':
        return colors.onWarning;
      case 'error':
        return colors.onError;
      case 'neutral':
        return colors.onSurfaceVariant;
      case 'primary':
      default:
        return colors.onPrimaryContainer;
    }
  };

  const Container = onPress ? Pressable : View;

  return (
    <Container
      onPress={onPress}
      style={[
        styles.badge,
        getBadgeStyle(),
        onPress && styles.interactive,
        style,
      ]}
    >
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text
        style={[
          styles.text,
          { color: getTextColor() },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </Container>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  interactive: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  iconContainer: {
    marginRight: spacing.xs,
  },
  text: {
    ...typography.labelSm,
    fontWeight: '600',
  },
});
