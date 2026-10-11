import React from 'react';
import { StatusBar, View, ActivityIndicator, StyleSheet } from 'react-native';

import LoginScreen from './components/screens/LoginScreen';
import SignupScreen from './components/screens/SignupScreen';
import RestaurantScreen from './components/screens/RestaurantScreen';
import TabNavigator from './components/screens/TabNavigator';
import { CartProvider } from './components/context/CartContext';
import { AuthProvider, useAuth } from './components/context/AuthContext';

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

function RootNavigator() {
  const { role, authLoading } = useAuth();

  // Wait until we know whether a saved login exists
  if (authLoading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#ff6b35" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      <Stack.Navigator
        initialRouteName={role ? 'MainApp' : 'Login'}
        screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="MainApp" component={TabNavigator} />
        <Stack.Screen name="Restaurant" component={RestaurantScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <RootNavigator />
      </CartProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
});