import React from 'react';
import {Provider} from 'react-redux';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {store} from '@/store';
import HomeScreen from '@/components/screens/HomeScreen';
import AuthScreen from '@/components/screens/AuthScreen';

const Stack = createStackNavigator();

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator initialRouteName="Auth">
            <Stack.Screen 
              name="Auth" 
              component={AuthScreen}
              options={{headerShown: false}}
            />
            <Stack.Screen 
              name="Home" 
              component={HomeScreen}
              options={{title: 'Step Monsters'}}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </Provider>
  );
};

export default App;