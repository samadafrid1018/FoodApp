import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { supabase } from '../../supabase';

const PLACEHOLDER_IMAGE = 'https://placehold.co/400x200/f0f0f0/999999?text=No+Image';

function RestaurantImage({ uri, style }: any) {
  const [hasError, setHasError] = useState(false);
  return (
    <Image
      source={{ uri: hasError || !uri ? PLACEHOLDER_IMAGE : uri }}
      style={style}
      onError={() => setHasError(true)}
    />
  );
}

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

export default function Home({ navigation }: any) {
  const categories = [
    { id: '0', name: 'All', emoji: '🍽️' },
    { id: '1', name: 'Fast Food', emoji: '🍟' },
    { id: '2', name: 'Pizza', emoji: '🍕' },
    { id: '3', name: 'Burger', emoji: '🍔' },
    { id: '4', name: 'BBQ', emoji: '🍢' },
    { id: '5', name: 'Biryani', emoji: '🍛' },
    { id: '6', name: 'Desi/Pakistani', emoji: '🍚' },
    { id: '7', name: 'Chinese', emoji: '🥡' },
    { id: '8', name: 'Bakery & Desserts', emoji: '🍰' },
    { id: '9', name: 'Beverages', emoji: '🥤' },
  ];

  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [firstName, setFirstName] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const fullName = userData?.user?.user_metadata?.full_name;
    setFirstName(fullName ? String(fullName).split(' ')[0] : '');

    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .order('rating', { ascending: false });

    if (error) {
      setErrorMsg(error.message);
    } else {
      setErrorMsg('');
      setRestaurants(data || []);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const filteredRestaurants = restaurants
    .filter((r: any) => selectedCategory === 'All' || r.category === selectedCategory)
    .filter((r: any) =>
      searchQuery.trim() === ''
        ? true
        : r.name.toLowerCase().includes(searchQuery.trim().toLowerCase()),
    );

  const header = (
    <View>
      <Text style={styles.greeting}>
        {getGreeting()}
        {firstName ? `, ${firstName}` : ''} 👋
      </Text>
      <Text style={styles.subtitle}>What would you like to eat today?</Text>

      <View style={styles.searchBox}>
        <Icon name="search" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search restaurants..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close" size={18} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.banner}>
        <View style={styles.bannerTextBox}>
          <Text style={styles.bannerTitle}>Hungry?</Text>
          <Text style={styles.bannerSubtitle}>
            Order from your favorite restaurants and track your order.
          </Text>
        </View>
        <Icon name="delivery-dining" size={64} color="rgba(255,255,255,0.9)" />
      </View>

      <Text style={styles.sectionTitle}>Categories</Text>
      <FlatList
        data={categories}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryList}
        keyExtractor={(item: any) => item.id}
        renderItem={({ item }: any) => {
          const isSelected = selectedCategory === item.name;
          return (
            <TouchableOpacity
              style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(item.name)}>
              <Text style={styles.categoryEmoji}>{item.emoji}</Text>
              <Text style={[styles.categoryText, isSelected && styles.categoryTextActive]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      <Text style={styles.sectionTitle}>Restaurants</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={loading || errorMsg ? [] : filteredRestaurants}
        keyExtractor={(item: any) => String(item.id)}
        ListHeaderComponent={header}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#ff6b35']} />
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color="#ff6b35" style={{ marginTop: 30 }} />
          ) : errorMsg ? (
            <Text style={styles.message}>Error: {errorMsg}</Text>
          ) : (
            <View style={styles.emptyState}>
              <Icon name="search-off" size={56} color="#ddd" />
              <Text style={styles.emptyTitle}>No restaurants found</Text>
              <Text style={styles.emptySubtitle}>Try another category or search term</Text>
            </View>
          )
        }
        renderItem={({ item }: any) => (
          <TouchableOpacity
            style={styles.restaurantCard}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('Restaurant', { restaurant: item })}>
            <RestaurantImage uri={item.image_url} style={styles.restaurantImage} />

            <View style={styles.ratingBadge}>
              <Icon name="star" size={14} color="#ffb300" />
              <Text style={styles.ratingText}>
                {Number(item.rating) > 0 ? Number(item.rating).toFixed(1) : 'New'}
              </Text>
            </View>

            <View style={styles.restaurantInfoBox}>
              <Text style={styles.restaurantName}>{item.name}</Text>
              <Text style={styles.restaurantDesc} numberOfLines={1}>
                {item.description || item.category}
              </Text>
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Icon name="schedule" size={14} color="#888" />
                  <Text style={styles.metaText}>25-35 min</Text>
                </View>
                <View style={styles.metaItem}>
                  <Icon name="restaurant" size={14} color="#888" />
                  <Text style={styles.metaText}>{item.category}</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  listContent: { padding: 20, paddingTop: 50, paddingBottom: 30 },
  greeting: { color: '#1a1a1a', fontSize: 24, fontWeight: 'bold' },
  subtitle: { color: '#888', fontSize: 14, marginTop: 4, marginBottom: 18 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 18,
    borderWidth: 0.5,
    borderColor: '#e0e0e0',
  },
  searchInput: { flex: 1, paddingVertical: 12, paddingHorizontal: 8, fontSize: 14, color: '#1a1a1a' },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff6b35',
    borderRadius: 16,
    padding: 18,
    marginBottom: 6,
  },
  bannerTextBox: { flex: 1, paddingRight: 10 },
  bannerTitle: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  bannerSubtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 4 },
  sectionTitle: { color: '#1a1a1a', fontSize: 18, fontWeight: 'bold', marginBottom: 12, marginTop: 18 },
  categoryList: { flexGrow: 0 },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 24,
    marginRight: 10,
    borderWidth: 0.5,
    borderColor: '#e0e0e0',
  },
  categoryChipActive: { backgroundColor: '#ff6b35', borderColor: '#ff6b35' },
  categoryEmoji: { fontSize: 16, marginRight: 6 },
  categoryText: { color: '#1a1a1a', fontSize: 13 },
  categoryTextActive: { color: 'white', fontWeight: 'bold' },
  message: { color: '#888', fontSize: 15, textAlign: 'center', marginTop: 30 },
  emptyState: { alignItems: 'center', marginTop: 40 },
  emptyTitle: { color: '#1a1a1a', fontSize: 16, fontWeight: 'bold', marginTop: 10 },
  emptySubtitle: { color: '#999', fontSize: 13, marginTop: 4 },
  restaurantCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 18,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: '#e8e8e8',
    elevation: 2,
  },
  restaurantImage: { width: '100%', height: 150, backgroundColor: '#f0f0f0' },
  ratingBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  ratingText: { color: '#1a1a1a', fontSize: 12, fontWeight: 'bold', marginLeft: 3 },
  restaurantInfoBox: { padding: 14 },
  restaurantName: { color: '#1a1a1a', fontSize: 17, fontWeight: 'bold' },
  restaurantDesc: { color: '#888', fontSize: 13, marginTop: 3 },
  metaRow: { flexDirection: 'row', marginTop: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', marginRight: 16 },
  metaText: { color: '#888', fontSize: 12, marginLeft: 4 },
});