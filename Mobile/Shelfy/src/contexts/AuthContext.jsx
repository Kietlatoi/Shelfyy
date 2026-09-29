import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { router, useSegments } from 'expo-router';
import * as authApi from '../api/authApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const segments = useSegments();

  // Check auth state on launch
  useEffect(() => {
    let isMounted = true;
    let revision = 0;
    const unsubscribe = authApi.subscribeToAuthState(async (firebaseUser) => {
      const currentRevision = ++revision;
      try {
        const current = firebaseUser ? await authApi.getCurrentUser() : null;
        if (isMounted && currentRevision === revision) setUser(current);
      } catch (error) {
        console.warn('Không thể tải hồ sơ Firebase:', error);
        if (isMounted && currentRevision === revision) setUser(null);
      } finally {
        if (isMounted && currentRevision === revision) setIsLoading(false);
      }
    }, (error) => {
      console.warn('Auth check error:', error);
      if (isMounted) setIsLoading(false);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Auth guard: redirect based on auth status
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)/home');
    }
  }, [user, segments, isLoading]);

  const signIn = useCallback(async ({ email, password, rememberMe }) => {
    const data = await authApi.login({ email, password, rememberMe });
    setUser(data.user);
    return data;
  }, []);

  const signUp = useCallback(async ({ email, password, fullName }) => {
    const data = await authApi.register({ email, password, fullName });
    setUser(data.user);
    return data;
  }, []);

  const signOut = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async (userData) => {
    if (userData) {
      setUser(userData);
    } else {
      try {
        const fresh = await authApi.getCurrentUser();
        if (fresh) {
          setUser(fresh);
        }
      } catch (err) {
        console.warn('Refresh user error:', err);
      }
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        signIn,
        signUp,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
