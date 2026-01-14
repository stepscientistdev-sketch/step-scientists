import React from 'react';
import {View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView} from 'react-native';
import {AchievementDefinition} from '@/types';

interface AchievementUnlockModalProps {
  visible: boolean;
  achievements: AchievementDefinition[];
  onClose: () => void;
}

export const AchievementUnlockModal: React.FC<AchievementUnlockModalProps> = ({
  visible,
  achievements,
  onClose,
}) => {
  if (achievements.length === 0) return null;

  const formatReward = (key: string, value: number) => {
    const rewardLabels: {[key: string]: {label: string; suffix: string}} = {
      bonusCellsPerDay: {label: 'Bonus Cells/Day', suffix: ''},
      discoveryEfficiency: {label: 'Discovery Efficiency', suffix: '%'},
      trainingEfficiency: {label: 'Training Efficiency', suffix: '%'},
      clickPower: {label: 'Click Power', suffix: 'x'},
      experienceBankCap: {label: 'XP Bank Cap', suffix: ''},
      trainingRosterSlots: {label: 'Roster Slots', suffix: ''},
      releaseXpBonus: {label: 'Release XP Bonus', suffix: '%'},
    };

    const reward = rewardLabels[key];
    if (!reward) return null;

    return (
      <Text key={key} style={styles.rewardText}>
        • {reward.label}: +{value === Infinity ? '∞' : value}{reward.suffix}
      </Text>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>🎉 Achievement Unlocked!</Text>
          
          <ScrollView style={styles.achievementList}>
            {achievements.map((achievement, index) => (
              <View key={index} style={styles.achievementCard}>
                <Text style={styles.achievementName}>{achievement.name}</Text>
                <Text style={styles.achievementSteps}>
                  {achievement.steps.toLocaleString()} steps
                </Text>
                <View style={styles.rewardsContainer}>
                  <Text style={styles.rewardsTitle}>Rewards:</Text>
                  {Object.entries(achievement.rewards).map(([key, value]) =>
                    formatReward(key, value as number)
                  )}
                </View>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Awesome!</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  achievementList: {
    maxHeight: 400,
  },
  achievementCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  achievementName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 4,
  },
  achievementSteps: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  rewardsContainer: {
    marginTop: 8,
  },
  rewardsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  rewardText: {
    fontSize: 14,
    color: '#4CAF50',
    marginLeft: 8,
    marginVertical: 2,
  },
  closeButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
