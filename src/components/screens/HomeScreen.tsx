import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {RootState, AppDispatch} from '@/store';
import {logout} from '@/store/slices/authSlice';
import {
  initializeGameData,
  switchGameMode,
  updateStepsInMode,
  clearPendingMilestones,
  addResources,
} from '@/store/slices/gameSlice';
import {
  requestStepPermission,
  getCurrentSteps,
  startStepTracking,
} from '@/store/slices/stepCounterSlice';
import {
  fetchAchievements,
  updateAchievements,
  claimDailyBonus,
  clearNewlyUnlocked,
} from '@/store/slices/lifetimeAchievementSlice';
import {GameMode} from '@/types';
import MilestoneProgress from '@/components/MilestoneProgress';
import MagnifyingGlassInventory from '@/components/MagnifyingGlassInventory';
import {AchievementBonuses} from '@/components/AchievementBonuses';
import {AchievementProgress} from '@/components/AchievementProgress';
import {AchievementUnlockModal} from '@/components/AchievementUnlockModal';
import {stepTrackingIntegration} from '@/services/stepTrackingIntegration';

interface Props {
  navigation: any;
}

const HomeScreen: React.FC<Props> = ({navigation}) => {
  const dispatch = useDispatch<AppDispatch>();
  const {player} = useSelector((state: RootState) => state.auth);
  const {
    currentMode,
    resources,
    modeData,
    milestoneProgress,
    magnifyingGlasses,
    pendingMilestones,
    loading: gameLoading,
  } = useSelector((state: RootState) => state.game);
  const {stepData, permissionGranted, isTracking} = useSelector((state: RootState) => state.stepCounter);
  const {
    achievements,
    newlyUnlocked,
    dailyBonusClaimed,
  } = useSelector((state: RootState) => state.lifetimeAchievement);

  const [showMilestones, setShowMilestones] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [lastDailyCheck, setLastDailyCheck] = useState<string | null>(null);

  useEffect(() => {
    initializeApp();
  }, []);

  // Update achievements when total steps change
  useEffect(() => {
    if (stepData.totalSteps > 0 && achievements) {
      dispatch(updateAchievements(stepData.totalSteps));
    }
  }, [stepData.totalSteps]);

  // Check for daily bonus on app start and periodically
  useEffect(() => {
    checkDailyBonus();
    
    // Check every hour
    const interval = setInterval(checkDailyBonus, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const checkDailyBonus = async () => {
    const today = new Date().toDateString();
    
    if (lastDailyCheck !== today && !dailyBonusClaimed) {
      setLastDailyCheck(today);
      
      try {
        const result = await dispatch(claimDailyBonus()).unwrap();
        
        if (result && result.claimed && result.bonusCells > 0) {
          // Add bonus cells to resources
          dispatch(addResources({
            cells: result.bonusCells,
            experiencePoints: 0,
          }));
          
          Alert.alert(
            '🎁 Daily Bonus!',
            `You received ${result.bonusCells} bonus cells from your lifetime achievements!`,
            [{text: 'Awesome!'}]
          );
        }
      } catch (error) {
        console.error('Failed to claim daily bonus:', error);
      }
    }
  };

  useEffect(() => {
    // Show milestone notifications
    if (pendingMilestones.length > 0) {
      const milestoneNames = pendingMilestones.map(m => `${m.tier} Magnifying Glass`).join(', ');
      Alert.alert(
        '🎉 Milestone Reached!',
        `Congratulations! You've earned: ${milestoneNames}`,
        [
          {
            text: 'View Milestones',
            onPress: () => {
              dispatch(clearPendingMilestones());
              setShowMilestones(true);
            },
          },
          {
            text: 'Continue',
            onPress: () => dispatch(clearPendingMilestones()),
          },
        ]
      );
    }
  }, [pendingMilestones]);

  const initializeApp = async () => {
    try {
      // Initialize game data first
      await dispatch(initializeGameData()).unwrap();
      
      // Initialize achievements
      await dispatch(fetchAchievements()).unwrap();
      
      // Then initialize step tracking
      await initializeStepTracking();
    } catch (error) {
      console.error('Failed to initialize app:', error);
      Alert.alert('Error', 'Failed to initialize the app. Please try again.');
    }
  };

  const initializeStepTracking = async () => {
    try {
      const granted = await dispatch(requestStepPermission()).unwrap();
      if (granted) {
        await dispatch(getCurrentSteps());
        await dispatch(startStepTracking());
        
        // Initialize step tracking integration
        await stepTrackingIntegration.initialize();
      } else {
        Alert.alert(
          'Permission Required',
          'Step Monsters needs access to your step counter to function properly. Please enable it in your device settings.',
          [
            {text: 'Cancel', style: 'cancel'},
            {text: 'Try Again', onPress: initializeStepTracking},
          ]
        );
      }
    } catch (error) {
      console.error('Failed to initialize step tracking:', error);
      Alert.alert('Error', 'Failed to initialize step tracking. Please try again.');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            dispatch(logout());
            navigation.replace('Auth');
          },
        },
      ]
    );
  };

  const handleModeSwitch = (mode: GameMode) => {
    if (mode === currentMode) return;

    Alert.alert(
      'Switch Mode',
      `Switch to ${mode === GameMode.DISCOVERY ? 'Discovery' : 'Training'} Mode?\n\n${
        mode === GameMode.DISCOVERY
          ? 'Discovery Mode: 1000 steps = 1 cell for discovering new steplings'
          : 'Training Mode: 10 steps = 1 XP for training your steplings'
      }`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Switch',
          onPress: async () => {
            try {
              await dispatch(switchGameMode(mode)).unwrap();
              Alert.alert(
                'Mode Switched!',
                `You are now in ${mode === GameMode.DISCOVERY ? 'Discovery' : 'Training'} Mode`
              );
            } catch (error) {
              Alert.alert('Error', 'Failed to switch game mode');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome, {player?.username}!</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Step Counter Status */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Step Counter</Text>
        <Text style={styles.stepCount}>
          Today's Steps: {stepData.dailySteps.toLocaleString()}
        </Text>
        <Text style={styles.stepCount}>
          Total Steps: {stepData.totalSteps.toLocaleString()}
        </Text>
        <View style={styles.statusRow}>
          <Text style={[styles.status, permissionGranted ? styles.statusGood : styles.statusBad]}>
            Permission: {permissionGranted ? 'Granted' : 'Denied'}
          </Text>
          <Text style={[styles.status, isTracking ? styles.statusGood : styles.statusBad]}>
            Tracking: {isTracking ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      {/* Lifetime Achievements */}
      {achievements && (
        <>
          <AchievementBonuses achievements={achievements} />
          <View style={styles.card}>
            <AchievementProgress totalSteps={stepData.totalSteps} />
          </View>
        </>
      )}

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
        {modeData && (
          <View style={styles.modeStatsRow}>
            <Text style={styles.modeStatsText}>
              Steps in {currentMode === GameMode.DISCOVERY ? 'Discovery' : 'Training'}: {modeData.stepsInMode.toLocaleString()}
            </Text>
          </View>
        )}
      </View>

      {/* Milestones & Inventory */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Progress & Inventory</Text>
        <View style={styles.progressRow}>
          <TouchableOpacity
            style={styles.progressButton}
            onPress={() => setShowMilestones(true)}
          >
            <Text style={styles.progressButtonText}>
              🏆 Milestones
            </Text>
            {milestoneProgress && (
              <Text style={styles.progressSubtext}>
                {milestoneProgress.totalSteps.toLocaleString()} total steps
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.progressButton}
            onPress={() => setShowInventory(true)}
          >
            <Text style={styles.progressButtonText}>
              🔍 Magnifying Glasses
            </Text>
            <Text style={styles.progressSubtext}>
              {magnifyingGlasses.length} available
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Quick Actions</Text>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>View Collection</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Inspect Cells</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Train Steplings</Text>
        </TouchableOpacity>
      </View>

      {/* Milestone Progress Modal */}
      <MilestoneProgress
        visible={showMilestones}
        onClose={() => setShowMilestones(false)}
      />

      {/* Magnifying Glass Inventory Modal */}
      <MagnifyingGlassInventory
        visible={showInventory}
        onClose={() => setShowInventory(false)}
      />

      {/* Achievement Unlock Modal */}
      <AchievementUnlockModal
        visible={newlyUnlocked.length > 0}
        achievements={newlyUnlocked}
        onClose={() => dispatch(clearNewlyUnlocked())}
      />
    </ScrollView>
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
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  logoutButton: {
    padding: 8,
  },
  logoutText: {
    color: '#e74c3c',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
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
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  status: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusGood: {
    color: '#27ae60',
  },
  statusBad: {
    color: '#e74c3c',
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
  modeStatsRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  modeStatsText: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressButton: {
    flex: 1,
    backgroundColor: '#ecf0f1',
    padding: 15,
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  progressButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  progressSubtext: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  actionButton: {
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default HomeScreen;