import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, Pressable, AppState } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { calendarApi } from '../../api/calendarApi';
import AppButton from '../common/AppButton';
import { colors } from '../../constants/colors';
import { typography } from '../../constants/typography';
import { radius, shadows, spacing } from '../../constants/spacing';

export default function CalendarCard() {
  const [status, setStatus] = useState(null); // { connected: boolean, email?: string }
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [loadError, setLoadError] = useState('');

  const loadCalendarData = useCallback(async () => {
    try {
      setLoadError('');
      const res = await calendarApi.status();
      setStatus(res);
      if (res?.connected) {
        const todayData = await calendarApi.today();
        setEvents(todayData?.events || []);
        if (todayData?.connected === false) setStatus(todayData);
      } else {
        setEvents([]);
      }
    } catch (err) {
      setLoadError(err.message || 'Không tải được lịch. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = setTimeout(() => { void loadCalendarData(); }, 0);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') loadCalendarData();
    });
    return () => {
      clearTimeout(initialLoad);
      subscription.remove();
    };
  }, [loadCalendarData]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await calendarApi.connect();
      if (!res?.authorizationUrl) throw new Error('Không nhận được liên kết Google Calendar.');
      // Tokens stay on the backend. Refresh on return, including Expo Go where
      // the app's custom shelfy:// scheme is not registered.
      await WebBrowser.openBrowserAsync(res.authorizationUrl);
      await loadCalendarData();
    } catch (err) {
      Alert.alert('Thông báo', err.message || 'Chưa thể kết nối Google Calendar lúc này.');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    Alert.alert(
      'Ngắt kết nối',
      'Bạn có chắc muốn ngắt kết nối Google Calendar?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Ngắt kết nối',
          style: 'destructive',
          onPress: async () => {
            try {
              await calendarApi.disconnect();
              setStatus({ connected: false });
              setEvents([]);
            } catch (err) {
              Alert.alert('Lỗi', err.message || 'Không thể ngắt kết nối');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.card, styles.loadingCard]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <MaterialIcons name="event" size={20} color={colors.primary} />
          <Text style={styles.title}>Lịch trình hôm nay</Text>
        </View>

        {status?.connected && (
          <Pressable onPress={handleDisconnect} style={styles.disconnectBtn}>
            <Text style={styles.disconnectText}>Ngắt kết nối</Text>
          </Pressable>
        )}
      </View>

      {loadError ? (
        <View>
          <Text style={styles.notConnectedDesc}>{loadError}</Text>
          <AppButton title="Tải lại lịch" onPress={loadCalendarData} variant="outline" size="sm" />
        </View>
      ) : status?.connected ? (
        <View>
          {status.email ? (
            <Text style={styles.connectedEmail}>Tài khoản: {status.email}</Text>
          ) : null}

          {events.length > 0 ? (
            <View style={styles.eventsList}>
              {events.map((evt, idx) => (
                <View key={evt.id || idx} style={styles.eventItem}>
                  <View style={styles.eventDot} />
                  <View style={styles.eventContent}>
                    <Text style={styles.eventTime}>
                      {evt.startTime || 'Cả ngày'} {evt.endTime ? `- ${evt.endTime}` : ''}
                    </Text>
                    <Text style={styles.eventSummary} numberOfLines={1}>
                      {evt.summary || evt.title || 'Sự kiện'}
                    </Text>
                    {evt.location ? (
                      <Text style={styles.eventLocation} numberOfLines={1}>
                        📍 {evt.location}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.noEventsBox}>
              <Text style={styles.noEventsText}>Không có sự kiện nào trong ngày hôm nay 🎉</Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.notConnectedBox}>
          <Text style={styles.notConnectedDesc}>
            Kết nối Google Calendar để Shelfy gợi ý trang phục phù hợp với các cuộc họp và sự kiện của bạn.
          </Text>
          <AppButton
            title="Kết nối Google Calendar"
            onPress={handleConnect}
            loading={connecting}
            variant="outline"
            size="sm"
            icon={<MaterialIcons name="sync" size={18} color={colors.primary} />}
            style={styles.connectBtn}
          />
          <Text style={styles.returnHint}>
            Sau khi cấp quyền Google, đóng trình duyệt và quay lại Shelfy để cập nhật lịch.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.sm,
    marginBottom: spacing.lg,
  },
  loadingCard: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    ...typography.titleMd,
    color: colors.onSurface,
    marginLeft: spacing.xs,
  },
  disconnectBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  disconnectText: {
    ...typography.caption,
    color: colors.error,
  },
  connectedEmail: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.sm,
  },
  eventsList: {
    marginTop: spacing.xs,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceVariant,
  },
  eventDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 6,
    marginRight: spacing.sm,
  },
  eventContent: {
    flex: 1,
  },
  eventTime: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  eventSummary: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '500',
  },
  eventLocation: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  noEventsBox: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  noEventsText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  notConnectedBox: {
    paddingVertical: spacing.xs,
  },
  notConnectedDesc: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  connectBtn: {
    alignSelf: 'flex-start',
  },
  returnHint: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
    marginTop: spacing.sm,
  },
});
