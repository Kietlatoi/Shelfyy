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
  const [error, setError] = useState('');

  const handleSendCode = async () => {
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError('Vui lòng nhập địa chỉ email hợp lệ');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const result = await forgotPassword(email.trim());
      router.push({
        pathname: '/(auth)/reset-password',
        params: {
          email: email.trim(),
          challengeId: result.challengeId,
          resendAfter: String(result.resendAfterSeconds || 60),
        },
      });
    } catch (err) {
      setError(err.message || 'Không thể gửi mã đặt lại mật khẩu. Vui lòng thử lại.');
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
                Nhập email đã đăng ký. Shelfy sẽ gửi mã xác thực gồm 5 chữ số.
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
                title="Gửi mã xác thực"
                onPress={handleSendCode}
                loading={loading}
                size="lg"
                style={styles.submitBtn}
              />
          </View>
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
});
