import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { launchImageLibrary } from 'react-native-image-picker';
import { supabase } from '../../supabase';

const CATEGORIES = [
  'Fast Food',
  'Pizza',
  'Burger',
  'BBQ',
  'Biryani',
  'Desi/Pakistani',
  'Chinese',
  'Bakery & Desserts',
  'Beverages',
];

const PLACEHOLDER_IMAGE = 'https://placehold.co/200x200/f0f0f0/999999?text=No+Image';

export default function AdminScreen() {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loadingRestaurants, setLoadingRestaurants] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  const [rName, setRName] = useState('');
  const [rCategory, setRCategory] = useState('');
  const [rDescription, setRDescription] = useState('');
  const [rImageUrl, setRImageUrl] = useState('');
  const [rUploading, setRUploading] = useState(false);
  const [savingRestaurant, setSavingRestaurant] = useState(false);

  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [mName, setMName] = useState('');
  const [mPrice, setMPrice] = useState('');
  const [mDescription, setMDescription] = useState('');
  const [mImageUrl, setMImageUrl] = useState('');
  const [mUploading, setMUploading] = useState(false);
  const [savingMenuItem, setSavingMenuItem] = useState(false);

  const fetchRestaurants = async () => {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .order('name', { ascending: true });
    if (!error) setRestaurants(data || []);
    setLoadingRestaurants(false);
  };

  const fetchAllOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setOrders(data || []);
    setLoadingOrders(false);
  };

  useEffect(() => {
    fetchRestaurants();
    fetchAllOrders();
  }, []);

  // Shared image picker + upload logic
  const pickAndUploadImage = async (setUrl: (url: string) => void, setUploading: (b: boolean) => void) => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.7 }, async (response) => {
      if (response.didCancel || !response.assets || response.assets.length === 0) {
        return;
      }

      const asset = response.assets[0];
      if (!asset.uri) return;

      setUploading(true);

      try {
        const fileExt = asset.fileName?.split('.').pop() || 'jpg';
        const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;

        const fileData = await fetch(asset.uri);
        const arrayBuffer = await fileData.arrayBuffer();

        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(fileName, arrayBuffer, {
            contentType: asset.type || 'image/jpeg',
          });

        if (uploadError) {
          Alert.alert('Upload failed', uploadError.message);
          setUploading(false);
          return;
        }

        const { data: publicUrlData } = supabase.storage.from('images').getPublicUrl(fileName);
        setUrl(publicUrlData.publicUrl);
      } catch (err: any) {
        Alert.alert('Upload failed', String(err?.message || err));
      }

      setUploading(false);
    });
  };

  const handleAddRestaurant = async () => {
    if (!rName || !rCategory) {
      Alert.alert('Error', 'Please enter a name and select a category');
      return;
    }

    setSavingRestaurant(true);
    const { error } = await supabase.from('restaurants').insert({
      name: rName,
      category: rCategory,
      description: rDescription || null,
      rating: 0,
      image_url: rImageUrl || null,
    });
    setSavingRestaurant(false);

    if (error) {
      Alert.alert('Failed', error.message);
      return;
    }

    setRName('');
    setRCategory('');
    setRDescription('');
    setRImageUrl('');
    Alert.alert('Success', 'Restaurant added successfully');
    fetchRestaurants();
  };

  const handleAddMenuItem = async () => {
    if (!selectedRestaurantId) {
      Alert.alert('Error', 'Please select a restaurant first');
      return;
    }
    if (!mName || !mPrice) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }
    const priceNumber = parseFloat(mPrice);
    if (isNaN(priceNumber)) {
      Alert.alert('Error', 'Price must be a number, e.g. 500');
      return;
    }

    setSavingMenuItem(true);
    const { error } = await supabase.from('menu_items').insert({
      restaurant_id: selectedRestaurantId,
      name: mName,
      price: priceNumber,
      description: mDescription || null,
      image_url: mImageUrl || null,
    });
    setSavingMenuItem(false);

    if (error) {
      Alert.alert('Failed', error.message);
      return;
    }

    setMName('');
    setMPrice('');
    setMDescription('');
    setMImageUrl('');
    Alert.alert('Success', 'Menu item added successfully');
  };

  const handleDeleteRestaurant = (id: string, name: string) => {
    Alert.alert(
      'Delete Restaurant',
      `Are you sure you want to delete "${name}"? Its menu items will be deleted too.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('restaurants').delete().eq('id', id);
            if (error) {
              Alert.alert('Failed', error.message);
              return;
            }
            fetchRestaurants();
            if (selectedRestaurantId === id) setSelectedRestaurantId(null);
          },
        },
      ],
    );
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    const orderToUpdate = orders.find((o: any) => o.id === orderId);
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);

    if (error) {
      Alert.alert('Failed', error.message);
      return;
    }

    fetchAllOrders();

    if (orderToUpdate) {
      supabase.functions
        .invoke('send-notification', {
          body: {
            user_id: orderToUpdate.user_id,
            title: 'Order Update',
            body: `Your order is now: ${newStatus}`,
          },
        })
        .catch((err) => console.log('Notification send error:', err));
    }
  };

  const STATUS_OPTIONS = ['Pending', 'Preparing', 'Out for Delivery', 'Delivered'];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.title}>Admin Panel</Text>
      <Text style={styles.subtitle}>Manage restaurants, menu items, and orders</Text>

      {/* Restaurant form */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Icon name="storefront" size={20} color="#ff6b35" />
          <Text style={styles.cardTitle}>Add New Restaurant</Text>
        </View>

        <Text style={styles.label}>Restaurant Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Al-Haram Biryani House"
          placeholderTextColor="#999"
          value={rName}
          onChangeText={setRName}
        />

        <Text style={styles.label}>Category</Text>
        <View style={styles.chipRow}>
          {CATEGORIES.map((cat) => {
            const isSelected = rCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, isSelected && styles.chipActive]}
                onPress={() => setRCategory(cat)}>
                <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{cat}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Description (optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="A short description customers will see"
          placeholderTextColor="#999"
          value={rDescription}
          onChangeText={setRDescription}
          multiline
        />

        <Text style={styles.label}>Photo (optional)</Text>
        {rImageUrl ? (
          <Image source={{ uri: rImageUrl }} style={styles.imagePreview} />
        ) : null}
        <TouchableOpacity
          style={styles.pickBtn}
          onPress={() => pickAndUploadImage(setRImageUrl, setRUploading)}
          disabled={rUploading}>
          {rUploading ? (
            <ActivityIndicator color="#ff6b35" />
          ) : (
            <>
              <Icon name="add-a-photo" size={18} color="#ff6b35" />
              <Text style={styles.pickBtnText}>{rImageUrl ? 'Change Photo' : 'Pick from Gallery'}</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.hintBox}>
          <Icon name="info-outline" size={14} color="#888" />
          <Text style={styles.hint}>Rating starts at 0 and builds from customer reviews over time.</Text>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleAddRestaurant} disabled={savingRestaurant}>
          {savingRestaurant ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>+ Add Restaurant</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Menu item form */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Icon name="restaurant-menu" size={20} color="#ff6b35" />
          <Text style={styles.cardTitle}>Add New Menu Item</Text>
        </View>

        <Text style={styles.label}>Select Restaurant</Text>
        {loadingRestaurants ? (
          <ActivityIndicator color="#ff6b35" />
        ) : restaurants.length === 0 ? (
          <Text style={styles.hint}>Add a restaurant first</Text>
        ) : (
          <View style={styles.chipRow}>
            {restaurants.map((r: any) => {
              const isSelected = selectedRestaurantId === r.id;
              return (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.chip, isSelected && styles.chipActive]}
                  onPress={() => setSelectedRestaurantId(r.id)}>
                  <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{r.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <Text style={styles.label}>Item Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Chicken Pulao, Zinger Burger, Roti"
          placeholderTextColor="#999"
          value={mName}
          onChangeText={setMName}
        />

        <Text style={styles.label}>Price (Rs.)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 450"
          placeholderTextColor="#999"
          value={mPrice}
          onChangeText={setMPrice}
          keyboardType="decimal-pad"
        />

        <Text style={styles.label}>Description (optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Ingredients, portion size, etc."
          placeholderTextColor="#999"
          value={mDescription}
          onChangeText={setMDescription}
          multiline
        />

        <Text style={styles.label}>Photo (optional)</Text>
        {mImageUrl ? (
          <Image source={{ uri: mImageUrl }} style={styles.imagePreview} />
        ) : null}
        <TouchableOpacity
          style={styles.pickBtn}
          onPress={() => pickAndUploadImage(setMImageUrl, setMUploading)}
          disabled={mUploading}>
          {mUploading ? (
            <ActivityIndicator color="#ff6b35" />
          ) : (
            <>
              <Icon name="add-a-photo" size={18} color="#ff6b35" />
              <Text style={styles.pickBtnText}>{mImageUrl ? 'Change Photo' : 'Pick from Gallery'}</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleAddMenuItem} disabled={savingMenuItem}>
          {savingMenuItem ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>+ Add Menu Item</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Manage orders */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Icon name="receipt-long" size={20} color="#ff6b35" />
          <Text style={styles.cardTitle}>Manage Orders</Text>
        </View>

        {loadingOrders ? (
          <ActivityIndicator color="#ff6b35" />
        ) : orders.length === 0 ? (
          <Text style={styles.hint}>No orders yet</Text>
        ) : (
          orders.map((o: any) => (
            <View key={o.id} style={styles.orderRow}>
              <Text style={styles.manageRowText}>
                Order #{String(o.id).slice(0, 6)} — {o.customer_name || 'Unknown'} — Rs. {o.total}
              </Text>
              {o.delivery_address ? (
                <Text style={styles.currentStatus}>📍 {o.delivery_address}</Text>
              ) : null}
              <Text style={styles.currentStatus}>Current: {o.status || 'Pending'}</Text>
              <View style={styles.statusChipRow}>
                {STATUS_OPTIONS.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.statusChip, o.status === s && styles.statusChipActive]}
                    onPress={() => handleUpdateStatus(o.id, s)}>
                    <Text style={[styles.statusChipText, o.status === s && styles.statusChipTextActive]}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))
        )}
      </View>

      {/* Manage restaurants */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Icon name="list-alt" size={20} color="#ff6b35" />
          <Text style={styles.cardTitle}>Manage Restaurants</Text>
        </View>

        {loadingRestaurants ? (
          <ActivityIndicator color="#ff6b35" />
        ) : restaurants.length === 0 ? (
          <Text style={styles.hint}>No restaurants yet</Text>
        ) : (
          restaurants.map((r: any) => (
            <View key={r.id} style={styles.manageRow}>
              <Image source={{ uri: r.image_url || PLACEHOLDER_IMAGE }} style={styles.thumbImage} />
              <View style={styles.manageRowInfo}>
                <Text style={styles.manageRowText}>{r.name}</Text>
                <Text style={styles.manageRowSubtext}>{r.category}</Text>
              </View>
              <TouchableOpacity onPress={() => handleDeleteRestaurant(r.id, r.name)}>
                <Icon name="delete-outline" size={22} color="#e53935" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 20, marginTop: 40 },
  title: { color: '#1a1a1a', fontSize: 24, fontWeight: 'bold' },
  subtitle: { color: '#999', fontSize: 13, marginBottom: 20 },
  card: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 0.5,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  cardTitle: { color: '#1a1a1a', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  label: { color: '#555', fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 2 },
  hintBox: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, marginTop: 2 },
  hint: { color: '#999', fontSize: 12, marginLeft: 6, flex: 1 },
  input: {
    backgroundColor: '#f8f9fa',
    color: '#1a1a1a',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    fontSize: 14,
    borderWidth: 0.5,
    borderColor: '#e0e0e0',
  },
  textArea: { minHeight: 60, textAlignVertical: 'top' },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: '#f0f0f0',
  },
  pickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ff6b35',
    borderRadius: 10,
    paddingVertical: 10,
    marginBottom: 14,
  },
  pickBtnText: { color: '#ff6b35', fontSize: 13, fontWeight: 'bold', marginLeft: 6 },
  button: {
    backgroundColor: '#ff6b35',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: { color: 'white', fontSize: 15, fontWeight: 'bold' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 14 },
  chip: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 0.5,
    borderColor: '#e0e0e0',
  },
  chipActive: { backgroundColor: '#ff6b35', borderColor: '#ff6b35' },
  chipText: { color: '#1a1a1a', fontSize: 13 },
  chipTextActive: { color: 'white', fontWeight: 'bold' },
  orderRow: { paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#eee' },
  currentStatus: { color: '#888', fontSize: 13, marginTop: 2, marginBottom: 8 },
  statusChipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  statusChip: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 6,
    marginBottom: 6,
    borderWidth: 0.5,
    borderColor: '#e0e0e0',
  },
  statusChipActive: { backgroundColor: '#ff6b35', borderColor: '#ff6b35' },
  statusChipText: { color: '#1a1a1a', fontSize: 12 },
  statusChipTextActive: { color: 'white', fontWeight: 'bold' },
  manageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#eee',
  },
  thumbImage: { width: 44, height: 44, borderRadius: 8, backgroundColor: '#f0f0f0', marginRight: 12 },
  manageRowInfo: { flex: 1 },
  manageRowText: { color: '#1a1a1a', fontSize: 15, fontWeight: '600' },
  manageRowSubtext: { color: '#999', fontSize: 12, marginTop: 2 },
  deleteText: { color: '#e53935', fontSize: 14, fontWeight: 'bold' },
});