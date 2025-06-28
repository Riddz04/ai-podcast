'use client'
import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import { toast } from "@/components/ui/use-toast";

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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        setUser(user);
      } catch (error) {
        console.error('Auth state change error:', error);
      } finally {
        setLoading(false);
      }
    });
    
    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      
      if (result.user) {
        toast({
          title: "Login Successful",
          description: `Welcome, ${result.user.displayName || result.user.email}!`,
        });
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      let errorMessage = "An error occurred during login. Please try again.";
      
      if (error.code === 'auth/popup-blocked') {
        errorMessage = "Please disable your browser's popup blocker for this site to allow Google login to work properly.";
      } else if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = "Login was cancelled. Please try again.";
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = "Network error. Please check your internet connection and try again.";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Too many login attempts. Please wait a moment and try again.";
      }
      
      toast({
        title: "Login Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Logout Error",
        description: "An error occurred during logout. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};