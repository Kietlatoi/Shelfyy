import React, { useState, useCallback } from 'react';
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
import { router, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { wardrobeApi } from '../../../src/api/wardrobeApi';
import { wardrobePreferenceApi } from '../../../src/api/wardrobePreferenceApi';
import { pageContent } from '../../../src/api/adapters';
import WardrobeCard from '../../../src/components/wardrobe/WardrobeCard';
import WardrobeFilters from '../../../src/components/wardrobe/WardrobeFilters';
import WardrobeStats from '../../../src/components/wardrobe/WardrobeStats';
import AppInput from '../../../src/components/common/AppInput';
import EmptyState from '../../../src/components/common/EmptyState';
import { colors } from '../../../src/constants/colors';
import { typography } from '../../../src/constants/typography';
import { spacing, shadows } from '../../../src/constants/spacing';

export default function WardrobeScreen() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [category, setCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchItems = useCallback(async (pageToFetch = 0, isRefresh = false) => {
    try {
      if (pageToFetch === 0 && !isRefresh) setLoading(true);

      const res = await wardrobeApi.getItems({
        category,
        q: searchQuery.trim() || undefined,
        page: pageToFetch,
        size: 20,
      });

      const rawItems = pageContent(res);
      const totalP = res?.totalPages ?? 1;
      setTotalPages(totalP);

      // Fetch preferences for items
      const itemIds = rawItems.map((it) => it.id);
      let prefsMap = {};
      if (itemIds.length > 0) {
        try {
          const prefs = await wardrobePreferenceApi.getPreferences(itemIds);
          if (Array.isArray(prefs)) {
            prefs.forEach((p) => {
              prefsMap[p.clothingItemId || p.itemId || p.id] = p;
            });
          }
        } catch {
          // Ignore preference fetch error
        }
      }

      const merged = rawItems.map((item) => {
        const pref = prefsMap[item.id];
        return {
          ...item,
          favorite: pref ? pref.favorite : item.favorite,
          status: pref?.status || item.status || 'IN_USE',
        };
      });

      if (pageToFetch === 0) {
        setItems(merged);
      } else {
        setItems((prev) => [...prev, ...merged]);
      }
      setPage(pageToFetch);
    } catch (err) {
      console.warn('Error fetching wardrobe items:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [category, searchQuery]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await wardrobeApi.getStats();
      setStats(data);
    } catch {
      // Ignore stats error
    }
  }, []);

  // Reload data when screen is focused
  useFocusEffect(
    useCallback(() => {
      void fetchItems(0);
      void fetchStats();
    }, [fetchItems, fetchStats])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchItems(0, true);
    fetchStats();
  };

  const handleLoadMore = () => {
    if (!loadingMore && page + 1 < totalPages) {
      setLoadingMore(true);
      fetchItems(page + 1);
    }
  };

  const handleFavoriteToggle = async (item) => {
    const newFav = !item.favorite;
    // Optimistic update
    setItems((prev) =>
      prev.map((it) => (it.id === item.id ? { ...it, favorite: newFav } : it))
    );

    try {
      await wardrobePreferenceApi.updatePreference(item.id, {
        favorite: newFav,
      });
    } catch {
      // Revert on error
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, favorite: !newFav } : it))
      );
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.cardCol}>
      <WardrobeCard
        item={item}
        onPress={() => router.push(`/(tabs)/wardrobe/${item.id}`)}
        onFavoriteToggle={handleFavoriteToggle}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Search Header */}
      <View style={styles.searchHeader}>
        <AppInput
          placeholder="Tìm kiếm theo tên, thương hiệu..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          containerStyle={styles.searchInputContainer}
          leftIcon={
            <MaterialIcons
              name="search"
              size={20}
              color={colors.onSurfaceVariant}
            />
          }
          rightIcon={
            searchQuery ? (
              <MaterialIcons
                name="clear"
                size={18}
                color={colors.onSurfaceVariant}
              />
            ) : null
          }
          onRightIconPress={() => setSearchQuery('')}
        />
      </View>

      {/* Category Chips */}
      <View style={styles.filtersContainer}>
        <WardrobeFilters
          selectedCategory={category}
          onSelectCategory={setCategory}
        />
      </View>

      {/* Wardrobe Stats bar */}
      <WardrobeStats stats={stats} totalCount={items.length} />

      {/* Grid of Items */}
      {loading && items.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Đang tải tủ đồ...</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            !loading ? (
              <EmptyState
                icon="checkroom"
                title="Tủ đồ của bạn còn trống"
                description="Bắt đầu thêm các món đồ yêu thích để khám phá các gợi ý phối đồ từ Shelfy!"
                actionTitle="Thêm món đồ ngay"
                onAction={() => router.push('/(tabs)/wardrobe/add')}
              />
            ) : null
          }
        />
      )}

      {/* Floating Action Button (FAB) */}
      <Pressable
        onPress={() => router.push('/(tabs)/wardrobe/add')}
        style={styles.fab}
      >
        <MaterialIcons name="add" size={28} color={colors.white} />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  searchInputContainer: {
    marginBottom: spacing.xs,
  },
  filtersContainer: {
    marginBottom: spacing.xs,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: 90,
  },
  cardCol: {
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
  footerLoader: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.xl,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.glow(colors.primary),
  },
});
