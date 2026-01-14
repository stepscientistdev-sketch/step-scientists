import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {lifetimeAchievementService} from '@/services/lifetimeAchievementService';

interface AchievementProgressProps {
  totalSteps: number;
}

export const AchievementProgress: React.FC<AchievementProgressProps> = ({totalSteps}) => {
  const nextMilestone = lifetimeAchievementService.getNextMilestone(totalSteps);
  const progress = lifetimeAchievementService.getMilestoneProgress(totalSteps);

  if (!nextMilestone) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>🏆 All Milestones Complete!</Text>
        <Text style={styles.subtitle}>Infinite progression continues...</Text>
      </View>
    );
  }

  const stepsRemaining = nextMilestone.steps - totalSteps;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Next Achievement</Text>
        <Text style={styles.percentage}>{progress}%</Text>
      </View>
      
      <Text style={styles.achievementName}>{nextMilestone.name}</Text>
      <Text style={styles.stepsRemaining}>
        {stepsRemaining.toLocaleString()} steps remaining
      </Text>

      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, {width: `${progress}%`}]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  percentage: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  achievementName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 4,
  },
  stepsRemaining: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
});
