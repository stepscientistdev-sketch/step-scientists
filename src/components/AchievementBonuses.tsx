import React from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {LifetimeAchievement} from '@/types';

interface AchievementBonusesProps {
  achievements: LifetimeAchievement;
}

export const AchievementBonuses: React.FC<AchievementBonusesProps> = ({achievements}) => {
  const bonuses = [
    {
      icon: '🎁',
      label: 'Bonus Cells/Day',
      value: achievements.bonusCellsPerDay,
      suffix: '',
    },
    {
      icon: '⚡',
      label: 'Discovery Efficiency',
      value: achievements.discoveryEfficiency,
      suffix: '%',
    },
    {
      icon: '💪',
      label: 'Training Efficiency',
      value: achievements.trainingEfficiency,
      suffix: '%',
    },
    {
      icon: '🖱️',
      label: 'Click Power',
      value: achievements.clickPower,
      suffix: 'x',
    },
    {
      icon: '🏦',
      label: 'XP Bank Cap',
      value: achievements.experienceBankCap === Infinity ? '∞' : achievements.experienceBankCap,
      suffix: '',
    },
    {
      icon: '👥',
      label: 'Roster Slots',
      value: achievements.trainingRosterSlots,
      suffix: '',
    },
  ];

  if (achievements.releaseXpBonus > 0) {
    bonuses.push({
      icon: '💎',
      label: 'Release XP Bonus',
      value: achievements.releaseXpBonus,
      suffix: '%',
    });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🏆 Active Bonuses</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bonusScroll}>
        {bonuses.map((bonus, index) => (
          <View key={index} style={styles.bonusCard}>
            <Text style={styles.bonusIcon}>{bonus.icon}</Text>
            <Text style={styles.bonusValue}>
              {bonus.value}{bonus.suffix}
            </Text>
            <Text style={styles.bonusLabel}>{bonus.label}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  bonusScroll: {
    paddingHorizontal: 12,
  },
  bonusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    minWidth: 120,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bonusIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  bonusValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 4,
  },
  bonusLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});
