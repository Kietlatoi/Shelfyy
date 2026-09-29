import React, { useEffect, useState } from 'react';
import { StyleSheet, Animated } from 'react-native';
import { colors } from '../../constants/colors';
import { radius } from '../../constants/spacing';

export default function LoadingSkeleton({
  width = '100%',
  height = 20,
  borderRadius = radius.sm,
  style,
}) {
  const [opacityAnim] = useState(() => new Animated.Value(0.3));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.8,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.3,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [opacityAnim]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity: opacityAnim,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: colors.surfaceDim,
  },
});
