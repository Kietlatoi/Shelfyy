import React, { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { isTrialPending } from '../../utils/trialHistory';
import { colors } from '../../constants/colors';
import { radius, spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';

export default function TrialHistoryCard({ item, onPress }) {
  const [failedUrl, setFailedUrl] = useState(null);
  const pending = isTrialPending(item);
  const failed = item.status === 'FAILED';
  const url = item.resultImageUrl;
  const hasImage = !pending && !failed && Boolean(url) && failedUrl !== url;
  const label = pending ? 'Đang xử lý' : failed ? 'Thử đồ thất bại' : 'Không tải được ảnh';

  return (
    <Pressable style={styles.card} onPress={onPress} accessibilityRole="button"
      accessibilityLabel={hasImage ? 'Xem kết quả thử đồ' : label}>
      {hasImage ? (
        <Image source={{ uri: url }} style={styles.image} contentFit="cover"
          onError={() => setFailedUrl(url)} />
      ) : (
        <View style={styles.placeholder}>
          {pending ? <ActivityIndicator color={colors.primary} /> : (
            <MaterialIcons name={failed ? 'error-outline' : 'broken-image'} size={26} color={colors.onSurfaceVariant} />
          )}
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.hint}>{pending ? 'Nhấn để cập nhật' : 'Nhấn để xem'}</Text>
        </View>
      )}
      {item.isSaved && (
        <View style={styles.saved}>
          <MaterialIcons name="bookmark" size={12} color={colors.white} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { width: 120, height: 160, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surfaceVariant },
  image: { width: '100%', height: '100%' },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.sm },
  label: { ...typography.labelSm, color: colors.onSurface, textAlign: 'center', marginTop: spacing.sm },
  hint: { ...typography.caption, color: colors.onSurfaceVariant, textAlign: 'center', marginTop: spacing.xs },
  saved: { position: 'absolute', top: 4, right: 4, backgroundColor: colors.primary, padding: 3, borderRadius: radius.full },
});
