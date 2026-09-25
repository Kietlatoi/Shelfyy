import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { router, useSegments } from 'expo-router';
import { getStoredUser, isAuthenticated, clearAuth, saveAuth } from '../api/tokenStore';
import * as authApi from '../api/authApi';
import { userApi } from '../api/userApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const segments = useSegments();

  // Check auth state on launch
  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      try {
        const authed = await isAuthenticated();
        if (authed) {
          const storedUser = await getStoredUser();
          if (isMounted) {
            setUser(storedUser);
          }
          // Optionally fetch fresh profile in background
          try {
            const fresh = await userApi.me();
            if (isMounted && fresh) {
              setUser(fresh);
              await saveAuth({ user: fresh });
            }
          } catch {
            // Keep stored user if offline
          }
        }
      } catch (err) {
        console.warn('Auth check error:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    checkAuth();

    return () => {
      isMounted = false;
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
      await saveAuth({ user: userData });
    } else {
      try {
        const fresh = await userApi.me();
        if (fresh) {
          setUser(fresh);
          await saveAuth({ user: fresh });
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
