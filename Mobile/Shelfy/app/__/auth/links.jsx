import React, { useEffect } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { getPasswordResetCode } from '../../../src/firebase/actionLinks';
import { colors } from '../../../src/constants/colors';

export default function FirebaseAuthLinkScreen() {
  const params = useLocalSearchParams();
  const code = getPasswordResetCode(params);

  useEffect(() => {
    if (code) {
      router.replace({ pathname: '/(auth)/reset-password', params: { oobCode: code } });
      return;
    }
    Alert.alert('Liên kết không hợp lệ', 'Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.');
    router.replace('/(auth)/forgot-password');
  }, [code]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
});
