import React, { useState } from 'react';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, TextInput, ActivityIndicator, PermissionsAndroid, Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { useCart } from '../context/CartContext';
import { supabase } from '../../supabase';

export default function CartScreen() {
  const { cartItems, removeFromCart, increaseQuantity, decreaseQuantity, clearCart, total } = useCart();

  const [address, setAddress] = useState('');
  const [placing, setPlacing] = useState(false);
  const [locating, setLocating] = useState(false);

  const requestLocationPermission = async () => {
    if (Platform.OS !== 'android') return true;
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  };

  const useCurrentLocation = async () => {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      Alert.alert('Permission denied', 'Location permission is needed to auto-fill your address');
      return;
    }

    setLocating(true);

    Geolocation.getCurrentPosition(
  async (position) => {
    const { latitude, longitude } = position.coords;

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
        { headers: { 'User-Agent': 'FoodApp/1.0' } },
      );
      const data = await res.json();
      const readableAddress = data?.display_name || `${latitude}, ${longitude}`;
      setAddress(readableAddress);
    } catch (err) {
      setAddress(`${latitude}, ${longitude}`);
    }

    setLocating(false);
  },
  (error) => {
    // Fallback: try again with lower accuracy (faster, uses network/wifi instead of GPS satellite lock)
    Geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
            { headers: { 'User-Agent': 'FoodApp/1.0' } },
          );
          const data = await res.json();
          setAddress(data?.display_name || `${latitude}, ${longitude}`);
        } catch (err) {
          setAddress(`${latitude}, ${longitude}`);
        }
        setLocating(false);
      },
      (fallbackError) => {
        setLocating(false);
        Alert.alert(
          'Error',
          'Could not get your location. Make sure GPS/Location is turned on in your phone settings, then try again.',
        );
      },
      { enableHighAccuracy: false, timeout: 20000, maximumAge: 10000 },
    );
  },
  { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
);
  }

  

  const placeOrder = async () => {
    if (placing) return;

    if (!address.trim()) {
      Alert.alert('Error', 'Please enter a delivery address');
      return;
    }

    setPlacing(true);

    const { data } = await supabase.auth.getUser();
    if (!data?.user) {
      Alert.alert('Error', 'Please login first');
      setPlacing(false);
      return;
    }

    const user = data.user;
    const customerName = user.user_metadata?.full_name || user.email;

    const { error } = await supabase.from('orders').insert({
      user_id: user.id,
      customer_name: customerName,
      delivery_address: address.trim(),
      items: cartItems,
      total: total,
    });

    setPlacing(false);

    if (error) {
      console.log('Order error:', error.message);
      Alert.alert('Order failed', error.message);
      return;
    }

    setAddress('');
    clearCart();
    Alert.alert('Done', 'Order placed successfully!');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Cart</Text>

      {cartItems.length === 0 ? (
        <View style={styles.emptyState}>
  <Icon name="shopping-cart" size={64} color="#ddd" />
  <Text style={styles.emptyTitle}>Your cart is empty</Text>
  <Text style={styles.emptySubtitle}>Browse restaurants and add something delicious</Text>
</View>
      ) : (
        <>
          <FlatList
            data={cartItems}
            keyExtractor={(item: any) => String(item.id)}
            renderItem={({ item }: any) => (
              <View style={styles.cartCard}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemPrice}>Rs. {item.price}</Text>
                </View>

                <View style={styles.qtyControls}>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => decreaseQuantity(item.id)}>
                    <Text style={styles.qtyBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.qtyValue}>{item.quantity || 1}</Text>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => increaseQuantity(item.id)}>
                    <Text style={styles.qtyBtnText}>+</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity onPress={() => removeFromCart(item.id)}>
                  <Text style={styles.removeBtn}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
          />

          <View style={styles.addressCard}>
            <View style={styles.addressHeader}>
              <Text style={styles.addressLabel}>Delivery Address</Text>
              <TouchableOpacity onPress={useCurrentLocation} disabled={locating} style={styles.locationBtn}>
                {locating ? (
                  <ActivityIndicator size="small" color="#ff6b35" />
                ) : (
                  <Text style={styles.locationBtnText}>📍 Use Current Location</Text>
                )}
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.addressInput}
              placeholder="House #, street, area, city"
              placeholderTextColor="#999"
              value={address}
              onChangeText={setAddress}
              multiline
            />
          </View>

          <View style={styles.paymentCard}>
            <Text style={styles.paymentLabel}>Payment Method</Text>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentIcon}>💵</Text>
              <Text style={styles.paymentText}>Cash on Delivery</Text>
            </View>
          </View>

          <View style={styles.totalContainer}>
            <Text style={styles.totalText}>Total: Rs. {total}</Text>
            <TouchableOpacity style={styles.orderBtn} onPress={placeOrder} disabled={placing}>
              <Text style={styles.orderBtnText}>{placing ? 'Placing...' : 'Place Order'}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 20, marginTop: 40 },
  title: { color: '#1a1a1a', fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  empty: { color: '#999', fontSize: 16, textAlign: 'center', marginTop: 40 },
  cartCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#e0e0e0',
  },
  itemInfo: { flex: 1 },
  itemName: { color: '#1a1a1a', fontSize: 15, fontWeight: 'bold' },
  itemPrice: { color: '#ff6b35', fontSize: 13, marginTop: 4 },
  qtyControls: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 12 },
  qtyBtn: {
    backgroundColor: '#f8f9fa',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: '#e0e0e0',
  },
  qtyBtnText: { color: '#ff6b35', fontSize: 16, fontWeight: 'bold' },
  qtyValue: { color: '#1a1a1a', fontSize: 15, fontWeight: 'bold', marginHorizontal: 10, minWidth: 16, textAlign: 'center' },
  removeBtn: { color: 'red', fontSize: 18 },
  addressCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: '#e0e0e0',
    marginTop: 4,
    marginBottom: 10,
  },
  addressHeader: { marginBottom: 8 },
  addressLabel: { color: '#1a1a1a', fontSize: 14, fontWeight: 'bold', marginBottom: 6 },
  locationBtn: { alignSelf: 'flex-start' },
  locationBtnText: { color: '#ff6b35', fontSize: 13, fontWeight: 'bold' },
  addressInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#1a1a1a',
    borderWidth: 0.5,
    borderColor: '#e0e0e0',
    minHeight: 50,
    textAlignVertical: 'top',
  },
  paymentCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: '#e0e0e0',
    marginBottom: 10,
  },
  paymentLabel: { color: '#1a1a1a', fontSize: 14, fontWeight: 'bold', marginBottom: 8 },
  paymentRow: { flexDirection: 'row', alignItems: 'center' },
  paymentIcon: { fontSize: 18, marginRight: 8 },
  paymentText: { color: '#555', fontSize: 14 },
  totalContainer: { backgroundColor: 'white', padding: 16, borderRadius: 12, borderWidth: 0.5, borderColor: '#e0e0e0', marginTop: 10 },
  totalText: { color: '#1a1a1a', fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  orderBtn: { backgroundColor: '#ff6b35', borderRadius: 10, padding: 16, alignItems: 'center' },
  orderBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    emptyState: { alignItems: 'center', marginTop: 60 },
  emptyTitle: { color: '#1a1a1a', fontSize: 18, fontWeight: 'bold', marginTop: 12 },
  emptySubtitle: { color: '#999', fontSize: 13, marginTop: 4 },
});