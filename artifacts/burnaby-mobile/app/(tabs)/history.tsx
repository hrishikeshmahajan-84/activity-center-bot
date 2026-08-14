import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useListBookings, type BookingLogEntry } from '@workspace/api-client-react';
import { BookingLogItem } from '@/components/BookingLogItem';
import { useColors } from '@/hooks/useColors';

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';

  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 100 : 80 + insets.bottom;

  const {
    data: bookings,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useListBookings(
    { limit: 100 },
    { query: { refetchInterval: 30_000 } },
  );

  const renderItem = useCallback(
    ({ item }: { item: BookingLogEntry }) => <BookingLogItem entry={item} />,
    [],
  );

  const keyExtractor = useCallback(
    (item: BookingLogEntry) => String(item.id),
    [],
  );

  const successCount = bookings?.filter((b) => b.outcome === 'success').length ?? 0;
  const totalCount = bookings?.length ?? 0;

  const ListHeader = (
    <View style={[styles.listHeader, { paddingTop: topPad + 16 }]}>
      <Text style={[styles.title, { color: colors.foreground }]}>History</Text>
      {totalCount > 0 && (
        <View style={styles.summaryRow}>
          <View style={[styles.statPill, { backgroundColor: colors.successBg, borderRadius: colors.radius / 2 }]}>
            <Ionicons name="checkmark-circle" size={14} color={colors.success} />
            <Text style={[styles.statText, { color: colors.success }]}>
              {successCount} booked
            </Text>
          </View>
          <View style={[styles.statPill, { backgroundColor: colors.muted, borderRadius: colors.radius / 2 }]}>
            <Ionicons name="list-outline" size={14} color={colors.mutedForeground} />
            <Text style={[styles.statText, { color: colors.mutedForeground }]}>
              {totalCount} total
            </Text>
          </View>
        </View>
      )}
      {totalCount > 0 && (
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          Recent attempts
        </Text>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Ionicons name="cloud-offline-outline" size={40} color={colors.mutedForeground} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Can't reach server</Text>
        <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
          Make sure the API server is running
        </Text>
        <Pressable
          onPress={() => refetch()}
          style={[styles.retryButton, { borderColor: colors.border, borderRadius: colors.radius }]}
        >
          <Text style={[styles.retryText, { color: colors.primary }]}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={bookings ?? []}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={{ paddingBottom: bottomPad }}
        scrollEnabled={!!(bookings && bookings.length > 0)}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={44} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No history yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
              Booking attempts will appear here once the scheduler runs
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  listHeader: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Nunito_800ExtraBold',
    lineHeight: 36,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statText: {
    fontSize: 13,
    fontFamily: 'Nunito_700Bold',
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: 'Nunito_700Bold',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
    gap: 10,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Nunito_700Bold',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Nunito_400Regular',
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  retryText: {
    fontSize: 15,
    fontFamily: 'Nunito_700Bold',
  },
});
