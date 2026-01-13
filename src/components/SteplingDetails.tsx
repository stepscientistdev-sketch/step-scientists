import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { steplingService } from '../services/steplingService';
import { Stepling } from '../types';

interface SteplingDetailsProps {
  stepling: Stepling | null;
  visible: boolean;
  onClose: () => void;
  onSteplingUpdated?: (stepling: Stepling) => void;
}

export const SteplingDetails: React.FC<SteplingDetailsProps> = ({
  stepling,
  visible,
  onClose,
  onSteplingUpdated,
}) => {
  const [experienceInput, setExperienceInput] = useState('');
  const [loading, setLoading] = useState(false);

  if (!stepling) return null;

  const maxLevel = stepling.fusionLevel * 10;
  const isMaxLevel = stepling.level >= maxLevel;
  const expRequiredForNextLevel = stepling.level * 10;

  const handleLevelUp = async () => {
    const expPoints = parseInt(experienceInput);
    if (isNaN(expPoints) || expPoints <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid number of experience points');
      return;
    }

    setLoading(true);
    try {
      const result = await steplingService.levelUpStepling(stepling.id, expPoints);
      
      if (result.success && result.updatedStepling) {
        onSteplingUpdated?.(result.updatedStepling);
        setExperienceInput('');
        Alert.alert(
          'Level Up Success!',
          `${stepling.speciesId} is now level ${result.updatedStepling.level}!`
        );
      } else {
        Alert.alert('Level Up Failed', result.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Error leveling up stepling:', error);
      Alert.alert('Error', 'Failed to level up stepling');
    } finally {
      setLoading(false);
    }
  };

  const getFusionCandidates = () => {
    return steplingService.getFusionCandidates(stepling.id);
  };

  const handleFusion = async () => {
    const candidates = getFusionCandidates();
    if (candidates.length === 0) {
      Alert.alert(
        'No Fusion Candidates',
        'You need another stepling of the same species and fusion level to fuse.'
      );
      return;
    }

    // For simplicity, use the first candidate
    const candidate = candidates[0];
    
    Alert.alert(
      'Confirm Fusion',
      `Fuse this stepling with another ${stepling.speciesId} (Level ${candidate.level})?\n\nThis will create a new stepling at fusion level ${stepling.fusionLevel + 1} and destroy both original steplings.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Fuse', style: 'destructive', onPress: () => performFusion() },
      ]
    );
  };

  const performFusion = async (forceNonMax: boolean = false) => {
    const candidates = getFusionCandidates();
    if (candidates.length === 0) return;

    setLoading(true);
    try {
      // Assume we have 10 discovered species for now (this should come from game state)
      const result = await steplingService.fuseSteplings(stepling.id, candidates[0].id, 10, forceNonMax);
      
      if (result.success && result.newStepling) {
        Alert.alert(
          'Fusion Success!',
          `Created a new ${result.newStepling.speciesId} at fusion level ${result.newStepling.fusionLevel}!`
        );
        onClose(); // Close the modal since the original stepling no longer exists
      } else if (result.error === 'NON_MAX_FUSION_WARNING' && result.warningData) {
        // Show warning dialog
        const { stepling1Level, stepling1MaxLevel, stepling2Level, stepling2MaxLevel } = result.warningData;
        Alert.alert(
          'Non-Max Fusion Warning',
          `Warning: You are about to fuse steplings that are not at maximum level!\n\n` +
          `Current stepling: Level ${stepling1Level}/${stepling1MaxLevel}\n` +
          `Fusion partner: Level ${stepling2Level}/${stepling2MaxLevel}\n\n` +
          `Fusing non-maxed steplings will permanently mark the resulting stepling as "imperfect" and may result in lower stats.\n\n` +
          `Are you sure you want to proceed?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Fuse Anyway', 
              style: 'destructive', 
              onPress: () => performFusion(true) 
            },
          ]
        );
      } else {
        Alert.alert('Fusion Failed', result.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Error fusing steplings:', error);
      Alert.alert('Error', 'Failed to fuse steplings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{stepling.speciesId}</Text>
            {stepling.hasSuboptimalFusion && (
              <View style={styles.imperfectBadge}>
                <Text style={styles.imperfectBadgeText}>⚠️ IMPERFECT</Text>
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.levelInfo}>
          <Text style={styles.levelText}>
            Level {stepling.level} / {maxLevel}
          </Text>
          <Text style={styles.fusionText}>
            Fusion Level {stepling.fusionLevel}
          </Text>
          {!isMaxLevel && (
            <Text style={styles.expRequiredText}>
              Next Level: {expRequiredForNextLevel} EXP
            </Text>
          )}
          {isMaxLevel && (
            <Text style={styles.maxLevelText}>MAX LEVEL REACHED</Text>
          )}
        </View>

        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Current Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Health</Text>
              <Text style={styles.statValue}>{stepling.currentStats.health}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Attack</Text>
              <Text style={styles.statValue}>{stepling.currentStats.attack}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Defense</Text>
              <Text style={styles.statValue}>{stepling.currentStats.defense}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Special</Text>
              <Text style={styles.statValue}>{stepling.currentStats.special}</Text>
            </View>
          </View>
        </View>

        {!isMaxLevel && (
          <View style={styles.levelUpSection}>
            <Text style={styles.sectionTitle}>Level Up</Text>
            <Text style={styles.levelUpDescription}>
              Enter experience points to level up this stepling
            </Text>
            <TextInput
              style={styles.expInput}
              placeholder="Experience Points"
              value={experienceInput}
              onChangeText={setExperienceInput}
              keyboardType="numeric"
              editable={!loading}
            />
            <TouchableOpacity
              style={[styles.levelUpButton, loading && styles.disabledButton]}
              onPress={handleLevelUp}
              disabled={loading || !experienceInput}
            >
              <Text style={styles.levelUpButtonText}>
                {loading ? 'Leveling Up...' : 'Level Up'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.fusionSection}>
          <Text style={styles.sectionTitle}>Fusion</Text>
          <Text style={styles.fusionDescription}>
            Fuse with another stepling of the same species and fusion level to create a stronger stepling
          </Text>
          <Text style={styles.candidatesText}>
            Available candidates: {getFusionCandidates().length}
          </Text>
          <TouchableOpacity
            style={[
              styles.fusionButton,
              (loading || getFusionCandidates().length === 0) && styles.disabledButton
            ]}
            onPress={handleFusion}
            disabled={loading || getFusionCandidates().length === 0}
          >
            <Text style={styles.fusionButtonText}>
              {loading ? 'Processing...' : 'Fuse Stepling'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Information</Text>
          <Text style={styles.infoText}>Created: {stepling.createdAt.toLocaleDateString()}</Text>
          <Text style={styles.infoText}>Last Updated: {stepling.updatedAt.toLocaleDateString()}</Text>
          <Text style={styles.infoText}>ID: {stepling.id}</Text>
          {stepling.hasSuboptimalFusion && (
            <Text style={styles.imperfectInfoText}>
              ⚠️ This stepling was created from a fusion involving non-maxed steplings, 
              which may have resulted in suboptimal stats.
            </Text>
          )}
        </View>
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  imperfectBadge: {
    backgroundColor: '#ff9800',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  imperfectBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
  },
  levelInfo: {
    backgroundColor: 'white',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  levelText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  fusionText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  expRequiredText: {
    fontSize: 14,
    color: '#2c5aa0',
    fontWeight: '500',
  },
  maxLevelText: {
    fontSize: 14,
    color: '#ff6b6b',
    fontWeight: 'bold',
  },
  statsContainer: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  levelUpSection: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 8,
  },
  levelUpDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  expInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#f8f9fa',
  },
  levelUpButton: {
    backgroundColor: '#28a745',
    padding: 14,
    borderRadius: 6,
    alignItems: 'center',
  },
  levelUpButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  fusionSection: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 8,
  },
  fusionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  candidatesText: {
    fontSize: 14,
    color: '#2c5aa0',
    fontWeight: '500',
    marginBottom: 12,
  },
  fusionButton: {
    backgroundColor: '#6f42c1',
    padding: 14,
    borderRadius: 6,
    alignItems: 'center',
  },
  fusionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  infoSection: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    marginBottom: 32,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  imperfectInfoText: {
    fontSize: 12,
    color: '#ff9800',
    fontStyle: 'italic',
    marginTop: 8,
    padding: 8,
    backgroundColor: '#fff3e0',
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#ff9800',
  },
});