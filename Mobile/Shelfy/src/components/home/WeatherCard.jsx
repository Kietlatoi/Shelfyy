import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { getCurrentLocation } from '../../utils/geolocation';
import { weatherApi } from '../../api/weatherApi';
import { adaptWeatherSnapshot } from '../../api/adapters';
import { colors } from '../../constants/colors';
import { typography } from '../../constants/typography';
import { radius, shadows, spacing } from '../../constants/spacing';

export default function WeatherCard({ onWeatherLoaded }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [usingDefaultLocation, setUsingDefaultLocation] = useState(false);

  const fetchWeather = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const location = await getCurrentLocation();
      const snapshot = await weatherApi.createSnapshot({
        lat: location.lat,
        lon: location.lon,
      });
      const adapted = adaptWeatherSnapshot(snapshot);
      setWeather(adapted);
      setUsingDefaultLocation(location.isFallback);
      if (onWeatherLoaded) onWeatherLoaded(adapted);
    } catch {
      // Fallback: try to fetch latest snapshot
      try {
        const latest = await weatherApi.latestSnapshot();
        const adapted = adaptWeatherSnapshot(latest);
        setWeather(adapted);
        setUsingDefaultLocation(false);
        if (onWeatherLoaded) onWeatherLoaded(adapted);
      } catch {
        // Default mock if completely offline
        setUsingDefaultLocation(false);
        setWeather({
          location: 'Hồ Chí Minh',
          temperature: 28,
          feelsLike: 30,
          condition: 'Trời quang',
          humidity: 78,
          windSpeed: 4.5,
          isDay: true,
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWeather();
  }, []);

  const getWeatherIcon = (condition, isDay) => {
    const c = String(condition || '').toLowerCase();
    if (c.includes('mưa')) return 'grain';
    if (c.includes('dông') || c.includes('sấm')) return 'thunderstorm';
    if (c.includes('mây')) return 'cloud';
    if (c.includes('sương')) return 'foggy';
    return isDay ? 'wb-sunny' : 'nightlight-round';
  };

  if (loading) {
    return (
      <View style={[styles.card, styles.loadingCard]}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.loadingText}>Đang cập nhật thời tiết...</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {/* Top row: Location & Refresh button */}
      <View style={styles.headerRow}>
        <View style={styles.locationRow}>
          <MaterialIcons name="place" size={18} color={colors.primary} />
          <Text style={styles.locationText}>{weather?.location || 'Vị trí hiện tại'}</Text>
        </View>

        <Pressable
          onPress={() => fetchWeather(true)}
          style={styles.refreshBtn}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <MaterialIcons name="refresh" size={20} color={colors.onSurfaceVariant} />
          )}
        </Pressable>
      </View>

      {usingDefaultLocation && (
        <Text style={styles.locationNotice}>
          Chưa lấy được vị trí. Đang dùng vị trí mặc định: TP. Hồ Chí Minh.
        </Text>
      )}

      {/* Main Temp & Condition */}
      <View style={styles.mainRow}>
        <View>
          <Text style={styles.temperature}>{weather?.temperature}°C</Text>
          <Text style={styles.condition}>{weather?.condition}</Text>
          <Text style={styles.feelsLike}>Cảm giác như {weather?.feelsLike}°C</Text>
        </View>

        <View style={styles.iconCircle}>
          <MaterialIcons
            name={getWeatherIcon(weather?.condition, weather?.isDay)}
            size={44}
            color={colors.gold}
          />
        </View>
      </View>

      {/* Metrics Row */}
      <View style={styles.metricsRow}>
        <View style={styles.metricItem}>
          <MaterialIcons name="water-drop" size={16} color={colors.info} />
          <Text style={styles.metricLabel}>Độ ẩm: {weather?.humidity}%</Text>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metricItem}>
          <MaterialIcons name="air" size={16} color={colors.secondary} />
          <Text style={styles.metricLabel}>Gió: {weather?.windSpeed} km/h</Text>
        </View>
      </View>
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
    paddingVertical: spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    marginTop: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    ...typography.titleSm,
    color: colors.onSurface,
    marginLeft: spacing.xs,
  },
  refreshBtn: {
    padding: spacing.xs,
  },
  locationNotice: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.md,
  },
  mainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  temperature: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.onSurface,
    lineHeight: 46,
  },
  condition: {
    ...typography.titleMd,
    color: colors.onSurfaceMedium,
    marginTop: 2,
  },
  feelsLike: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.surfaceVariant,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceMedium,
    marginLeft: spacing.xs,
  },
  metricDivider: {
    width: 1,
    height: 16,
    backgroundColor: colors.borderMedium,
  },
});
