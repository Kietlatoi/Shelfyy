import React from 'react';
import { Stack } from 'expo-router';

export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="favorites" />
      <Stack.Screen name="wear-history" />
      <Stack.Screen name="premium" />
    </Stack>
  );
}
