import {
  getMessaging,
  requestPermission,
  getToken,
  onMessage,
  AuthorizationStatus,
} from '@react-native-firebase/messaging';
import { getApp } from '@react-native-firebase/app';
import { PermissionsAndroid, Platform } from 'react-native';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { supabase } from '../../supabase';

export async function setupNotifications() {
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
  }

  // Create a default notification channel (Android 8+)
  await notifee.createChannel({
    id: 'default',
    name: 'Default Channel',
    importance: AndroidImportance.HIGH,
  });

  const messagingInstance = getMessaging(getApp());

  const authStatus = await requestPermission(messagingInstance);
  const enabled =
    authStatus === AuthorizationStatus.AUTHORIZED ||
    authStatus === AuthorizationStatus.PROVISIONAL;

  if (!enabled) {
    console.log('Notification permission not granted');
    return;
  }

  const token = await getToken(messagingInstance);

  const { data } = await supabase.auth.getUser();
  const user = data?.user;

  if (user && token) {
    await supabase.from('device_tokens').upsert(
      { user_id: user.id, token: token },
      { onConflict: 'user_id,token' },
    );
  }

  // When app is in foreground, Firebase doesn't show a notification automatically.
  // We display it manually using notifee.
  onMessage(messagingInstance, async (remoteMessage) => {
    await notifee.displayNotification({
      title: remoteMessage.notification?.title,
      body: remoteMessage.notification?.body,
      android: {
        channelId: 'default',
        importance: AndroidImportance.HIGH,
      },
    });
  });
}