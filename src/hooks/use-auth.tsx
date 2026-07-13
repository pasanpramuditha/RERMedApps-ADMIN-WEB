
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { Auth, User } from 'firebase/auth';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase';

async function syncServerSession(user: User | null) {
  if (!user) {
    await fetch('/api/auth/session', { method: 'DELETE' });
    return;
  }

  const idToken = await user.getIdToken();
  const response = await fetch('/api/auth/session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ idToken }),
  });

  if (!response.ok) {
    await fetch('/api/auth/session', { method: 'DELETE' });
    throw new Error('ADMIN_ACCESS_DENIED');
  }
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass:string) => Promise<any>;
  logout: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [auth, setAuth] = useState<Auth | null>(null);

  useEffect(() => {
    let mounted = true;
    let clientAuth: Auth;
    try {
      clientAuth = getFirebaseAuth();
      setAuth(clientAuth);
    } catch (error) {
      console.error('Firebase auth is not configured:', error);
      setLoading(false);
      return () => {
        mounted = false;
      };
    }
    const loadingTimeout = window.setTimeout(() => {
      if (mounted) {
        setLoading(false);
      }
    }, 8000);

    const unsubscribe = onAuthStateChanged(clientAuth, async (user) => {
      window.clearTimeout(loadingTimeout);
      try {
        await syncServerSession(user);
        if (mounted) {
          setUser(user);
        }
      } catch (error) {
        console.error('Failed to sync admin session:', error);
        if (mounted) {
          setUser(null);
        }
        await signOut(clientAuth);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      window.clearTimeout(loadingTimeout);
      unsubscribe();
    };
  }, []);

  const login = async (email: string, pass: string) => {
    const clientAuth = auth || getFirebaseAuth();
    const credential = await signInWithEmailAndPassword(clientAuth, email, pass);
    await syncServerSession(credential.user);
    return credential;
  };

  const logout = async () => {
    await fetch('/api/auth/session', { method: 'DELETE' });
    const clientAuth = auth || getFirebaseAuth();
    return signOut(clientAuth);
  };

  const getToken = async () => {
      const clientAuth = auth || getFirebaseAuth();
      if (!clientAuth.currentUser) return null;
      return clientAuth.currentUser.getIdToken();
  }

  const value = {
    user,
    loading,
    login,
    logout,
    getToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/');
        }
    }, [user, loading, router]);

    if (loading) {
        return <>{children}</>;
    }

    if (!user) {
        return null;
    }

    return <>{children}</>;
};
