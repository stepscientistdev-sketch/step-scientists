import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
} from 'react-native';
import { steplingService } from '../services/steplingService';
import { Stepling } from '../types';

interface TrainingRosterProps {
  visible: boolean;
  onClose: () => void;
  onRosterUpdated?: (roster: Stepling[]) => void;
}

export const TrainingRoster: React.FC<TrainingRosterProps> = ({
  visible,
  onClose,
  onRosterUpdated,
}) => {
  const [allSteplings, setAllSteplings] = useState<Stepling[]>([]);
  const [currentRoster, setCurrentRoster] = useState<Stepling[]>([]);
  const [selectedSteplings, setSelectedSteplings] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadSteplings();
    }
  }, [visible]);

  const loadSteplings = async () => {
    setLoading(true);
    try {
      await steplingService.initializeSteplings();
      const collection = await steplingService.getSteplingCollection();
      setAllSteplings(collection.steplings);
      
      const roster = steplingService.getTrainingRoster();
      setCurrentRoster(roster);
      setSelectedSteplings(new Set(roster.map(s => s.id)));
    } catch (error) {
      console.error('Error loading steplings:', error);
      Alert.alert('Error', 'Failed to load steplings');
    } finally {
      setLoading(false);
    }
  };

  const toggleSteplingSelection = (steplingId: string) => {
    const newSelection = new Set(selectedSteplings);
    if (newSelection.has(steplingId)) {
      newSelection.delete(steplingId);
    } else {
      newSelection.add(steplingId);
    }
    setSelectedSteplings(newSelection);
  };

  const saveRoster = async () => {
    setLoading(true);
    try {
      const success = await steplingService.setTrainingRoster(Array.from(selectedSteplings));
      if (success) {
        const newRoster = steplingService.getTrainingRoster();
        setCurrentRoster(newRoster);
        onRosterUpdated?.(newRoster);
        Alert.alert('Success', 'Training roster updated!');
        onClose();
      } else {
        Alert.alert('Error', 'Failed to update training roster');
      }
    } catch (error) {
      console.error('Error saving roster:', error);
      Alert.alert('Error', 'Failed to save training roster');
    } finally {
      setLoading(false);
    }
  };

  const renderSteplingItem = ({ item }: { item: Stepling }) => {
    const isSelected = selectedSteplings.has(item.id);
    const maxLevel = item.fusionLevel * 10;
    const isMaxLevel = item.level >= maxLevel;

    return (
      <TouchableOpacity
        style={[styles.steplingItem, isSelected && styles.selectedItem]}
        onPress={() => toggleSteplingSelection(item.id)}
      >
        <View style={styles.steplingInfo}>
          <Text style={styles.steplingName}>Species: {item.speciesId}</Text>
          <Text style={styles.steplingLevel}>
            Level {item.level}/{maxLevel} (Fusion {item.fusionLevel})
          </Text>
          <View style={styles.statsContainer}>
            <Text style={styles.statText}>HP: {item.currentStats.health}</Text>
            <Text style={styles.statText}>ATK: {item.currentStats.attack}</Text>
            <Text style={styles.statText}>DEF: {item.currentStats.defense}</Text>
            <Text style={styles.statText}>SPL: {item.currentStats.special}</Text>
          </View>
          {isMaxLevel && (
            <Text style={styles.maxLevelText}>MAX LEVEL</Text>
          )}
        </View>
        <View style={[styles.checkbox, isSelected && styles.checkedBox]}>
          {isSelected && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Training Roster</Text>
          <Text style={styles.subtitle}>
            Select steplings to receive experience points in Training Mode
          </Text>
        </View>

        <View style={styles.currentRosterInfo}>
          <Text style={styles.rosterCount}>
            Current Roster: {currentRoster.length} steplings
          </Text>
          <Text style={styles.rosterCount}>
            Selected: {selectedSteplings.size} steplings
          </Text>
        </View>

        <FlatList
          data={allSteplings}
          keyExtractor={(item) => item.id}
          renderItem={renderSteplingItem}
          style={styles.list}
          showsVerticalScrollIndicator={false}
        />

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onClose}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.saveButton]}
            onPress={saveRoster}
            disabled={loading}
          >
            <Text style={styles.saveButtonText}>
              {loading ? 'Saving...' : 'Save Roster'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  currentRosterInfo: {
    backgroundColor: '#e8f4f8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  rosterCount: {
    fontSize: 14,
    color: '#2c5aa0',
    fontWeight: '500',
  },
  list: {
    flex: 1,
  },
  steplingItem: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedItem: {
    backgroundColor: '#e8f4f8',
    borderColor: '#2c5aa0',
    borderWidth: 2,
  },
  steplingInfo: {
    flex: 1,
  },
  steplingName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  steplingLevel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statText: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  maxLevelText: {
    fontSize: 12,
    color: '#ff6b6b',
    fontWeight: 'bold',
    marginTop: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  checkedBox: {
    backgroundColor: '#2c5aa0',
    borderColor: '#2c5aa0',
  },
  checkmark: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  saveButton: {
    backgroundColor: '#2c5aa0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});