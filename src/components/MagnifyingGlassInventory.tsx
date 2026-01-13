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
import {useMagnifyingGlass} from '@/store/slices/gameSlice';
import {RarityTier, MagnifyingGlass} from '@/types';

interface Props {
  visible: boolean;
  onClose: () => void;
  onUseGlass?: (glass: MagnifyingGlass) => void;
}

const MagnifyingGlassInventory: React.FC<Props> = ({visible, onClose, onUseGlass}) => {
  const dispatch = useDispatch<AppDispatch>();
  const {magnifyingGlasses, loading} = useSelector((state: RootState) => state.game);

  if (!visible) {
    return null;
  }

  const handleUseGlass = (glass: MagnifyingGlass) => {
    Alert.alert(
      'Use Magnifying Glass',
      `Use your ${glass.tier} Magnifying Glass? This will improve your discovery odds for the next cell inspection.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Use It',
          onPress: async () => {
            try {
              const result = await dispatch(useMagnifyingGlass(glass.tier)).unwrap();
              if (result.success) {
                Alert.alert(
                  'Magnifying Glass Used!',
                  `Your ${glass.tier} Magnifying Glass is now active for your next discovery.`
                );
                if (onUseGlass) {
                  onUseGlass(glass);
                }
                onClose();
              } else {
                Alert.alert('Error', 'Failed to use magnifying glass');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to use magnifying glass');
            }
          },
        },
      ]
    );
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

  const getAdvantageDescription = (tier: RarityTier): string => {
    switch (tier) {
      case RarityTier.UNCOMMON:
        return 'Slightly better discovery odds';
      case RarityTier.RARE:
        return 'Good discovery odds improvement';
      case RarityTier.EPIC:
        return 'Great discovery odds improvement';
      case RarityTier.LEGENDARY:
        return 'Excellent discovery odds improvement';
      default:
        return 'No improvement';
    }
  };

  // Group glasses by tier and count them
  const glassGroups = magnifyingGlasses.reduce((groups, glass) => {
    if (!groups[glass.tier]) {
      groups[glass.tier] = [];
    }
    groups[glass.tier].push(glass);
    return groups;
  }, {} as Record<RarityTier, MagnifyingGlass[]>);

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Magnifying Glass Inventory</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
        </View>

        {magnifyingGlasses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>🔍</Text>
            <Text style={styles.emptyTitle}>No Magnifying Glasses</Text>
            <Text style={styles.emptyDescription}>
              Reach step milestones to earn magnifying glasses that improve your discovery odds!
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.inventoryList}>
            {Object.entries(glassGroups).map(([tier, glasses]) => (
              <View key={tier} style={styles.glassGroup}>
                <View style={styles.glassCard}>
                  <View style={styles.glassHeader}>
                    <View style={styles.glassInfo}>
                      <Text style={styles.glassName}>
                        {tier.charAt(0).toUpperCase() + tier.slice(1)} Magnifying Glass
                      </Text>
                      <Text style={styles.glassCount}>
                        Quantity: {glasses.length}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.tierBadge,
                        {backgroundColor: getRarityColor(tier as RarityTier)},
                      ]}
                    >
                      <Text style={styles.tierText}>{tier.toUpperCase()}</Text>
                    </View>
                  </View>

                  <Text style={styles.glassDescription}>
                    {getAdvantageDescription(tier as RarityTier)}
                  </Text>

                  <View style={styles.glassFooter}>
                    <Text style={styles.advancementRange}>
                      Advancement Range: {glasses[0].advancementRange[0]}-{glasses[0].advancementRange[1]}
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.useButton,
                        {backgroundColor: getRarityColor(tier as RarityTier)},
                      ]}
                      onPress={() => handleUseGlass(glasses[0])}
                      disabled={loading}
                    >
                      <Text style={styles.useButtonText}>
                        {loading ? 'Using...' : 'Use Glass'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>How Magnifying Glasses Work:</Text>
          <Text style={styles.infoText}>
            • Use before inspecting cells to improve discovery odds{'\n'}
            • Higher tier glasses provide better advantages{'\n'}
            • Each glass is single-use only{'\n'}
            • Earn more by reaching step milestones
          </Text>
        </View>
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
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 48,
    marginBottom: 15,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 20,
  },
  inventoryList: {
    maxHeight: 300,
  },
  glassGroup: {
    marginBottom: 15,
  },
  glassCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  glassHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  glassInfo: {
    flex: 1,
  },
  glassName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  glassCount: {
    fontSize: 14,
    color: '#7f8c8d',
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
  glassDescription: {
    fontSize: 14,
    color: '#34495e',
    marginBottom: 15,
    fontStyle: 'italic',
  },
  glassFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  advancementRange: {
    fontSize: 12,
    color: '#7f8c8d',
    flex: 1,
  },
  useButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
  },
  useButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  infoSection: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#7f8c8d',
    lineHeight: 18,
  },
});

export default MagnifyingGlassInventory;