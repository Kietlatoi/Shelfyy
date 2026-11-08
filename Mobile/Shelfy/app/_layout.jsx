import React from 'react';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { useFonts } from 'expo-font';
import { colors } from '../src/constants/colors';
import { AuthProvider } from '../src/contexts/AuthContext';
import { GooglePlayBillingProvider } from '../src/contexts/GooglePlayBillingContext';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BeVietnamPro: require('../assets/fonts/BeVietnamPro-Regular.ttf'),
    'BeVietnamPro-SemiBold': require('../assets/fonts/BeVietnamPro-SemiBold.ttf'),
    'BeVietnamPro-Bold': require('../assets/fonts/BeVietnamPro-Bold.ttf'),
    Lora: require('../assets/fonts/Lora-Regular.ttf'),
  });

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <AuthProvider>
          <GooglePlayBillingProvider>
          <StatusBar style="dark" />
          <Slot />
          </GooglePlayBillingProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
