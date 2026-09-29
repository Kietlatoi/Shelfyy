import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { resetPassword } from '../../src/api/authApi';
import AppButton from '../../src/components/common/AppButton';
import AppInput from '../../src/components/common/AppInput';
import ErrorBanner from '../../src/components/common/ErrorBanner';
import { colors } from '../../src/constants/colors';
import { typography } from '../../src/constants/typography';
import { spacing, radius } from '../../src/constants/spacing';

export default function ResetPasswordScreen() {
  const { token, oobCode } = useLocalSearchParams();
  const resetCode = Array.isArray(oobCode) ? oobCode[0] : oobCode || token;
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleResetPassword = async () => {
    if (!resetCode) {
      setError('Mã xác thực (token) không hợp lệ hoặc đã hết hạn.');
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
        oobCode: String(resetCode),
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
      setError(err.message || 'Không thể đặt lại mật khẩu. Link có thể đã hết hạn.');
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
              Nhập mật khẩu mới cho tài khoản Shelfy của bạn.
            </Text>

            <ErrorBanner message={error} onDismiss={() => setError('')} />

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
  backBtn: {
    marginTop: spacing.md,
  },
});
