'use client'
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { User, Session, AuthError } from "@supabase/supabase-js";
import { toast } from "@/components/ui/use-toast";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting session:', error);
        } else {
          setSession(session);
          setUser(session?.user ?? null);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        }
      });

      if (error) {
        throw error;
      }

      // Note: The actual sign-in happens via redirect, so we won't reach here immediately
      // The success toast will be shown after redirect in the dashboard
      
    } catch (error: any) {
      console.error('Login error:', error);
      
      let errorMessage = "An error occurred during login. Please try again.";
      
      if (error.message?.includes('popup')) {
        errorMessage = "Please disable your browser's popup blocker for this site to allow Google login to work properly.";
      } else if (error.message?.includes('cancelled')) {
        errorMessage = "Login was cancelled. Please try again.";
      } else if (error.message?.includes('network')) {
        errorMessage = "Network error. Please check your internet connection and try again.";
      } else if (error.message?.includes('rate')) {
        errorMessage = "Too many login attempts. Please wait a moment and try again.";
      } else if (error.message) {
        errorMessage = error.message;
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
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
    } catch (error: any) {
      console.error('Logout error:', error);
      toast({
        title: "Logout Error",
        description: error.message || "An error occurred during logout. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, loginWithGoogle, logout }}>
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