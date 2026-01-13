/**
 * Step Scientists - Google Fit Test App
 * Testing Google Fit integration with real step data
 *
 * @format
 */

import React, { useState, useEffect } from 'react';
import type {PropsWithChildren} from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  Button,
  Alert,
} from 'react-native';

import {
  Colors,
  Header,
} from 'react-native/Libraries/NewAppScreen';

import GoogleFit, { Scopes } from 'react-native-google-fit';

type SectionProps = PropsWithChildren<{
  title: string;
}>;

function Section({children, title}: SectionProps): JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  return (
    <View style={styles.sectionContainer}>
      <Text
        style={[
          styles.sectionTitle,
          {
            color: isDarkMode ? Colors.white : Colors.black,
          },
        ]}>
        {title}
      </Text>
      <Text
        style={[
          styles.sectionDescription,
          {
            color: isDarkMode ? Colors.light : Colors.dark,
          },
        ]}>
        {children}
      </Text>
    </View>
  );
}

function App(): JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const [steps, setSteps] = useState(0);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [status, setStatus] = useState('Initializing...');

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  const initializeGoogleFit = async () => {
    try {
      setStatus('Initializing Google Fit...');
      
      const options = {
        scopes: [
          Scopes.FITNESS_ACTIVITY_READ,
          Scopes.FITNESS_ACTIVITY_WRITE,
        ],
        clientId: '570511343860-bjrh86v7rmqvchn9qmodb6r7bhq8g2j7.apps.googleusercontent.com',
      };

      await GoogleFit.initializeIfNeeded(options);
      
      GoogleFit.checkIsAuthorized().then(() => {
        const authorized = GoogleFit.isAuthorized;
        setIsAuthorized(authorized);
        
        if (authorized) {
          setStatus('Authorized - Getting steps...');
          getTodaysSteps();
        } else {
          setStatus('Ready - Need authorization');
        }
      });
    } catch (error) {
      console.error('Google Fit initialization error:', error);
      setStatus('Error: ' + error.message);
    }
  };

  const authorizeGoogleFit = async () => {
    try {
      setStatus('Requesting authorization...');
      
      const authResult = await GoogleFit.authorize({
        scopes: [
          Scopes.FITNESS_ACTIVITY_READ,
          Scopes.FITNESS_ACTIVITY_WRITE,
        ],
        clientId: '570511343860-bjrh86v7rmqvchn9qmodb6r7bhq8g2j7.apps.googleusercontent.com',
      });

      if (authResult.success) {
        setIsAuthorized(true);
        setStatus('Authorization successful!');
        getTodaysSteps();
      } else {
        setStatus('Authorization failed: ' + authResult.message);
      }
    } catch (error) {
      console.error('Authorization error:', error);
      setStatus('Authorization error: ' + error.message);
    }
  };

  const getTodaysSteps = async () => {
    try {
      setStatus('Getting step data...');
      
      const today = new Date();
      const startDate = new Date(today);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(today);
      endDate.setHours(23, 59, 59, 999);

      const options = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };

      const stepSamples = await GoogleFit.getDailyStepCountSamples(options);
      
      if (stepSamples && stepSamples.length > 0) {
        const totalSteps = stepSamples.reduce((total, sample) => {
          return total + (sample.steps || 0);
        }, 0);
        setSteps(totalSteps);
        setStatus('Step data retrieved successfully!');
      } else {
        setSteps(0);
        setStatus('No step data found for today');
      }
    } catch (error) {
      console.error('Error getting steps:', error);
      setStatus('Error getting steps: ' + error.message);
    }
  };

  useEffect(() => {
    initializeGoogleFit();
  }, []);

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={backgroundStyle}>
        <Header />
        <View
          style={{
            backgroundColor: isDarkMode ? Colors.black : Colors.white,
          }}>
          
          <Section title="🚶‍♂️ Step Scientists - Google Fit Test">
            Testing real Google Fit integration with your OAuth credentials
          </Section>

          <Section title="📊 Status">
            {status}
          </Section>

          <Section title="🔐 Authorization">
            {isAuthorized ? '✅ Google Fit Authorized' : '❌ Not Authorized'}
            {!isAuthorized && (
              <View style={styles.buttonContainer}>
                <Button
                  title="Authorize Google Fit"
                  onPress={authorizeGoogleFit}
                />
              </View>
            )}
          </Section>

          <Section title="👟 Today's Steps">
            <Text style={styles.stepCount}>
              {steps.toLocaleString()} steps
            </Text>
            
            {isAuthorized && (
              <View style={styles.buttonContainer}>
                <Button
                  title="Refresh Steps"
                  onPress={getTodaysSteps}
                />
              </View>
            )}
          </Section>

          <Section title="ℹ️ Configuration">
            Package: com.stepscientist{'\n'}
            OAuth Client ID: 570511...g2j7{'\n'}
            SHA-1: 6B:A1:BF:B7:8E:9B...
          </Section>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
  },
  stepCount: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 16,
    color: '#007AFF',
  },
  buttonContainer: {
    marginTop: 16,
  },
});

export default App;