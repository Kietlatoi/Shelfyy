import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { reviewApi } from '../../../src/api/reviewApi';
import AppButton from '../../../src/components/common/AppButton';
import ErrorBanner from '../../../src/components/common/ErrorBanner';
import { colors } from '../../../src/constants/colors';
import { typography } from '../../../src/constants/typography';
import { radius, spacing } from '../../../src/constants/spacing';

export default function ReviewScreen() {
  const [review, setReview] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setReview(await reviewApi.get());
      setReady(true);
    } catch (reason) { setError(reason.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);
  const submit = async () => {
    if (!rating || saving) return;
    setSaving(true);
    setError('');
    try { setReview(await reviewApi.submit(rating, comment.trim())); }
    catch (reason) {
      if (reason.code === 'REVIEW_EXISTS') await load();
      else setError(reason.message);
    } finally { setSaving(false); }
  };
  return <SafeAreaView style={styles.safe} edges={['top']}>
    <View style={styles.nav}><Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={() => router.back()} style={styles.back}><MaterialIcons name="arrow-back" size={24} color={colors.onSurface} /></Pressable><Text style={styles.title}>Đánh giá Shelfy</Text><View style={styles.back} /></View>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <MaterialIcons name={review ? 'check-circle' : 'rate-review'} size={44} color={colors.primary} />
        <Text style={styles.heading}>{review ? 'Cảm ơn bạn đã góp ý!' : 'Trải nghiệm của bạn thế nào?'}</Text>
        <Text style={styles.body}>{review ? 'Phản hồi của bạn giúp Shelfy cải thiện ứng dụng.' : 'Chọn 1–5 sao và chia sẻ điều bạn muốn Shelfy cải thiện.'}</Text>
        <ErrorBanner message={error} />
        {loading ? <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.xl }} /> : !ready ? <AppButton title="Tải lại" onPress={load} /> : <>
          <View style={styles.stars}>{[1, 2, 3, 4, 5].map((value) => <Pressable key={value} accessibilityRole="radio" accessibilityLabel={`${value} sao`} accessibilityState={{ checked: (review?.rating || rating) === value, disabled: Boolean(review) || saving }} disabled={Boolean(review) || saving} onPress={() => setRating(value)} style={styles.star}><MaterialIcons name={value <= (review?.rating || rating) ? 'star' : 'star-border'} size={36} color={colors.gold} /></Pressable>)}</View>
          <Text style={styles.score}>{review?.rating || rating ? `${review?.rating || rating} / 5 sao` : 'Chưa chọn số sao'}</Text>
          {review ? <><Text style={styles.comment}>{review.comment || 'Bạn đã gửi đánh giá bằng sao.'}</Text><Text style={styles.body}>Đã gửi {new Date(review.createdAt).toLocaleDateString('vi-VN')}</Text></> : <>
            <Text style={styles.label}>Góp ý (không bắt buộc)</Text>
            <TextInput accessibilityLabel="Góp ý về Shelfy" value={comment} onChangeText={setComment} editable={!saving} multiline maxLength={1000} textAlignVertical="top" placeholder="Bạn thích điều gì? Điều gì cần cải thiện?" placeholderTextColor={colors.onSurfaceVariant} style={styles.textInput} />
            <Text style={styles.counter}>{comment.length}/1.000 ký tự</Text>
            <AppButton title="Gửi đánh giá" onPress={submit} loading={saving} disabled={!rating} />
          </>}
          <Text style={styles.privacy}>Mỗi tài khoản gửi một đánh giá. Chỉ quản trị viên xem số sao, góp ý, tên và email để hỗ trợ; nội dung không đăng lên CH Play. Đánh giá được xóa khi bạn xóa tài khoản.</Text>
        </>}
      </View>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  nav: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.surface },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.titleMd, color: colors.onSurface, textAlign: 'center', flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing['4xl'] },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: radius.xl, padding: spacing.lg, gap: spacing.md },
  heading: { ...typography.titleLg, color: colors.onSurface, fontWeight: '700' },
  body: { ...typography.bodySm, color: colors.onSurfaceVariant, lineHeight: 22 },
  stars: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' },
  star: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  score: { ...typography.bodyMd, color: colors.onSurface, textAlign: 'center', fontWeight: '700' },
  label: { ...typography.bodySm, color: colors.onSurface, fontWeight: '600' },
  textInput: { ...typography.bodyMd, color: colors.onSurface, borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: radius.md, minHeight: 140, padding: spacing.md },
  counter: { ...typography.caption, color: colors.onSurfaceVariant, textAlign: 'right' },
  comment: { ...typography.bodyMd, color: colors.onSurface, lineHeight: 24 },
  privacy: { ...typography.caption, color: colors.onSurfaceVariant, lineHeight: 19 },
});
