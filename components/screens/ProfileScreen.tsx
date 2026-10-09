import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../supabase';
import { useAuth } from '../context/AuthContext';

export default function ProfileScreen({ navigation }: any) {
  const { isAdmin } = useAuth();

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [orderCount, setOrderCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async () => {
    const { data } = await supabase.auth.getUser();
    const user = data?.user;

    if (!user) {
      setLoading(false);
      return;
    }

    setEmail(user.email || '');
    setFullName(user.user_metadata?.full_name || '');

    const { count } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    setOrderCount(count ?? 0);
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, []),
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#ff6b35" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>

      <View style={styles.card}>
        <Text style={styles.avatar}>👤</Text>
        {fullName ? <Text style={styles.name}>{fullName}</Text> : null}
        <Text style={styles.email}>{email}</Text>

        <View style={[styles.roleBadge, isAdmin && styles.roleBadgeAdmin]}>
          <Text style={[styles.roleBadgeText, isAdmin && styles.roleBadgeTextAdmin]}>
            {isAdmin ? 'Admin' : 'Customer'}
          </Text>
        </View>
      </View>

      <View style={styles.statsCard}>
        <Text style={styles.statsNumber}>{orderCount}</Text>
        <Text style={styles.statsLabel}>Total Orders</Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleLogout}>
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 24, marginTop: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' },
  title: { color: '#1a1a1a', fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  card: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 0.5,
    borderColor: '#e0e0e0',
  },
  avatar: { fontSize: 50, marginBottom: 10 },
  name: { color: '#1a1a1a', fontSize: 18, fontWeight: 'bold', marginBottom: 2 },
  email: { color: '#888', fontSize: 14, marginBottom: 12 },
  roleBadge: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 4,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  roleBadgeAdmin: { backgroundColor: '#ff6b35' },
  roleBadgeText: { color: '#666', fontSize: 12, fontWeight: 'bold' },
  roleBadgeTextAdmin: { color: 'white' },
  statsCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 0.5,
    borderColor: '#e0e0e0',
  },
  statsNumber: { color: '#ff6b35', fontSize: 28, fontWeight: 'bold' },
  statsLabel: { color: '#888', fontSize: 13, marginTop: 4 },
  button: { backgroundColor: '#ff6b35', borderRadius: 10, padding: 16, alignItems: 'center' },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});