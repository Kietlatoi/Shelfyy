import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { typography } from '../../constants/typography';
import { radius, spacing } from '../../constants/spacing';

export default function ErrorBanner({ message, onDismiss, style }) {
  if (!message) return null;

  return (
    <View style={[styles.container, style]}>
      <MaterialIcons name="error-outline" size={20} color={colors.error} />
      <Text style={styles.text}>{message}</Text>
      {onDismiss ? (
        <Pressable onPress={onDismiss} style={styles.closeBtn}>
          <MaterialIcons name="close" size={18} color={colors.onError} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorLight,
    borderColor: colors.error,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  text: {
    ...typography.bodySm,
    color: colors.onError,
    flex: 1,
    marginLeft: spacing.sm,
    fontWeight: '500',
  },
  closeBtn: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
});
