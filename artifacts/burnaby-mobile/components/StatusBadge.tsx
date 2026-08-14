import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';

type SchedulerState = 'waiting' | 'active_window' | 'booked' | 'cancelled';
type BookingOutcome = 'success' | 'failed' | 'no_spot' | 'scraper_error' | 'window_closed';

type BadgeVariant = SchedulerState | BookingOutcome;

interface StatusBadgeProps {
  variant: BadgeVariant;
  small?: boolean;
}

const LABELS: Record<BadgeVariant, string> = {
  waiting: 'Waiting',
  active_window: 'Checking',
  booked: 'Booked',
  cancelled: 'Cancelled',
  success: 'Booked',
  failed: 'Failed',
  no_spot: 'No Spot',
  scraper_error: 'Error',
  window_closed: 'Closed',
};

export function StatusBadge({ variant, small = false }: StatusBadgeProps) {
  const colors = useColors();

  const getColors = (): { bg: string; text: string } => {
    switch (variant) {
      case 'booked':
      case 'success':
        return { bg: colors.successBg, text: colors.success };
      case 'active_window':
        return { bg: colors.infoBg, text: colors.info };
      case 'waiting':
        return { bg: colors.muted, text: colors.mutedForeground };
      case 'cancelled':
      case 'failed':
      case 'scraper_error':
        return { bg: '#fee2e2', text: colors.destructive };
      case 'no_spot':
        return { bg: colors.warningBg, text: colors.warning };
      case 'window_closed':
        return { bg: colors.muted, text: colors.mutedForeground };
      default:
        return { bg: colors.muted, text: colors.mutedForeground };
    }
  };

  const { bg, text } = getColors();

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: bg, borderRadius: colors.radius / 1.5 },
        small && styles.small,
      ]}
    >
      <Text
        style={[
          styles.label,
          { color: text },
          small && styles.smallLabel,
        ]}
        numberOfLines={1}
      >
        {LABELS[variant] ?? variant}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  small: {
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  label: {
    fontSize: 12,
    fontFamily: 'Nunito_700Bold',
    letterSpacing: 0.2,
  },
  smallLabel: {
    fontSize: 11,
  },
});
