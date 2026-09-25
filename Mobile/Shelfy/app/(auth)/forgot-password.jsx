import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { forgotPassword } from '../../src/api/authApi';
import AppButton from '../../src/components/common/AppButton';
import AppInput from '../../src/components/common/AppInput';
import ErrorBanner from '../../src/components/common/ErrorBanner';
import { colors } from '../../src/constants/colors';
import { typography } from '../../src/constants/typography';
import { spacing, radius } from '../../src/constants/spacing';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSendLink = async () => {
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError('Vui lòng nhập địa chỉ email hợp lệ');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Không thể gửi link đặt lại mật khẩu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {submitted ? (
            <View style={styles.successCard}>
              <View style={styles.successIconBadge}>
                <MaterialIcons name="mark-email-read" size={48} color={colors.success} />
              </View>
              <Text style={styles.successTitle}>Kiểm tra email của bạn</Text>
              <Text style={styles.successText}>
                Chúng tôi đã gửi hướng dẫn đặt lại mật khẩu tới địa chỉ:
              </Text>
              <Text style={styles.emailHighlight}>{email}</Text>
              <Text style={styles.noteText}>
                Vui lòng làm theo hướng dẫn trong email để tạo mật khẩu mới.
              </Text>

              <AppButton
                title="Quay lại đăng nhập"
                onPress={() => router.replace('/(auth)/login')}
                size="md"
                style={styles.backBtn}
              />
            </View>
          ) : (
            <View style={styles.formCard}>
              <Pressable onPress={() => router.back()} style={styles.backLinkRow}>
                <MaterialIcons name="arrow-back" size={20} color={colors.onSurfaceVariant} />
                <Text style={styles.backLinkText}>Quay lại</Text>
              </Pressable>

              <View style={styles.iconCircle}>
                <MaterialIcons name="lock-reset" size={36} color={colors.primary} />
              </View>

              <Text style={styles.title}>Quên mật khẩu?</Text>
              <Text style={styles.subtitle}>
                Nhập email đã đăng ký của bạn. Chúng tôi sẽ gửi đường link để đặt lại mật khẩu.
              </Text>

              <ErrorBanner message={error} onDismiss={() => setError('')} />

              <AppInput
                label="Email"
                placeholder="nhapemail@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon={
                  <MaterialIcons
                    name="email"
                    size={20}
                    color={colors.onSurfaceVariant}
                  />
                }
              />

              <AppButton
                title="Gửi link đặt lại mật khẩu"
                onPress={handleSendLink}
                loading={loading}
                size="lg"
                style={styles.submitBtn}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  backLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  backLinkText: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    marginLeft: spacing.xs,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.headlineMd,
    color: colors.onSurface,
    fontWeight: '700',
  },
  subtitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  submitBtn: {
    marginTop: spacing.sm,
  },
  successCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing['2xl'],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  successIconBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  successTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  successText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  emailHighlight: {
    ...typography.titleMd,
    color: colors.primaryDark,
    marginVertical: spacing.xs,
  },
  noteText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  backBtn: {
    width: '100%',
  },
});
