import React, { useCallback, useState } from 'react';
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
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useGetSchedulerStatus,
  useTriggerSchedulerNow,
  type SchedulerTargetStatus,
} from '@workspace/api-client-react';
import { TargetCard } from '@/components/TargetCard';
import { useColors } from '@/hooks/useColors';

export default function TargetsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';

  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 100 : 80 + insets.bottom;

  const [triggerResult, setTriggerResult] = useState<string | null>(null);

  const {
    data: schedulerStatus,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useGetSchedulerStatus({
    query: { refetchInterval: 15_000 },
  });

  const { mutate: triggerNow, isPending: isTriggering } = useTriggerSchedulerNow({
    mutation: {
      onSuccess: (data) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const msg = data.targetsChecked
          ? `Checked ${data.targetsChecked} target${data.targetsChecked !== 1 ? 's' : ''}`
          : data.message;
        setTriggerResult(msg);
        setTimeout(() => setTriggerResult(null), 4000);
        refetch();
      },
      onError: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setTriggerResult('Check failed — verify API key');
        setTimeout(() => setTriggerResult(null), 4000);
      },
    },
  });

  const handleTriggerNow = useCallback(() => {
    if (isTriggering) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    triggerNow({});
  }, [isTriggering, triggerNow]);

  const targets: SchedulerTargetStatus[] = schedulerStatus?.targets ?? [];
  const isRunning = schedulerStatus?.isRunning ?? false;

  const renderTarget = useCallback(
    ({ item }: { item: SchedulerTargetStatus }) => <TargetCard target={item} />,
    [],
  );

  const keyExtractor = useCallback(
    (item: SchedulerTargetStatus) => String(item.targetId),
    [],
  );

  const ListHeader = (
    <View style={[styles.listHeader, { paddingTop: topPad + 16 }]}>
      {/* Title + scheduler status */}
      <View style={styles.titleRow}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Burnaby</Text>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isRunning ? colors.success : colors.mutedForeground },
              ]}
            />
            <Text style={[styles.statusText, { color: colors.mutedForeground }]}>
              Scheduler {isRunning ? 'running' : 'stopped'}
            </Text>
          </View>
        </View>
        {schedulerStatus?.smsConfigured && (
          <Ionicons name="phone-portrait-outline" size={20} color={colors.primary} />
        )}
      </View>

      {/* Trigger Now button */}
      <Pressable
        onPress={handleTriggerNow}
        disabled={isTriggering}
        style={({ pressed }) => [
          styles.triggerButton,
          {
            backgroundColor: isTriggering ? colors.muted : colors.primary,
            borderRadius: colors.radius,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
        testID="trigger-now-button"
      >
        {isTriggering ? (
          <ActivityIndicator color={colors.primaryForeground} size="small" />
        ) : (
          <Feather name="zap" size={18} color={colors.primaryForeground} />
        )}
        <Text
          style={[
            styles.triggerButtonText,
            { color: isTriggering ? colors.mutedForeground : colors.primaryForeground },
          ]}
        >
          {isTriggering ? 'Checking…' : 'Run Check Now'}
        </Text>
      </Pressable>

      {/* Result toast */}
      {triggerResult && (
        <View style={[styles.resultBanner, { backgroundColor: colors.successBg, borderRadius: colors.radius / 2 }]}>
          <Ionicons name="checkmark-circle" size={15} color={colors.success} />
          <Text style={[styles.resultText, { color: colors.success }]}>{triggerResult}</Text>
        </View>
      )}

      {/* Section label */}
      {targets.length > 0 && (
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          {targets.length} target{targets.length !== 1 ? 's' : ''}
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
        data={targets}
        keyExtractor={keyExtractor}
        renderItem={renderTarget}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={{ paddingBottom: bottomPad }}
        scrollEnabled={!!targets.length}
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
            <Ionicons name="calendar-outline" size={44} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No targets yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
              Add targets from the web dashboard
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
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Nunito_800ExtraBold',
    lineHeight: 36,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontFamily: 'Nunito_600SemiBold',
  },
  triggerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 8,
    marginBottom: 12,
  },
  triggerButtonText: {
    fontSize: 16,
    fontFamily: 'Nunito_700Bold',
  },
  resultBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  resultText: {
    fontSize: 13,
    fontFamily: 'Nunito_600SemiBold',
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: 'Nunito_700Bold',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 4,
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
