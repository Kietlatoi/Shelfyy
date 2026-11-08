import React, { useEffect, useRef, useState } from 'react';
import {
  Platform,
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { typography } from '../../constants/typography';
import { radius, spacing } from '../../constants/spacing';

export default function AppInput({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  keyboardType = 'default',
  autoCapitalize = 'none',
  autoCorrect,
  spellCheck,
  editable = true,
  multiline = false,
  numberOfLines = 1,
  maxLength,
  style,
  inputStyle,
  containerStyle,
}) {
  const inputRef = useRef(null);
  const [initialNativeValue] = useState(() => String(value ?? ''));
  const nativeValueRef = useRef(initialNativeValue);
  const lastEmittedValueRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isSecure, setIsSecure] = useState(secureTextEntry);
  const normalizedValue = String(value ?? '');
  const textAssistanceEnabled = autoCorrect
    ?? (!secureTextEntry && keyboardType === 'default');

  // Echoing `value` or a changing `defaultValue` after every keystroke can
  // interrupt Android IME composition (Telex/VNI included). Keep Android
  // native-controlled while typing, then only push true external changes.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    if (normalizedValue === lastEmittedValueRef.current) {
      lastEmittedValueRef.current = null;
      return;
    }
    if (normalizedValue !== nativeValueRef.current) {
      inputRef.current?.setNativeProps({ text: normalizedValue });
      nativeValueRef.current = normalizedValue;
    }
  }, [normalizedValue]);

  const handleChangeText = (text) => {
    nativeValueRef.current = text;
    lastEmittedValueRef.current = text;
    onChangeText?.(text);
  };

  const toggleSecure = () => {
    setIsSecure((prev) => !prev);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.inputWrapperFocused,
          Boolean(error) && styles.inputWrapperError,
          !editable && styles.inputWrapperDisabled,
          multiline && { height: numberOfLines * 24 + 24, alignItems: 'flex-start' },
          style,
        ]}
      >
        {leftIcon && <View style={styles.leftIconContainer}>{leftIcon}</View>}

        <TextInput
          ref={inputRef}
          {...(Platform.OS === 'android'
            ? { defaultValue: initialNativeValue }
            : { value: normalizedValue })}
          onChangeText={handleChangeText}
          placeholder={placeholder}
          accessibilityLabel={label || placeholder}
          placeholderTextColor={colors.onSurfaceDisabled}
          secureTextEntry={isSecure}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={textAssistanceEnabled}
          spellCheck={spellCheck ?? textAssistanceEnabled}
          editable={editable}
          multiline={multiline}
          numberOfLines={numberOfLines}
          maxLength={maxLength}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={[
            styles.input,
            multiline && { textAlignVertical: 'top' },
            inputStyle,
          ]}
        />

        {secureTextEntry ? (
          <Pressable accessibilityRole="button" accessibilityLabel={isSecure ? 'Hiện mật khẩu' : 'Ẩn mật khẩu'} onPress={toggleSecure} style={styles.rightIconContainer}>
            <MaterialIcons
              name={isSecure ? 'visibility-off' : 'visibility'}
              size={20}
              color={colors.onSurfaceVariant}
            />
          </Pressable>
        ) : rightIcon ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Xóa nội dung"
            onPress={onRightIconPress}
            style={styles.rightIconContainer}
            disabled={!onRightIconPress}
          >
            {rightIcon}
          </Pressable>
        ) : null}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
    width: '100%',
  },
  label: {
    ...typography.labelMd,
    color: colors.onSurfaceMedium,
    marginBottom: spacing.xs + 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    minHeight: 52,
  },
  inputWrapperFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  inputWrapperError: {
    borderColor: colors.error,
  },
  inputWrapperDisabled: {
    backgroundColor: colors.surfaceVariant,
    opacity: 0.7,
  },
  input: {
    flex: 1,
    ...typography.bodyMd,
    color: colors.onSurface,
    paddingVertical: spacing.sm,
  },
  leftIconContainer: {
    marginRight: spacing.sm,
  },
  rightIconContainer: {
    marginLeft: spacing.sm,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },
});
