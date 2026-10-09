import React, { createContext, useContext, useEffect, useState } from 'react';
import { setupNotifications } from './NotificationService';

import { supabase } from '../../supabase';

const AuthContext = createContext<any>(null);

export function AuthProvider({ children }: any) {
  const [role, setRole] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

    
   const fetchRole = async () => {
  console.log('FETCH ROLE CALLED');
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) {
    setRole(null);
    setAuthLoading(false);
    return;
  }
  console.log('CALLING SETUP NOTIFICATIONS');

  setupNotifications();

  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  console.log('PROFILE ROLE:', data, error);

  if (!error && data) {
    setRole(data.role);
  } else {
    setRole('customer');
  }
  setAuthLoading(false);
};

  useEffect(() => {
    fetchRole();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      fetchRole();
    });

    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, []);

  const isAdmin = role === 'admin';

  return (
    <AuthContext.Provider value={{ role, isAdmin, authLoading, refetchRole: fetchRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}