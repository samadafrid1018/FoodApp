import React, { useState } from 'react';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { supabase } from '../../supabase';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

export default function SignupScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async () => {
    if (name === '' || email === '' || password === '') {
      setError('Please fill all fields');
      return;
    }

    const { error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          full_name: name,
        },
      },
    });

    if (error) {
      setError(error.message);
    } else {
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainApp' }],
      });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoBox}>
        <Icon name="restaurant" size={44} color="white" />
      </View>
      <Text style={styles.appName}>FoodApp</Text>
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>Sign up to get started</Text>

      <TextInput
        style={styles.input}
        placeholder="Full Name"
        placeholderTextColor="#888"
        value={name}
        onChangeText={(text) => setName(text)}
      />

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#888"
        value={email}
        onChangeText={(text) => setEmail(text)}
      />

      <View style={styles.passwordWrapper}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Password"
          placeholderTextColor="#888"
          value={password}
          onChangeText={(text) => setPassword(text)}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
          <Icon name={showPassword ? 'visibility-off' : 'visibility'} size={22} color="#888" />
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleSignup}>
        <Text style={styles.buttonText}>Sign Up</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.link}>Already have an account? Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 24, justifyContent: 'center' },
  logoBox: {
    width: 88,
    height: 88,
    borderRadius: 26,
    backgroundColor: '#ff6b35',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 14,
    shadowColor: '#ff6b35',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  appName: {
    color: '#1a1a1a',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 28,
    letterSpacing: 0.5,
  },
  title: { color: '#1a1a1a', fontSize: 28, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { color: '#999', fontSize: 16, marginBottom: 32 },
  input: { backgroundColor: 'white', color: '#1a1a1a', borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 15, borderWidth: 0.5, borderColor: '#e0e0e0' },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: '#e0e0e0',
  },
  passwordInput: { flex: 1, color: '#1a1a1a', padding: 14, fontSize: 15 },
  eyeButton: { paddingHorizontal: 14 },
  button: { backgroundColor: '#ff6b35', borderRadius: 10, padding: 16, alignItems: 'center', marginBottom: 16 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  link: { color: '#999', textAlign: 'center', fontSize: 14 },
  error: { color: 'red', textAlign: 'center', marginBottom: 10 },
});