import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {RootState, AppDispatch} from '@/store';
import {loginPlayer, registerPlayer, clearError} from '@/store/slices/authSlice';

interface Props {
  navigation: any;
}

const AuthScreen: React.FC<Props> = ({navigation}) => {
  const dispatch = useDispatch<AppDispatch>();
  const {loading, error, isAuthenticated} = useSelector((state: RootState) => state.auth);
  
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');

  React.useEffect(() => {
    if (isAuthenticated) {
      navigation.replace('Home');
    }
  }, [isAuthenticated, navigation]);

  React.useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleSubmit = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!isLogin && !email.trim()) {
      Alert.alert('Error', 'Email is required for registration');
      return;
    }

    try {
      if (isLogin) {
        await dispatch(loginPlayer({username, password})).unwrap();
      } else {
        await dispatch(registerPlayer({username, password, email})).unwrap();
      }
    } catch (error) {
      // Error is handled by the useEffect above
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setUsername('');
    setPassword('');
    setEmail('');
    dispatch(clearError());
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Step Monsters</Text>
      <Text style={styles.subtitle}>
        {isLogin ? 'Welcome back!' : 'Create your account'}
      </Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
        />

        {!isLogin && (
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
        )}

        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {isLogin ? 'Login' : 'Register'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.switchButton} onPress={toggleMode}>
          <Text style={styles.switchText}>
            {isLogin
              ? "Don't have an account? Register"
              : 'Already have an account? Login'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 40,
  },
  form: {
    width: '100%',
    maxWidth: 300,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonDisabled: {
    backgroundColor: '#bdc3c7',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  switchButton: {
    alignItems: 'center',
  },
  switchText: {
    color: '#3498db',
    fontSize: 14,
  },
});

export default AuthScreen;