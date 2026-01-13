import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {RootState, AppDispatch} from '@/store';
import {claimMilestoneReward} from '@/store/slices/gameSlice';
import {gameService} from '@/services/gameService';
import {RarityTier} from '@/types';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const MilestoneProgress: React.FC<Props> = ({visible, onClose}) => {
  const dispatch = useDispatch<AppDispatch>();
  const {milestoneProgress, loading} = useSelector((state: RootState) => state.game);

  if (!visible || !milestoneProgress) {
    return null;
  }

  const milestones = gameService.getAvailableMilestones();

  const handleClaimReward = async (threshold: number) => {
    try {
      const result = await dispatch(claimMilestoneReward(threshold)).unwrap();
      if (result.magnifyingGlass) {
        Alert.alert(
          'Milestone Reward Claimed!',
          `You received a ${result.magnifyingGlass.tier} Magnifying Glass!`,
          [{text: 'Awesome!', style: 'default'}]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to claim milestone reward');
    }
  };

  const getRarityColor = (tier: RarityTier): string => {
    switch (tier) {
      case RarityTier.COMMON:
        return '#95a5a6';
      case RarityTier.UNCOMMON:
        return '#27ae60';
      case RarityTier.RARE:
        return '#3498db';
      case RarityTier.EPIC:
        return '#9b59b6';
      case RarityTier.LEGENDARY:
        return '#f39c12';
      default:
        return '#95a5a6';
    }
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Milestone Progress</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.totalSteps}>
          Total Steps: {milestoneProgress.totalSteps.toLocaleString()}
        </Text>

        <ScrollView style={styles.milestoneList}>
          {milestones.map((milestone) => (
            <View key={milestone.threshold} style={styles.milestoneCard}>
              <View style={styles.milestoneHeader}>
                <Text style={styles.milestoneName}>{milestone.name}</Text>
                <Text style={styles.milestoneThreshold}>
                  {milestone.threshold.toLocaleString()} steps
                </Text>
              </View>

              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${milestone.progress * 100}%`,
                        backgroundColor: getRarityColor(milestone.tier),
                      },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {Math.round(milestone.progress * 100)}%
                </Text>
              </View>

              <View style={styles.milestoneFooter}>
                <View
                  style={[
                    styles.tierBadge,
                    {backgroundColor: getRarityColor(milestone.tier)},
                  ]}
                >
                  <Text style={styles.tierText}>{milestone.tier.toUpperCase()}</Text>
                </View>

                {milestone.reached && !milestone.rewardClaimed ? (
                  <TouchableOpacity
                    style={styles.claimButton}
                    onPress={() => handleClaimReward(milestone.threshold)}
                    disabled={loading}
                  >
                    <Text style={styles.claimButtonText}>
                      {loading ? 'Claiming...' : 'Claim Reward'}
                    </Text>
                  </TouchableOpacity>
                ) : milestone.rewardClaimed ? (
                  <View style={styles.claimedBadge}>
                    <Text style={styles.claimedText}>✓ Claimed</Text>
                  </View>
                ) : (
                  <View style={styles.lockedBadge}>
                    <Text style={styles.lockedText}>🔒 Locked</Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ecf0f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#7f8c8d',
    fontWeight: 'bold',
  },
  totalSteps: {
    fontSize: 16,
    color: '#3498db',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  milestoneList: {
    maxHeight: 400,
  },
  milestoneCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  milestoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  milestoneName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
  },
  milestoneThreshold: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#ecf0f1',
    borderRadius: 4,
    marginRight: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#7f8c8d',
    fontWeight: '500',
    minWidth: 35,
  },
  milestoneFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tierText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  claimButton: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
  },
  claimButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  claimedBadge: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  claimedText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  lockedBadge: {
    backgroundColor: '#95a5a6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  lockedText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default MilestoneProgress;