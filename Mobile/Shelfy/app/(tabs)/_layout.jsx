import React from 'react';
import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../src/constants/colors';
import { typography } from '../../src/constants/typography';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.onSurface,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.borderSubtle,
          borderTopWidth: 1,
          height: 66 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
          elevation: 0,
        },
        tabBarLabelStyle: {
          ...typography.labelSm,
          fontWeight: '600',
          fontSize: 10,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Trang chủ',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}><MaterialIcons name="home-filled" size={22} color={color} /></TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="wardrobe"
        options={{
          title: 'Tủ đồ',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}><Ionicons name="shirt-outline" size={21} color={color} /></TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="suggest"
        options={{
          title: 'Gợi ý',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}><MaterialIcons name="auto-awesome" size={21} color={color} /></TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="trial"
        options={{
          title: 'Thử đồ',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}><MaterialIcons name="camera-alt" size={21} color={color} /></TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Cá nhân',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}><MaterialIcons name="person-outline" size={23} color={color} /></TabIcon>
          ),
        }}
      />
    </Tabs>
  );
}

function TabIcon({ focused, children }) {
  return <View style={{ width: 48, height: 30, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: focused ? colors.accent : colors.transparent }}>{children}</View>;
}
