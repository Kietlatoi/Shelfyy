import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { wardrobeApi } from '../../../src/api/wardrobeApi';
import { wardrobePreferenceApi } from '../../../src/api/wardrobePreferenceApi';
import { pageContent } from '../../../src/api/adapters';
import WardrobeCard from '../../../src/components/wardrobe/WardrobeCard';
import EmptyState from '../../../src/components/common/EmptyState';
import { colors } from '../../../src/constants/colors';
import { typography } from '../../../src/constants/typography';
import { spacing } from '../../../src/constants/spacing';

async function loadFavorites() {
  const res = await wardrobeApi.getItems({ size: 100 });
  const allItems = pageContent(res);
  const itemIds = allItems.map((item) => item.id);
  let prefs = [];
  if (itemIds.length > 0) {
    try {
      prefs = await wardrobePreferenceApi.getPreferences(itemIds);
    } catch {
      // Keep the canonical favorite/status fields from Firestore when preference lookup fails.
    }
  }

  const prefsMap = {};
  if (Array.isArray(prefs)) {
    prefs.forEach((preference) => {
      prefsMap[preference.clothingItemId || preference.itemId || preference.id] = preference;
    });
  }

  return allItems
    .map((item) => {
      const preference = prefsMap[item.id];
      return {
        ...item,
        favorite: preference ? preference.favorite : item.favorite,
        status: preference?.status || item.status || 'IN_USE',
      };
    })
    .filter((item) => Boolean(item.favorite));
}

export default function FavoritesScreen() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      setFavorites(await loadFavorites());
    } catch (err) {
      console.warn('Error fetching favorites:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    loadFavorites()
      .then((items) => { if (isMounted) setFavorites(items); })
      .catch((err) => console.warn('Error fetching favorites:', err))
      .finally(() => { if (isMounted) setLoading(false); });
    return () => { isMounted = false; };
  }, []);

  const handleFavoriteToggle = async (item) => {
    // Remove from favorite list
    setFavorites((prev) => prev.filter((it) => it.id !== item.id));

    try {
      await wardrobePreferenceApi.updatePreference(item.id, {
        favorite: false,
      });
    } catch {
      fetchFavorites();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.navBar}>
        <Pressable onPress={() => router.back()} style={styles.navBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.navTitle}>Món đồ yêu thích ({favorites.length})</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading && favorites.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Đang tải danh sách yêu thích...</Text>
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchFavorites();
              }}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.col}>
              <WardrobeCard
                item={item}
                onPress={() => router.push(`/(tabs)/wardrobe/${item.id}`)}
                onFavoriteToggle={handleFavoriteToggle}
              />
            </View>
          )}
          ListEmptyComponent={
            !loading ? (
              <EmptyState
                icon="favorite-border"
                title="Chưa có món đồ yêu thích"
                description="Nhấn vào biểu tượng trái tim trên bất kỳ món đồ nào trong tủ đồ để lưu vào đây!"
                actionTitle="Khám phá tủ đồ"
                onAction={() => router.push('/(tabs)/wardrobe')}
              />
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  navBtn: {
    padding: spacing.xs,
  },
  navTitle: {
    ...typography.titleMd,
    color: colors.onSurface,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing['4xl'],
  },
  col: {
    flex: 1,
    margin: spacing.xs + 2,
    maxWidth: '50%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    marginTop: spacing.sm,
  },
});
