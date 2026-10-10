# FoodApp 🍔

A full-featured, **multi-restaurant food delivery app** built with **React Native (CLI)**, **TypeScript** and **Supabase**.

Customers browse restaurants, order food, track their order and leave reviews. Admins manage restaurants, menus and orders from inside the same app.

> Portfolio project by [Abdul Samad](https://github.com/samadafrid1018). Built and tested on Android.

## Screenshots

| Login | Home | Restaurant |
|:---:|:---:|:---:|
| <img src="screenshots/login.png" width="220"/> | <img src="screenshots/home.png" width="220"/> | <img src="screenshots/restaurant.png" width="220"/> |

| Cart | Orders | Admin Panel |
|:---:|:---:|:---:|
| <img src="screenshots/cart.png" width="220"/> | <img src="screenshots/orders.png" width="220"/> | <img src="screenshots/admin.png" width="220"/> |

## What kind of app is this?

FoodApp follows the **marketplace model** used by Foodpanda and Uber Eats: one app, many restaurants. The platform owner (admin) onboards restaurants and their menus, customers pick any restaurant and order from it. The same architecture can be simplified into a single-restaurant ordering app by removing the restaurant list screen.

## Features

### Customer
- Email / password sign up and login (Supabase Auth), session persists between launches, show / hide password
- Home screen with time-based greeting, restaurant search, 9 food categories and pull-to-refresh
- Restaurant page with menu photos, descriptions, rating and customer reviews
- Cart with quantity controls, running total, "View Cart" bar and a badge on the Cart tab
- Checkout with delivery address and **"Use current location"** (GPS + reverse geocoding), Cash on Delivery
- Order history with colour-coded status: Pending, Preparing, Out for Delivery, Delivered
- Shareable text receipt (WhatsApp, email, any app that accepts text)
- **Push notification** whenever the order status changes
- **Ratings and reviews**: one review per delivered order, the restaurant average updates automatically
- Profile with name, role badge and total orders

### Admin (same app, Admin tab visible only to admins)
- Add restaurants and menu items, with photos picked from the phone gallery (uploaded to Supabase Storage)
- Delete restaurants (their menu is removed too) and single menu items
- See every order with customer name and delivery address, and update its status (this sends the push notification)

### Under the hood
- **Row Level Security on every table.** The admin role is enforced in the database, not only hidden in the UI.
- New users always get the `customer` role through a database trigger. There is no update policy on `profiles`, so a user cannot promote themselves.
- A database trigger recalculates a restaurant's average rating whenever a review is added.
- Push notifications go through a **Supabase Edge Function** that signs a JWT with a Firebase service account and calls the **FCM HTTP v1 API**.
- - The `send-notification` Edge Function checks the caller's JWT and only accepts requests from admins, so customers cannot send notifications.
- Image loading falls back to a placeholder if a URL is broken.
- Reviews show only first name + last initial, never the email address.

## Tech stack

| Area | Technology |
|---|---|
| App | React Native CLI, TypeScript |
| Navigation | React Navigation (native stack + bottom tabs) |
| State | Context API (auth/role, cart) |
| Backend | Supabase (Auth, PostgreSQL with RLS, Storage, Edge Functions) |
| Push notifications | Firebase Cloud Messaging (`@react-native-firebase`), Notifee |
| Device features | `react-native-image-picker`, `@react-native-community/geolocation` |
| Geocoding | OpenStreetMap Nominatim (free, no API key) |
| Icons | `react-native-vector-icons` (MaterialIcons) |

## Project structure

```
FoodApp/
├── App.tsx                         # Providers + stack navigator
├── supabase.ts                     # Supabase client (URL + anon key)
├── components/
│   ├── context/
│   │   ├── AuthContext.tsx         # Session role (admin / customer), triggers push setup
│   │   ├── CartContext.tsx         # Cart items, quantity, total
│   │   └── NotificationService.ts  # FCM permission, token saving, foreground notifications
│   └── screens/
│       ├── LoginScreen.tsx
│       ├── SignupScreen.tsx
│       ├── TabNavigator.tsx
│       ├── HomeScreen.tsx
│       ├── RestaurantScreen.tsx
│       ├── CartScreen.tsx
│       ├── OrdersScreen.tsx
│       ├── ProfileScreen.tsx
│       └── AdminScreen.tsx
├── supabase/
│   ├── schema.sql                  # Tables, triggers, RLS policies, storage bucket
│   └── functions/send-notification/index.ts
└── android/
```

## Database

| Table | Purpose |
|---|---|
| `profiles` | One row per user with a `role` (`customer` or `admin`), created by a trigger on signup |
| `restaurants` | Name, category, description, image, average rating |
| `menu_items` | Items of a restaurant (name, price, description, image) |
| `orders` | Items (JSON), total, status, customer name, delivery address |
| `reviews` | One review per order (1-5 stars, comment), feeds the restaurant rating |
| `device_tokens` | FCM tokens per user, used by the Edge Function |

The full schema, including every RLS policy, is in [`supabase/schema.sql`](supabase/schema.sql).

## Getting started

### Prerequisites
- Node.js and the Android toolchain from the [React Native environment setup guide](https://reactnative.dev/docs/set-up-your-development-environment) (JDK, Android Studio, SDK)
- An Android phone with USB debugging, or an emulator
- A free [Supabase](https://supabase.com) project
- A free [Firebase](https://console.firebase.google.com) project (only needed for push notifications, but the Android build expects `google-services.json`)
- [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) (`npm install -g supabase`)

### 1. Clone and install

```bash
git clone https://github.com/samadafrid1018/FoodApp.git
cd FoodApp
npm install
```

### 2. Set up Supabase

1. Create a Supabase project.
2. Open **SQL Editor** and run the whole of [`supabase/schema.sql`](supabase/schema.sql). This creates the tables, triggers, RLS policies and the public `images` storage bucket.
3. Open `supabase.ts` and put in your **Project URL** and **anon (public) key** from *Project Settings → API*. Never put the `service_role` key in the app.
4. For quick testing, turn off **Confirm email** under *Authentication → Providers → Email*, otherwise every new account must verify its email first.

### 3. Create your first admin

Sign up inside the app, then promote your account in the SQL Editor:

```sql
update profiles set role = 'admin' where email = 'you@example.com';
```

Log out and log in again. The **Admin** tab appears.

### 4. Set up push notifications

1. In Firebase, add an Android app with the package name `com.foodapp` (or change `applicationId` in `android/app/build.gradle` and use that).
2. Download `google-services.json` and place it in `android/app/`. It is git-ignored, so each developer uses their own.
3. In Firebase go to *Project settings → Service accounts → Generate new private key*. Create `supabase/functions/.env` (git-ignored):

   ```
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```

4. Link the project, save the secrets and deploy the function:

   ```bash
   supabase login
   supabase link --project-ref <your-project-ref>
   supabase secrets set --env-file supabase/functions/.env
   supabase functions deploy send-notification
   ```

### 5. Run the app

```bash
npx react-native start
npx react-native run-android
```

If the phone cannot reach Metro over USB: `adb reverse tcp:8081 tcp:8081`.

### 6. Build a release APK (optional)

1. Generate a keystore (once) and keep a backup of it somewhere safe:

   ```bash
   keytool -genkeypair -v -storetype PKCS12 -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
   ```

2. Put the keystore in `android/app/` and add these lines to your **user-level** Gradle file (`~/.gradle/gradle.properties`, on Windows `C:\Users\<you>\.gradle\gradle.properties`), not to the project, so passwords never end up in git:

   ```
   MYAPP_RELEASE_STORE_FILE=my-release-key.keystore
   MYAPP_RELEASE_KEY_ALIAS=my-key-alias
   MYAPP_RELEASE_STORE_PASSWORD=your-password
   MYAPP_RELEASE_KEY_PASSWORD=your-password
   ```

3. Build:

   ```bash
   cd android
   ./gradlew assembleRelease      # Windows PowerShell: .\gradlew.bat assembleRelease
   ```

   The APK is created at `android/app/build/outputs/apk/release/app-release.apk`.

## Troubleshooting

- **"Package ... doesn't seem to be linked"**: a native package was installed after the last build. Run `npx react-native run-android` again (a plain reload is not enough).
- **Push notifications do not appear on Xiaomi / Redmi (MIUI)**: enable *Display pop-up window* and *Autostart* for the app and lock it in the recent apps list. The notification channel itself is created by Notifee on first login.
- **Port 8081 already in use**: another Metro is running. Close it (on Windows: `taskkill /F /IM node.exe`) and start Metro again.

## Known limitations and future improvements

- **Payments**: only Cash on Delivery. Online payment (JazzCash, Easypaisa, Stripe) is not integrated.
- **Delivery time** on restaurant cards is a static placeholder, not a real estimate.
- **Cart** can hold items from different restaurants. A review is attributed to the restaurant of the first item in the order.
- **Address** autofill uses the free Nominatim service, which is rate-limited and not meant for production scale. There is no map picker, delivery distance or delivery fee.
- **Push notifications** are sent from the admin's app after a status change. A database webhook would be more robust than calling the function from the client.
- Rider assignment and live order tracking are not implemented.
- Tested on Android only. iOS is not configured.

## Author

**Abdul Samad** · [github.com/samadafrid1018](https://github.com/samadafrid1018)
