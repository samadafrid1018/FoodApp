import React from 'react';
import { StatusBar } from 'react-native';

import LoginScreen from './components/screens/LoginScreen';
import SignupScreen from './components/screens/SignupScreen';
import RestaurantScreen from './components/screens/RestaurantScreen';
import TabNavigator from './components/screens/TabNavigator';
import { CartProvider } from './components/context/CartContext';
import { AuthProvider } from './components/context/AuthContext';

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

export default function App() {
  
  return (
    
    <AuthProvider>
      <CartProvider>
        <NavigationContainer> 
          <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
            <Stack.Screen name="MainApp" component={TabNavigator} />
            <Stack.Screen name="Restaurant" component={RestaurantScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </CartProvider>
    </AuthProvider>
  );
}