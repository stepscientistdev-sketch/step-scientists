import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';

// Mock game mode system for testing
const GameMode = {
  DISCOVERY: 'discovery',
  TRAINING: 'training'
};

const CONVERSION_RATES = {
  DISCOVERY: { STEPS_PER_CELL: 1000 },
  TRAINING: { STEPS_PER_XP: 10 }
};

const MILESTONES = {
  5000: { tier: 'UNCOMMON', name: 'Uncommon Magnifying Glass' },
  10000: { tier: 'RARE', name: 'Rare Magnifying Glass' },
  50000: { tier: 'EPIC', name: 'Epic Magnifying Glass' },
  100000: { tier: 'LEGENDARY', name: 'Legendary Magnifying Glass' }
};

export default function App() {
  const [currentMode, setCurrentMode] = useState(GameMode.DISCOVERY);
  const [resources, setResources] = useState({ cells: 0, experiencePoints: 0 });
  const [totalSteps, setTotalSteps] = useState(0);
  const [stepsInMode, setStepsInMode] = useState(0);
  const [magnifyingGlasses, setMagnifyingGlasses] = useState([]);
  const [showMilestones, setShowMilestones] = useState(false);

  // Simulate step counting
  useEffect(() => {
    const interval = setInterval(() => {
      const increment = Math.floor(Math.random() * 50) + 10; // 10-60 steps per update
      setTotalSteps(prev => {
        const newTotal = prev + increment;
        updateStepsInMode(increment);
        checkMilestones(prev, newTotal);
        return newTotal;
      });
    }, 3000); // Update every 3 seconds

    return () => clearInterval(interval);
  }, [currentMode]);

  const updateStepsInMode = (stepIncrement) => {
    setStepsInMode(prev => {
      const newStepsInMode = prev + stepIncrement;
      
      // Calculate resources based on current mode
      let newResources = { cells: 0, experiencePoints: 0 };
      if (currentMode === GameMode.DISCOVERY) {
        newResources.cells = Math.floor(stepIncrement / CONVERSION_RATES.DISCOVERY.STEPS_PER_CELL);
      } else {
        newResources.experiencePoints = Math.floor(stepIncrement / CONVERSION_RATES.TRAINING.STEPS_PER_XP);
      }

      // Add to existing resources
      if (newResources.cells > 0 || newResources.experiencePoints > 0) {
        setResources(prev => ({
          cells: prev.cells + newResources.cells,
          experiencePoints: prev.experiencePoints + newResources.experiencePoints
        }));
      }

      return newStepsInMode;
    });
  };

  const checkMilestones = (previousTotal, newTotal) => {
    Object.entries(MILESTONES).forEach(([threshold, milestoneData]) => {
      const thresholdNum = parseInt(threshold);
      if (previousTotal < thresholdNum && newTotal >= thresholdNum) {
        Alert.alert(
          '🎉 Milestone Reached!',
          `Congratulations! You've earned a ${milestoneData.name}!`,
          [{ text: 'Awesome!', style: 'default' }]
        );
        setMagnifyingGlasses(prev => [...prev, milestoneData]);
      }
    });
  };

  const handleModeSwitch = (mode) => {
    if (mode === currentMode) return;

    Alert.alert(
      'Switch Mode',
      `Switch to ${mode === GameMode.DISCOVERY ? 'Discovery' : 'Training'} Mode?\n\n${
        mode === GameMode.DISCOVERY
          ? 'Discovery Mode: 1000 steps = 1 cell for discovering new steplings'
          : 'Training Mode: 10 steps = 1 XP for training your steplings'
      }`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Switch',
          onPress: () => {
            setCurrentMode(mode);
            setStepsInMode(0); // Reset steps in new mode
            Alert.alert(
              'Mode Switched!',
              `You are now in ${mode === GameMode.DISCOVERY ? 'Discovery' : 'Training'} Mode`
            );
          },
        },
      ]
    );
  };

  const getMilestoneProgress = () => {
    return Object.entries(MILESTONES).map(([threshold, milestoneData]) => {
      const thresholdNum = parseInt(threshold);
      const progress = Math.min(totalSteps / thresholdNum, 1);
      const reached = totalSteps >= thresholdNum;
      
      return {
        threshold: thresholdNum,
        ...milestoneData,
        progress,
        reached
      };
    });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🚶‍♂️ Step Monsters Test</Text>
        <Text style={styles.subtitle}>Game Mode System Demo</Text>
      </View>

      {/* Step Counter */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Step Counter</Text>
        <Text style={styles.stepCount}>Total Steps: {totalSteps.toLocaleString()}</Text>
        <Text style={styles.stepCount}>Steps in {currentMode === GameMode.DISCOVERY ? 'Discovery' : 'Training'}: {stepsInMode.toLocaleString()}</Text>
        <Text style={styles.status}>🟢 Simulated step tracking active</Text>
      </View>

      {/* Game Mode Selection */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Game Mode</Text>
        <Text style={styles.currentMode}>
          Current: {currentMode === GameMode.DISCOVERY ? 'Discovery' : 'Training'}
        </Text>
        
        <View style={styles.modeButtons}>
          <TouchableOpacity
            style={[
              styles.modeButton,
              currentMode === GameMode.DISCOVERY && styles.modeButtonActive,
            ]}
            onPress={() => handleModeSwitch(GameMode.DISCOVERY)}
          >
            <Text style={[
              styles.modeButtonText,
              currentMode === GameMode.DISCOVERY && styles.modeButtonTextActive,
            ]}>
              Discovery Mode
            </Text>
            <Text style={styles.modeDescription}>1000 steps = 1 cell</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeButton,
              currentMode === GameMode.TRAINING && styles.modeButtonActive,
            ]}
            onPress={() => handleModeSwitch(GameMode.TRAINING)}
          >
            <Text style={[
              styles.modeButtonText,
              currentMode === GameMode.TRAINING && styles.modeButtonTextActive,
            ]}>
              Training Mode
            </Text>
            <Text style={styles.modeDescription}>10 steps = 1 XP</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Resources */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Resources</Text>
        <View style={styles.resourceRow}>
          <Text style={styles.resourceText}>Cells: {resources.cells}</Text>
          <Text style={styles.resourceText}>XP: {resources.experiencePoints}</Text>
        </View>
      </View>

      {/* Milestones */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Milestones & Inventory</Text>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowMilestones(!showMilestones)}
        >
          <Text style={styles.actionButtonText}>
            {showMilestones ? 'Hide' : 'Show'} Milestone Progress
          </Text>
        </TouchableOpacity>

        {showMilestones && (
          <View style={styles.milestoneList}>
            {getMilestoneProgress().map((milestone) => (
              <View key={milestone.threshold} style={styles.milestoneItem}>
                <Text style={styles.milestoneName}>{milestone.name}</Text>
                <Text style={styles.milestoneThreshold}>
                  {milestone.threshold.toLocaleString()} steps
                </Text>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${milestone.progress * 100}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {Math.round(milestone.progress * 100)}% {milestone.reached ? '✅' : '🔒'}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.inventorySection}>
          <Text style={styles.inventoryTitle}>
            🔍 Magnifying Glasses: {magnifyingGlasses.length}
          </Text>
          {magnifyingGlasses.map((glass, index) => (
            <Text key={index} style={styles.inventoryItem}>
              • {glass.name}
            </Text>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          This demo simulates the game mode system with automatic step counting.
          Switch modes to see different resource conversion rates!
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#3498db',
    padding: 20,
    paddingTop: 50,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#ecf0f1',
  },
  card: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  stepCount: {
    fontSize: 16,
    color: '#34495e',
    marginBottom: 5,
  },
  status: {
    fontSize: 14,
    color: '#27ae60',
    marginTop: 10,
  },
  currentMode: {
    fontSize: 16,
    color: '#3498db',
    fontWeight: '500',
    marginBottom: 15,
  },
  modeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modeButton: {
    flex: 1,
    backgroundColor: '#ecf0f1',
    padding: 15,
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#3498db',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  modeButtonTextActive: {
    color: '#fff',
  },
  modeDescription: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  resourceRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  resourceText: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '500',
  },
  actionButton: {
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  milestoneList: {
    marginTop: 10,
  },
  milestoneItem: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  milestoneName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  milestoneThreshold: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 10,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#ecf0f1',
    borderRadius: 4,
    marginBottom: 5,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3498db',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'right',
  },
  inventorySection: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  inventoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  inventoryItem: {
    fontSize: 14,
    color: '#34495e',
    marginBottom: 5,
  },
  footer: {
    margin: 15,
    padding: 15,
    backgroundColor: '#34495e',
    borderRadius: 8,
  },
  footerText: {
    fontSize: 12,
    color: '#ecf0f1',
    textAlign: 'center',
    lineHeight: 18,
  },
});