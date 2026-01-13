import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import { steplingService } from '../services/steplingService';
import { Stepling } from '../types';
import { SteplingDetails } from './SteplingDetails';
import { TrainingRoster } from './TrainingRoster';

export const SteplingCollection: React.FC = () => {
  const [steplings, setSteplings] = useState<Stepling[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStepling, setSelectedStepling] = useState<Stepling | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showTrainingRoster, setShowTrainingRoster] = useState(false);
  const [trainingRoster, setTrainingRoster] = useState<Stepling[]>([]);

  useEffect(() => {
    loadSteplings();
  }, []);

  const loadSteplings = async () => {
    setLoading(true);
    try {
      await steplingService.initializeSteplings();
      const collection = await steplingService.getSteplingCollection();
      setSteplings(collection.steplings);
      
      const roster = steplingService.getTrainingRoster();
      setTrainingRoster(roster);
    } catch (error) {
      console.error('Error loading steplings:', error);
      Alert.alert('Error', 'Failed to load steplings');
    } finally {
      setLoading(false);
    }
  };

  const handleSteplingPress = (stepling: Stepling) => {
    setSelectedStepling(stepling);
    setShowDetails(true);
  };

  const handleSteplingUpdated = (updatedStepling: Stepling) => {
    setSteplings(prev => 
      prev.map(s => s.id === updatedStepling.id ? updatedStepling : s)
    );
    setSelectedStepling(updatedStepling);
  };

  const handleRosterUpdated = (newRoster: Stepling[]) => {
    setTrainingRoster(newRoster);
  };

  const renderSteplingItem = ({ item }: { item: Stepling }) => {
    const maxLevel = item.fusionLevel * 10;
    const isMaxLevel = item.level >= maxLevel;
    const isInTrainingRoster = trainingRoster.some(r => r.id === item.id);

    return (
      <TouchableOpacity
        style={[
          styles.steplingItem,
          isInTrainingRoster && styles.trainingRosterItem
        ]}
        onPress={() => handleSteplingPress(item)}
      >
        <View style={styles.steplingHeader}>
          <Text style={styles.steplingName}>{item.speciesId}</Text>
          <View style={styles.badgeContainer}>
            {item.hasSuboptimalFusion && (
              <View style={styles.imperfectBadge}>
                <Text style={styles.imperfectBadgeText}>⚠️</Text>
              </View>
            )}
            {isInTrainingRoster && (
              <View style={styles.trainingBadge}>
                <Text style={styles.trainingBadgeText}>TRAINING</Text>
              </View>
            )}
          </View>
        </View>
        
        <Text style={styles.steplingLevel}>
          Level {item.level}/{maxLevel} • Fusion {item.fusionLevel}
        </Text>
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>HP</Text>
            <Text style={styles.statValue}>{item.currentStats.health}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>ATK</Text>
            <Text style={styles.statValue}>{item.currentStats.attack}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>DEF</Text>
            <Text style={styles.statValue}>{item.currentStats.defense}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>SPL</Text>
            <Text style={styles.statValue}>{item.currentStats.special}</Text>
          </View>
        </View>

        {isMaxLevel && (
          <Text style={styles.maxLevelText}>MAX LEVEL</Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>No Steplings Yet</Text>
      <Text style={styles.emptyStateText}>
        Discover species in Discovery Mode to start your collection!
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Stepling Collection</Text>
        <Text style={styles.subtitle}>
          {steplings.length} steplings • {trainingRoster.length} in training
        </Text>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.trainingRosterButton}
          onPress={() => setShowTrainingRoster(true)}
        >
          <Text style={styles.trainingRosterButtonText}>
            Manage Training Roster ({trainingRoster.length})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={steplings}
        keyExtractor={(item) => item.id}
        renderItem={renderSteplingItem}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadSteplings} />
        }
        contentContainerStyle={steplings.length === 0 ? styles.emptyContainer : undefined}
        showsVerticalScrollIndicator={false}
      />

      <SteplingDetails
        stepling={selectedStepling}
        visible={showDetails}
        onClose={() => {
          setShowDetails(false);
          setSelectedStepling(null);
        }}
        onSteplingUpdated={handleSteplingUpdated}
      />

      <TrainingRoster
        visible={showTrainingRoster}
        onClose={() => setShowTrainingRoster(false)}
        onRosterUpdated={handleRosterUpdated}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  actionButtons: {
    padding: 16,
  },
  trainingRosterButton: {
    backgroundColor: '#2c5aa0',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  trainingRosterButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  steplingItem: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  trainingRosterItem: {
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  steplingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  steplingName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  imperfectBadge: {
    backgroundColor: '#ff9800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  imperfectBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  trainingBadge: {
    backgroundColor: '#28a745',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  trainingBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  steplingLevel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  maxLevelText: {
    fontSize: 12,
    color: '#ff6b6b',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
});