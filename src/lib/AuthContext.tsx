'use client'
import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      // Set up Supabase auth for RLS policies
      if (user) {
        try {
          // Get Firebase ID token
          const token = await user.getIdToken();
          
          // Create a custom JWT payload for Supabase
          const customClaims = {
            sub: user.uid,
            email: user.email,
            aud: 'authenticated',
            role: 'authenticated',
          };

          // Set the auth context for Supabase RLS
          await supabase.auth.setSession({
            access_token: token,
            refresh_token: '',
          });
        } catch (error) {
          console.error('Error setting up Supabase auth:', error);
        }
      } else {
        // Clear Supabase session when user logs out
        await supabase.auth.signOut();
      }
      
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      if (error.code === 'auth/popup-blocked') {
        toast({
          title: "Popup Blocked",
          description: "Please disable your browser's popup blocker for this site to allow Google login to work properly.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Login Error",
          description: "An error occurred during login. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}