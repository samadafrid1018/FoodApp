import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../../supabase';

const PLACEHOLDER_IMAGE = 'https://placehold.co/400x200/f0f0f0/999999?text=No+Image';

function SafeImage({ uri, style }: any) {
  const [hasError, setHasError] = useState(false);
  return (
    <Image
      source={{ uri: hasError || !uri ? PLACEHOLDER_IMAGE : uri }}
      style={style}
      onError={() => setHasError(true)}
    />
  );
}

function StarRow({ rating, size = 14 }: any) {
  return (
    <View style={{ flexDirection: 'row' }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Icon key={s} name={s <= rating ? 'star' : 'star-border'} size={size} color="#ffb300" />
      ))}
    </View>
  );
}

export default function RestaurantScreen({ navigation, route }: any) {
  const { restaurant } = route.params;
  const { addToCart, cartItems, total } = useCart();
  const { isAdmin } = useAuth();

  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchMenu = async () => {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('price', { ascending: true });

    if (error) {
      setErrorMsg(error.message);
    } else {
      setMenuItems(data || []);
    }
    setLoading(false);
  };

  const fetchReviews = async () => {
    const { data } = await supabase
      .from('reviews')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('created_at', { ascending: false });

    setReviews(data || []);
  };

  useEffect(() => {
    fetchMenu();
    fetchReviews();
  }, [restaurant.id]);

  const handleAdd = (item: any) => {
    addToCart({ id: item.id, name: item.name, price: item.price, restaurant_id: restaurant.id });
  };

  const confirmDeleteItem = (item: any) => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${item.name}" from the menu?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { data, error } = await supabase
              .from('menu_items')
              .delete()
              .eq('id', item.id)
              .select();

            if (error) {
              Alert.alert('Failed', error.message);
              return;
            }

            if (!data || data.length === 0) {
              Alert.alert('Not deleted', 'Delete was blocked. Make sure you are logged in as admin.');
              return;
            }

            setMenuItems((prev) => prev.filter((i: any) => i.id !== item.id));
          },
        },
      ],
    );
  };

  const quantityInCart = (id: any) => {
    const found = cartItems.find((i: any) => i.id === id);
    return found ? found.quantity || 1 : 0;
  };

  const cartCount = cartItems.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0);

  const reviewCount = reviews.length;
  const averageRating =
    reviewCount > 0 ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviewCount : 0;

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString();

  const header = (
    <View>
      <SafeImage uri={restaurant.image_url} style={styles.headerImage} />
      <View style={styles.infoSheet}>
        <Text style={styles.name}>{restaurant.name}</Text>
        {restaurant.description ? (
          <Text style={styles.description}>{restaurant.description}</Text>
        ) : null}

        <View style={styles.chipsRow}>
          <View style={styles.infoChip}>
            <Icon name="star" size={16} color="#ffb300" />
            <Text style={styles.infoChipText}>
              {Number(restaurant.rating) > 0 ? Number(restaurant.rating).toFixed(1) : 'New'}
            </Text>
          </View>
          <View style={styles.infoChip}>
            <Icon name="schedule" size={16} color="#888" />
            <Text style={styles.infoChipText}>25-35 min</Text>
          </View>
          <View style={styles.infoChip}>
            <Icon name="restaurant" size={16} color="#888" />
            <Text style={styles.infoChipText}>{restaurant.category}</Text>
          </View>
        </View>

        <Text style={styles.menuTitle}>Menu</Text>
      </View>
    </View>
  );

  const reviewsSection = (
    <View style={styles.reviewsSection}>
      <Text style={styles.menuTitle}>Reviews</Text>

      {reviewCount === 0 ? (
        <View style={styles.noReviews}>
          <Icon name="rate-review" size={40} color="#ddd" />
          <Text style={styles.emptySubtitle}>No reviews yet. Order and be the first to review!</Text>
        </View>
      ) : (
        <>
          <View style={styles.reviewSummary}>
            <Text style={styles.reviewAvg}>{averageRating.toFixed(1)}</Text>
            <View>
              <StarRow rating={Math.round(averageRating)} size={18} />
              <Text style={styles.reviewCountText}>
                {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}
              </Text>
            </View>
          </View>

          {reviews.slice(0, 5).map((r: any) => (
            <View key={r.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewerName}>{r.reviewer_name || 'Customer'}</Text>
                <Text style={styles.reviewDate}>{formatDate(r.created_at)}</Text>
              </View>
              <StarRow rating={r.rating} />
              {r.comment ? <Text style={styles.reviewComment}>{r.comment}</Text> : null}
            </View>
          ))}
        </>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={loading || errorMsg ? [] : menuItems}
        keyExtractor={(item: any) => String(item.id)}
        ListHeaderComponent={header}
        ListFooterComponent={loading || errorMsg ? null : reviewsSection}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: cartCount > 0 ? 100 : 30 }}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color="#ff6b35" style={{ marginTop: 30 }} />
          ) : errorMsg ? (
            <Text style={styles.message}>Error: {errorMsg}</Text>
          ) : (
            <View style={styles.emptyState}>
              <Icon name="restaurant-menu" size={56} color="#ddd" />
              <Text style={styles.emptyTitle}>Menu is empty</Text>
              <Text style={styles.emptySubtitle}>This restaurant has not added any items yet</Text>
            </View>
          )
        }
        renderItem={({ item }: any) => {
          const qty = quantityInCart(item.id);
          return (
            <View style={styles.menuCard}>
              <SafeImage uri={item.image_url} style={styles.menuImage} />
              <View style={styles.menuInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                {item.description ? (
                  <Text style={styles.itemDescription} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}
                <Text style={styles.itemPrice}>Rs. {item.price}</Text>
              </View>

              <View style={styles.actions}>
                {isAdmin && (
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => confirmDeleteItem(item)}>
                    <Icon name="delete-outline" size={20} color="#e53935" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.addBtn} onPress={() => handleAdd(item)}>
                  <Icon name="add" size={22} color="white" />
                  {qty > 0 && (
                    <View style={styles.qtyBadge}>
                      <Text style={styles.qtyBadgeText}>{qty}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Icon name="arrow-back" size={22} color="#1a1a1a" />
      </TouchableOpacity>

      {cartCount > 0 && (
        <TouchableOpacity
          style={styles.cartBar}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('MainApp', { screen: 'Cart' })}>
          <View style={styles.cartBarLeft}>
            <View style={styles.cartCountBox}>
              <Text style={styles.cartCountText}>{cartCount}</Text>
            </View>
            <Text style={styles.cartBarText}>View Cart</Text>
          </View>
          <Text style={styles.cartBarText}>Rs. {total}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  headerImage: { width: '100%', height: 220, backgroundColor: '#f0f0f0' },
  backBtn: {
    position: 'absolute',
    top: 44,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  infoSheet: {
    backgroundColor: '#f8f9fa',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  name: { color: '#1a1a1a', fontSize: 24, fontWeight: 'bold' },
  description: { color: '#777', fontSize: 14, marginTop: 6, lineHeight: 20 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 14 },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 0.5,
    borderColor: '#e0e0e0',
  },
  infoChipText: { color: '#1a1a1a', fontSize: 13, marginLeft: 5 },
  menuTitle: { color: '#1a1a1a', fontSize: 18, fontWeight: 'bold', marginTop: 12, marginBottom: 12 },
  message: { color: '#888', fontSize: 15, textAlign: 'center', marginTop: 30 },
  emptyState: { alignItems: 'center', marginTop: 30 },
  emptyTitle: { color: '#1a1a1a', fontSize: 16, fontWeight: 'bold', marginTop: 10 },
  emptySubtitle: { color: '#999', fontSize: 13, marginTop: 4, textAlign: 'center' },
  menuCard: {
    backgroundColor: 'white',
    borderRadius: 14,
    marginHorizontal: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderWidth: 0.5,
    borderColor: '#e8e8e8',
  },
  menuImage: { width: 76, height: 76, borderRadius: 10, backgroundColor: '#f0f0f0' },
  menuInfo: { flex: 1, paddingHorizontal: 12 },
  itemName: { color: '#1a1a1a', fontSize: 15, fontWeight: '600' },
  itemDescription: { color: '#999', fontSize: 12, marginTop: 3 },
  itemPrice: { color: '#ff6b35', fontSize: 15, fontWeight: 'bold', marginTop: 6 },
  actions: { flexDirection: 'row', alignItems: 'center' },
  deleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    backgroundColor: '#fdecea',
  },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ff6b35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  qtyBadgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  reviewsSection: { paddingHorizontal: 20, marginTop: 8 },
  noReviews: { alignItems: 'center', paddingVertical: 20 },
  reviewSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 14,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: '#e8e8e8',
    marginBottom: 12,
  },
  reviewAvg: { color: '#1a1a1a', fontSize: 32, fontWeight: 'bold', marginRight: 14 },
  reviewCountText: { color: '#888', fontSize: 12, marginTop: 4 },
  reviewCard: {
    backgroundColor: 'white',
    padding: 14,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: '#e8e8e8',
    marginBottom: 10,
  },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  reviewerName: { color: '#1a1a1a', fontSize: 14, fontWeight: '600' },
  reviewDate: { color: '#aaa', fontSize: 12 },
  reviewComment: { color: '#555', fontSize: 13, marginTop: 6, lineHeight: 18 },
  cartBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 20,
    backgroundColor: '#ff6b35',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 6,
  },
  cartBarLeft: { flexDirection: 'row', alignItems: 'center' },
  cartCountBox: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 10,
  },
  cartCountText: { color: 'white', fontSize: 13, fontWeight: 'bold' },
  cartBarText: { color: 'white', fontSize: 15, fontWeight: 'bold' },
});