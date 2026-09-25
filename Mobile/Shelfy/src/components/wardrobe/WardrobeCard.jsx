import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { typography } from '../../constants/typography';
import { radius, shadows, spacing } from '../../constants/spacing';
import { getCategoryLabel } from '../../constants/categories';
import { statusOptionFor } from '../../constants/itemStatus';

export default function WardrobeCard({ item, onPress, onFavoriteToggle }) {
  const statusConfig = statusOptionFor(item.status || item.itemStatus);
  const isFav = Boolean(item.favorite);

  return (
    <Pressable
      onPress={() => onPress && onPress(item)}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: item.thumbnailUrl || item.imageUrl }}
          style={styles.image}
          contentFit="cover"
          transition={200}
        />

        {/* Favorite Heart Button */}
        {onFavoriteToggle && (
          <Pressable
            onPress={() => onFavoriteToggle(item)}
            hitSlop={8}
            style={styles.favButton}
          >
            <MaterialIcons
              name={isFav ? 'favorite' : 'favorite-border'}
              size={18}
              color={isFav ? colors.error : colors.white}
            />
          </Pressable>
        )}

        {/* Status Badge */}
        {statusConfig && statusConfig.value !== 'IN_USE' && (
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.brand} numberOfLines={1}>
          {item.brand || 'Khác'}
        </Text>
        <Text style={styles.name} numberOfLines={1}>
          {item.name || 'Món đồ'}
        </Text>

        <View style={styles.metaRow}>
          <Text style={styles.category}>{getCategoryLabel(item.category)}</Text>
          {item.size ? <Text style={styles.size}>• Size {item.size}</Text> : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
    ...shadows.sm,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 0.85,
    backgroundColor: colors.surfaceVariant,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  favButton: {
    position: 'absolute',
    top: spacing.xs + 2,
    right: spacing.xs + 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    position: 'absolute',
    bottom: spacing.xs + 2,
    left: spacing.xs + 2,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  statusText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
  },
  content: {
    padding: spacing.sm + 2,
  },
  brand: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
    textTransform: 'uppercase',
  },
  name: {
    ...typography.labelMd,
    color: colors.onSurface,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  category: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
  },
  size: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
    marginLeft: 4,
  },
});
