import React from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';
import { colors } from '../../constants/colors';
import { typography } from '../../constants/typography';
import { radius, spacing } from '../../constants/spacing';

export default function AppButton({
  title,
  onPress,
  variant = 'primary', // 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size = 'md', // 'sm' | 'md' | 'lg'
  loading = false,
  disabled = false,
  icon = null,
  iconPosition = 'left',
  style,
  textStyle,
  fullWidth = true,
}) {
  const isDisabled = disabled || loading;

  const getContainerStyle = ({ pressed }) => [
    styles.base,
    styles[variant],
    styles[`size_${size}`],
    fullWidth && styles.fullWidth,
    pressed && !isDisabled && styles.pressed,
    isDisabled && styles.disabled,
    style,
  ];

  const getTextColor = () => {
    if (isDisabled) return colors.onSurfaceDisabled;
    switch (variant) {
      case 'secondary':
        return colors.onSecondary;
      case 'outline':
        return colors.primary;
      case 'ghost':
        return colors.onSurface;
      case 'danger':
        return colors.white;
      case 'primary':
      default:
        return colors.onPrimary;
    }
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={getContainerStyle}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={getTextColor()}
        />
      ) : (
        <View style={styles.contentRow}>
          {icon && iconPosition === 'left' && (
            <View style={styles.iconLeft}>{icon}</View>
          )}
          {title ? (
            <Text
              style={[
                styles.text,
                styles[`text_${size}`],
                { color: getTextColor() },
                textStyle,
              ]}
            >
              {title}
            </Text>
          ) : null}
          {icon && iconPosition === 'right' && (
            <View style={styles.iconRight}>{icon}</View>
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: spacing.sm,
  },
  iconRight: {
    marginLeft: spacing.sm,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.5,
  },
  // Variants
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.secondary,
  },
  outline: {
    backgroundColor: colors.transparent,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  ghost: {
    backgroundColor: colors.transparent,
  },
  danger: {
    backgroundColor: colors.error,
  },
  // Sizes
  size_sm: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    minHeight: 36,
  },
  size_md: {
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.lg,
    minHeight: 46,
  },
  size_lg: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    minHeight: 54,
  },
  // Typography
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  text_sm: {
    ...typography.labelSm,
  },
  text_md: {
    ...typography.labelMd,
    fontSize: 15,
  },
  text_lg: {
    ...typography.labelLg,
    fontSize: 16,
  },
});
