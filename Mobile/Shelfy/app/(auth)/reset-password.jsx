import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { forgotPassword, resetPassword } from '../../src/api/authApi';
import AppButton from '../../src/components/common/AppButton';
import AppInput from '../../src/components/common/AppInput';
import ErrorBanner from '../../src/components/common/ErrorBanner';
import { colors } from '../../src/constants/colors';
import { typography } from '../../src/constants/typography';
import { spacing, radius } from '../../src/constants/spacing';

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams();
  const email = Array.isArray(params.email) ? params.email[0] : params.email;
  const initialChallengeId = Array.isArray(params.challengeId)
    ? params.challengeId[0]
    : params.challengeId;
  const initialResendAfter = Number(Array.isArray(params.resendAfter)
    ? params.resendAfter[0]
    : params.resendAfter) || 60;
  const [challengeId, setChallengeId] = useState(initialChallengeId || '');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resendAfter, setResendAfter] = useState(initialResendAfter);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (resendAfter <= 0) return undefined;
    const timer = setTimeout(() => setResendAfter((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [resendAfter]);

  const handleResetPassword = async () => {
    if (!email || !challengeId) {
      setError('Yêu cầu đặt lại mật khẩu không hợp lệ. Vui lòng gửi mã mới.');
      return;
    }
    if (!/^\d{5}$/.test(code)) {
      setError('Mã xác thực phải gồm đúng 5 chữ số.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await resetPassword({
        email: String(email),
        challengeId,
        code,
        newPassword,
      });
      Alert.alert(
        'Thành công',
        'Mật khẩu của bạn đã được đặt lại thành công. Vui lòng đăng nhập.',
        [
          {
            text: 'Đăng nhập',
            onPress: () => router.replace('/(auth)/login'),
          },
        ]
      );
    } catch (err) {
      setError(err.message || 'Không thể đặt lại mật khẩu. Mã có thể đã hết hạn.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email || resendAfter > 0 || loading) return;
    setError('');
    setLoading(true);
    try {
      const result = await forgotPassword(String(email));
      setChallengeId(result.challengeId);
      setCode('');
      setResendAfter(result.resendAfterSeconds || 60);
    } catch (err) {
      setError(err.message || 'Không thể gửi lại mã xác thực.');
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
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <MaterialIcons name="vpn-key" size={36} color={colors.primary} />
            </View>

            <Text style={styles.title}>Đặt lại mật khẩu</Text>
            <Text style={styles.subtitle}>
              Nhập mã 5 chữ số đã gửi tới {email || 'email của bạn'}, sau đó tạo mật khẩu mới.
            </Text>

            <ErrorBanner message={error} onDismiss={() => setError('')} />

            <AppInput
              label="Mã xác thực"
              placeholder="00000"
              value={code}
              onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 5))}
              keyboardType="number-pad"
              maxLength={5}
              autoCorrect={false}
              leftIcon={
                <MaterialIcons name="pin" size={20} color={colors.onSurfaceVariant} />
              }
              inputStyle={styles.codeInput}
            />

            <AppInput
              label="Mật khẩu mới"
              placeholder="Tối thiểu 6 ký tự"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              leftIcon={
                <MaterialIcons
                  name="lock"
                  size={20}
                  color={colors.onSurfaceVariant}
                />
              }
            />

            <AppInput
              label="Xác nhận mật khẩu mới"
              placeholder="Nhập lại mật khẩu mới"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              leftIcon={
                <MaterialIcons
                  name="lock-outline"
                  size={20}
                  color={colors.onSurfaceVariant}
                />
              }
            />

            <AppButton
              title="Xác nhận đặt lại mật khẩu"
              onPress={handleResetPassword}
              loading={loading}
              size="lg"
              style={styles.submitBtn}
            />

            <Pressable disabled={resendAfter > 0 || loading} onPress={handleResend}>
              <Text style={[styles.resendText, resendAfter > 0 && styles.resendDisabled]}>
                {resendAfter > 0 ? `Gửi lại mã sau ${resendAfter}s` : 'Gửi lại mã'}
              </Text>
            </Pressable>

            <AppButton
              title="Quay lại đăng nhập"
              onPress={() => router.replace('/(auth)/login')}
              variant="ghost"
              size="md"
              style={styles.backBtn}
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
  card: {
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
  codeInput: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 10,
    textAlign: 'center',
  },
  resendText: {
    ...typography.labelMd,
    color: colors.primary,
    textAlign: 'center',
    fontWeight: '700',
    paddingTop: spacing.md,
  },
  resendDisabled: {
    color: colors.onSurfaceDisabled,
  },
  backBtn: {
    marginTop: spacing.md,
  },
});
