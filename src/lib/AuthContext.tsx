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
          
          // Show welcome message if user just logged in
          if (session?.user && !user) {
            toast({
              title: "Login Successful",
              description: `Welcome, ${session.user.user_metadata?.full_name || session.user.email}!`,
            });
          }
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

        // Handle different auth events
        if (event === 'SIGNED_IN' && session?.user) {
          toast({
            title: "Login Successful",
            description: `Welcome, ${session.user.user_metadata?.full_name || session.user.email}!`,
          });
        } else if (event === 'SIGNED_OUT') {
          toast({
            title: "Logged Out",
            description: "You have been successfully logged out.",
          });
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed successfully');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      
      // Check if we're in development or production
      const isDevelopment = window.location.hostname === 'localhost';
      const redirectTo = isDevelopment 
        ? `${window.location.origin}/dashboard`
        : `${window.location.origin}/dashboard`;

      console.log('Attempting Google login with redirect to:', redirectTo);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        }
      });

      if (error) {
        console.error('Supabase auth error:', error);
        throw error;
      }

      console.log('OAuth initiated successfully:', data);
      
      // Note: The actual sign-in happens via redirect, so we won't reach here immediately
      // The success toast will be shown after redirect in the auth state change handler
      
    } catch (error: any) {
      console.error('Login error:', error);
      
      let errorMessage = "An error occurred during login. Please try again.";
      
      // Handle specific Supabase auth errors
      if (error.message?.includes('Invalid login credentials')) {
        errorMessage = "Invalid login credentials. Please try again.";
      } else if (error.message?.includes('Email not confirmed')) {
        errorMessage = "Please check your email and confirm your account before logging in.";
      } else if (error.message?.includes('Too many requests')) {
        errorMessage = "Too many login attempts. Please wait a moment and try again.";
      } else if (error.message?.includes('Provider not found')) {
        errorMessage = "Google authentication is not properly configured. Please contact support.";
      } else if (error.message?.includes('redirect_uri_mismatch')) {
        errorMessage = "Authentication redirect URL mismatch. Please contact support.";
      } else if (error.message?.includes('popup')) {
        errorMessage = "Please disable your browser's popup blocker for this site.";
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorMessage = "Network error. Please check your internet connection and try again.";
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
      
      // Clear local state immediately
      setUser(null);
      setSession(null);
      
      // Don't show toast here as it will be shown by the auth state change handler
      
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