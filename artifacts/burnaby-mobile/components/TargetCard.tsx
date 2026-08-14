import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import type { SchedulerTargetStatus } from '@workspace/api-client-react';
import { StatusBadge } from '@/components/StatusBadge';
import { useColors } from '@/hooks/useColors';

interface TargetCardProps {
  target: SchedulerTargetStatus;
}

function formatTime(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  try {
    return new Date(isoString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function formatRelative(isoString: string | null | undefined): string {
  if (!isoString) return 'Never checked';
  try {
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  } catch {
    return '—';
  }
}

export function TargetCard({ target }: TargetCardProps) {
  const colors = useColors();

  const isActive = target.schedulerState === 'active_window';

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isActive ? colors.primary : colors.border,
          borderRadius: colors.radius,
          borderWidth: isActive ? 1.5 : 1,
        },
      ]}
    >
      {/* Header row */}
      <View style={styles.header}>
        <View style={styles.titleGroup}>
          <Text style={[styles.activityName, { color: colors.foreground }]} numberOfLines={1}>
            {target.activityName}
          </Text>
          <Text style={[styles.level, { color: colors.mutedForeground }]} numberOfLines={1}>
            {target.level}
          </Text>
        </View>
        <StatusBadge variant={target.schedulerState} />
      </View>

      {/* Meta row */}
      <View style={styles.metaRow}>
        {target.registrationDate && (
          <View style={styles.metaItem}>
            <Feather name="calendar" size={12} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
              {target.registrationDate}
            </Text>
          </View>
        )}
        {(target.checkWindowStart || target.checkWindowEnd) && (
          <View style={styles.metaItem}>
            <Feather name="clock" size={12} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
              {target.checkWindowStart ?? '—'} – {target.checkWindowEnd ?? '—'}
            </Text>
          </View>
        )}
      </View>

      {/* Footer row */}
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <View style={styles.metaItem}>
          <Ionicons name="checkmark-circle-outline" size={13} color={colors.mutedForeground} />
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            {formatRelative(target.lastCheckedAt)}
          </Text>
        </View>
        {target.nextCheckAt && target.schedulerState === 'waiting' && (
          <View style={styles.metaItem}>
            <Feather name="refresh-cw" size={12} color={colors.mutedForeground} />
            <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
              Next {formatTime(target.nextCheckAt)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#003c96',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 8,
  },
  titleGroup: {
    flex: 1,
  },
  activityName: {
    fontSize: 17,
    fontFamily: 'Nunito_800ExtraBold',
    marginBottom: 2,
  },
  level: {
    fontSize: 13,
    fontFamily: 'Nunito_600SemiBold',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontFamily: 'Nunito_600SemiBold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerText: {
    fontSize: 12,
    fontFamily: 'Nunito_400Regular',
  },
});
