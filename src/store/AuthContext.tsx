// src/store/AuthContext.tsx
// Version: 1.3.2

import * as Google from 'expo-auth-session/providers/google';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/api';
import { GoogleAuthConfig } from '../config/googleAuthConfig';

WebBrowser.maybeCompleteAuthSession();

interface AuthContextData {
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email, password) => Promise<void>;
  signOut: () => void;
  signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // === FIX: Revert to standard Expo configuration ===
  // This uses a generic web client ID for Expo Go development,
  // and automatically switches to the native android/ios client IDs in production builds.
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: GoogleAuthConfig.expoClientId,
    androidClientId: GoogleAuthConfig.androidClientId,
    iosClientId: GoogleAuthConfig.iosClientId,
  });

  useEffect(() => {
    async function handleGoogleResponse() {
      if (response?.type === 'success') {
        const { id_token } = response.params;
        
        try {
          // Send id_token to your backend for verification
          const backendResponse = await api.post('/api/auth/google/mobile', {
            id_token: id_token,
          });

          const { access_token, refresh_token } = backendResponse.data;
          await SecureStore.setItemAsync('accessToken', access_token);
          await SecureStore.setItemAsync('refreshToken', refresh_token);
          setAccessToken(access_token);

        } catch (error) {
          console.error("Google Sign-In failed on backend:", error);
          // Handle error (e.g., show an alert)
        }
      } else if (response?.type === 'error') {
        console.error("Google Auth Error:", response.error);
      }
    }
    handleGoogleResponse();
  }, [response]);

  useEffect(() => {
    async function loadTokens() {
      try {
        const token = await SecureStore.getItemAsync('accessToken');
        if (token) { setAccessToken(token); }
      } catch (e) { console.error('Failed to load auth token.', e); } 
      finally { setIsLoading(false); }
    }
    loadTokens();
  }, []);

  const signIn = async (email, password) => {
    const response = await api.post('/api/auth/signin', { email, password });
    const { access_token, refresh_token } = response.data;
    await SecureStore.setItemAsync('accessToken', access_token);
    await SecureStore.setItemAsync('refreshToken', refresh_token);
    setAccessToken(access_token);
  };

  const signInWithGoogle = async () => {
    await promptAsync();
  };

  const signOut = async () => {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    setAccessToken(null);
  };

  return (
    <AuthContext.Provider value={{ 
      accessToken, 
      isAuthenticated: !!accessToken, 
      isLoading, 
      signIn, 
      signOut,
      signInWithGoogle
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
