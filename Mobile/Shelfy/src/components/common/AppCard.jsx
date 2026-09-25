import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { colors } from '../../constants/colors';
import { radius, shadows, spacing } from '../../constants/spacing';

export default function AppCard({
  children,
  onPress,
  style,
  elevation = 'sm', // 'sm' | 'md' | 'lg' | 'none'
  bordered = true,
}) {
  const Container = onPress ? Pressable : View;

  return (
    <Container
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        bordered && styles.bordered,
        elevation !== 'none' && shadows[elevation],
        pressed && styles.pressed,
        style,
      ]}
    >
      {children}
    </Container>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  bordered: {
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
});
