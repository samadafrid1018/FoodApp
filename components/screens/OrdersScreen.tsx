import React, { useCallback, useState } from 'react';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Share,
  Modal,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../supabase';

export default function OrdersScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [reviewedOrderIds, setReviewedOrderIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedStars, setSelectedStars] = useState(0);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchOrders = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;

    if (!user) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error) {
      setOrders(data || []);
    }

    const { data: reviewData } = await supabase
      .from('reviews')
      .select('order_id')
      .eq('user_id', user.id);

    if (reviewData) {
      setReviewedOrderIds(new Set(reviewData.map((r: any) => r.order_id)));
    }

    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, []),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Preparing':
        return { backgroundColor: '#fff3cd', color: '#856404' };
      case 'Out for Delivery':
        return { backgroundColor: '#cce5ff', color: '#004085' };
      case 'Delivered':
        return { backgroundColor: '#d4edda', color: '#155724' };
      default:
        return { backgroundColor: '#f0f0f0', color: '#666' };
    }
  };

  const handleShare = async (item: any) => {
    const itemLines = (item.items || [])
      .map((food: any) => `${food.name} x${food.quantity || 1} - Rs. ${food.price * (food.quantity || 1)}`)
      .join('\n');

    const receipt =
      `Order #${String(item.id).slice(0, 6)}\n` +
      `Customer: ${item.customer_name || 'N/A'}\n` +
      `Date: ${formatDate(item.created_at)}\n` +
      `Status: ${item.status || 'Pending'}\n\n` +
      `${itemLines}\n\n` +
      `Total: Rs. ${item.total}`;

    try {
      await Share.share({ message: receipt });
    } catch (err) {
      console.log('Share error:', err);
    }
  };

  const openRatingModal = (order: any) => {
    setSelectedOrder(order);
    setSelectedStars(0);
    setComment('');
    setRatingModalVisible(true);
  };

  const submitReview = async () => {
    if (selectedStars === 0) {
      Alert.alert('Error', 'Please select a star rating');
      return;
    }

    setSubmittingReview(true);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;

    if (!user || !selectedOrder) {
      setSubmittingReview(false);
      return;
    }

       const restaurantId = selectedOrder.items?.[0]?.restaurant_id || null;

    // Public name: first name + last initial (e.g. "Pathan A."), never the email
    const fullName = user.user_metadata?.full_name;
    let reviewerName = 'Customer';
    if (fullName) {
      const parts = String(fullName).trim().split(/\s+/);
      reviewerName = parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
    }

    const { error } = await supabase.from('reviews').insert({
      restaurant_id: restaurantId,
      order_id: selectedOrder.id,
      user_id: user.id,
      reviewer_name: reviewerName,
      rating: selectedStars,
      comment: comment.trim() || null,
    });

    setSubmittingReview(false);

    if (error) {
      Alert.alert('Failed', error.message);
      return;
    }

    setRatingModalVisible(false);
    Alert.alert('Thank you!', 'Your review has been submitted.');
    fetchOrders();
  };

  const renderOrder = ({ item }: any) => {
    const isDelivered = item.status === 'Delivered';
    const alreadyReviewed = reviewedOrderIds.has(item.id);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.orderId}>Order #{String(item.id).slice(0, 6)}</Text>
          <Text style={styles.date}>{formatDate(item.created_at)}</Text>
        </View>

        {item.customer_name ? (
          <Text style={styles.customerName}>Customer: {item.customer_name}</Text>
        ) : null}

        {item.delivery_address ? (
          <Text style={styles.customerName}>📍 {item.delivery_address}</Text>
        ) : null}

        <View style={[styles.statusBadge, { backgroundColor: getStatusStyle(item.status).backgroundColor }]}>
          <Text style={{ color: getStatusStyle(item.status).color, fontSize: 12, fontWeight: 'bold' }}>
            {item.status || 'Pending'}
          </Text>
        </View>

        {(item.items || []).map((food: any, index: number) => (
          <View key={index} style={styles.itemRow}>
            <Text style={styles.itemName}>
              {food.name} x{food.quantity || 1}
            </Text>
            <Text style={styles.itemPrice}>Rs. {food.price * (food.quantity || 1)}</Text>
          </View>
        ))}

        <View style={styles.divider} />
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>Rs. {item.total}</Text>
        </View>

        <TouchableOpacity style={styles.shareBtn} onPress={() => handleShare(item)}>
          <Text style={styles.shareBtnText}>Share Receipt</Text>
        </TouchableOpacity>

        {isDelivered && !alreadyReviewed && (
          <TouchableOpacity style={styles.rateBtn} onPress={() => openRatingModal(item)}>
            <Text style={styles.rateBtnText}>⭐ Rate this Order</Text>
          </TouchableOpacity>
        )}

        {isDelivered && alreadyReviewed && (
          <Text style={styles.reviewedText}>✓ You reviewed this order</Text>
        )}
      </View>
    );
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
      <Text style={styles.title}>My Orders</Text>
      <FlatList
        data={orders}
        keyExtractor={(item: any) => String(item.id)}
        renderItem={renderOrder}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#ff6b35']} />
        }
        ListEmptyComponent={
  <View style={styles.emptyState}>
    <Icon name="receipt-long" size={64} color="#ddd" />
    <Text style={styles.emptyTitle}>No orders yet</Text>
    <Text style={styles.emptySubtitle}>Your placed orders will show up here</Text>
  </View>
}
      />

      <Modal visible={ratingModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Rate your order</Text>

            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setSelectedStars(star)}>
                  <Text style={[styles.star, star <= selectedStars && styles.starFilled]}>★</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Comment (optional)</Text>
            <View style={styles.commentBoxWrapper}>
              <TouchableOpacity activeOpacity={1}>
                <View style={styles.commentBox}>
                  <TextInputComment value={comment} onChangeText={setComment} />
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setRatingModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={submitReview}
                disabled={submittingReview}>
                <Text style={styles.modalSubmitText}>
                  {submittingReview ? 'Submitting...' : 'Submit'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Small wrapper so TextInput keeps native keyboard behavior cleanly
import { TextInput } from 'react-native';
function TextInputComment({ value, onChangeText }: any) {
  return (
    <TextInput
      style={{ fontSize: 14, color: '#1a1a1a', minHeight: 60, textAlignVertical: 'top' }}
      placeholder="How was the food and service?"
      placeholderTextColor="#999"
      value={value}
      onChangeText={onChangeText}
      multiline
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 20, marginTop: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { color: 'black', fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  empty: { color: '#888', fontSize: 16, textAlign: 'center', marginTop: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  orderId: { fontSize: 16, fontWeight: 'bold', color: '#222' },
  date: { fontSize: 12, color: '#888' },
  customerName: { fontSize: 13, color: '#555', marginBottom: 4 },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    marginBottom: 10,
    marginTop: 4,
  },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  itemName: { fontSize: 14, color: '#444' },
  itemPrice: { fontSize: 14, color: '#444' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 10 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: { fontSize: 15, fontWeight: 'bold', color: '#222' },
  totalValue: { fontSize: 15, fontWeight: 'bold', color: '#ff6b35' },
  shareBtn: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#ff6b35',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  shareBtnText: { color: '#ff6b35', fontSize: 14, fontWeight: 'bold' },
  rateBtn: {
    marginTop: 10,
    backgroundColor: '#ff6b35',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  rateBtnText: { color: 'white', fontSize: 14, fontWeight: 'bold' },
  reviewedText: { marginTop: 10, color: '#4caf50', fontSize: 13, textAlign: 'center', fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '85%',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 16, textAlign: 'center' },
  starsRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 16 },
  star: { fontSize: 36, color: '#ddd', marginHorizontal: 4 },
  starFilled: { color: '#ffb300' },
  modalLabel: { fontSize: 13, color: '#555', fontWeight: '600', marginBottom: 6 },
  commentBoxWrapper: { marginBottom: 16 },
  commentBox: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 12,
    borderWidth: 0.5,
    borderColor: '#e0e0e0',
  },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  modalCancelBtn: { flex: 1, padding: 12, alignItems: 'center', marginRight: 8 },
  modalCancelText: { color: '#888', fontSize: 14, fontWeight: 'bold' },
  modalSubmitBtn: {
    flex: 1,
    backgroundColor: '#ff6b35',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  modalSubmitText: { color: 'white', fontSize: 14, fontWeight: 'bold' },
    emptyState: { alignItems: 'center', marginTop: 60 },
  emptyTitle: { color: '#1a1a1a', fontSize: 18, fontWeight: 'bold', marginTop: 12 },
  emptySubtitle: { color: '#999', fontSize: 13, marginTop: 4 },
});