import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import type { BookingLogEntry } from '@workspace/api-client-react';
import { StatusBadge } from '@/components/StatusBadge';
import { useColors } from '@/hooks/useColors';

interface BookingLogItemProps {
  entry: BookingLogEntry;
}

function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
      ' · ' +
      d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return isoString;
  }
}

export function BookingLogItem({ entry }: BookingLogItemProps) {
  const colors = useColors();
  const isSuccess = entry.outcome === 'success';

  return (
    <View
      style={[
        styles.item,
        {
          backgroundColor: colors.card,
          borderColor: isSuccess ? colors.successBg : colors.border,
          borderRadius: colors.radius,
          borderWidth: 1,
          borderLeftWidth: isSuccess ? 4 : 1,
          borderLeftColor: isSuccess ? colors.success : colors.border,
        },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.titleGroup}>
          <Text style={[styles.activityName, { color: colors.foreground }]} numberOfLines={1}>
            {entry.activityName ?? 'Unknown Activity'}
          </Text>
          {entry.level && (
            <Text style={[styles.level, { color: colors.mutedForeground }]}>{entry.level}</Text>
          )}
        </View>
        <StatusBadge variant={entry.outcome} small />
      </View>

      {isSuccess && entry.confirmationNumber && (
        <View style={styles.confirmRow}>
          <Ionicons name="checkmark-circle" size={14} color={colors.success} />
          <Text style={[styles.confirmation, { color: colors.success }]}>
            #{entry.confirmationNumber}
          </Text>
        </View>
      )}

      {entry.classDate && (
        <View style={styles.metaItem}>
          <Feather name="calendar" size={12} color={colors.mutedForeground} />
          <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
            {entry.classDate}{entry.classTime ? ` · ${entry.classTime}` : ''}
          </Text>
        </View>
      )}

      {entry.notes && (
        <Text style={[styles.notes, { color: colors.mutedForeground }]} numberOfLines={2}>
          {entry.notes}
        </Text>
      )}

      <Text style={[styles.timestamp, { color: colors.mutedForeground }]}>
        {formatDate(entry.attemptedAt)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    shadowColor: '#003c96',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  titleGroup: {
    flex: 1,
  },
  activityName: {
    fontSize: 15,
    fontFamily: 'Nunito_700Bold',
    marginBottom: 1,
  },
  level: {
    fontSize: 12,
    fontFamily: 'Nunito_600SemiBold',
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  confirmation: {
    fontSize: 13,
    fontFamily: 'Nunito_700Bold',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  metaText: {
    fontSize: 12,
    fontFamily: 'Nunito_600SemiBold',
  },
  notes: {
    fontSize: 12,
    fontFamily: 'Nunito_400Regular',
    marginBottom: 6,
    lineHeight: 17,
  },
  timestamp: {
    fontSize: 11,
    fontFamily: 'Nunito_400Regular',
    marginTop: 2,
  },
});
