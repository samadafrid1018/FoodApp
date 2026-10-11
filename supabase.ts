import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

const supabaseUrl = 'https://hjjbdxbwstrbeoirfavs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqamJkeGJ3c3RyYmVvaXJmYXZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyOTUwMTAsImV4cCI6MjEwNDg3MTAxMH0.Ft2kamYEeO-uHSEKYKEYZNtFcvg7td62fzSuqojCqok';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Refresh the session only while the app is in the foreground
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});