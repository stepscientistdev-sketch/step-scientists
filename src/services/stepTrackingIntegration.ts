import {store} from '../store';
import {updateStepsInMode} from '../store/slices/gameSlice';
import {stepCounterService} from './stepCounterService';

class StepTrackingIntegrationService {
  private isInitialized = false;
  private lastKnownSteps = 0;
  private updateInterval: NodeJS.Timeout | null = null;

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Get current step count
      const currentSteps = await stepCounterService.getCurrentSteps();
      this.lastKnownSteps = currentSteps;

      // Set up step update callback
      stepCounterService.setStepUpdateCallback((newSteps: number) => {
        this.handleStepUpdate(newSteps);
      });

      // Set up periodic sync (backup in case callback fails)
      this.updateInterval = setInterval(() => {
        this.syncStepCount();
      }, 60000); // Every minute

      this.isInitialized = true;
      console.log('✅ Step tracking integration initialized');
    } catch (error) {
      console.error('❌ Failed to initialize step tracking integration:', error);
      throw error;
    }
  }

  private handleStepUpdate(newSteps: number): void {
    if (newSteps > this.lastKnownSteps) {
      const stepDifference = newSteps - this.lastKnownSteps;
      
      // Get current game state
      const gameState = store.getState().game;
      
      if (gameState.modeData) {
        // Update steps in current mode
        const newStepsInMode = gameState.modeData.stepsInMode + stepDifference;
        store.dispatch(updateStepsInMode(newStepsInMode));
        
        console.log(`📊 Step update: +${stepDifference} steps in ${gameState.currentMode} mode`);
      }
      
      this.lastKnownSteps = newSteps;
    }
  }

  private async syncStepCount(): Promise<void> {
    try {
      const currentSteps = await stepCounterService.getCurrentSteps();
      if (currentSteps !== this.lastKnownSteps) {
        this.handleStepUpdate(currentSteps);
      }
    } catch (error) {
      console.error('Error syncing step count:', error);
    }
  }

  async forceSync(): Promise<void> {
    await this.syncStepCount();
  }

  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.isInitialized = false;
  }

  isReady(): boolean {
    return this.isInitialized;
  }
}

export const stepTrackingIntegration = new StepTrackingIntegrationService();