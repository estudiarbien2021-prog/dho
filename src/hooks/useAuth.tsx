import * as React from "react";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from '@supabase/supabase-js';
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  console.log('🔐 AuthProvider starting, React available:', !!React);
  console.log('🔐 useState available:', !!React.useState);
  
  const [user, setUser] = React.useState<User | null>(null);
  const [session, setSession] = React.useState<Session | null>(null);
  const [loading, setLoading] = React.useState(true);

  // User activity tracking moved here to avoid circular dependencies
  React.useEffect(() => {
    const updateLastLogin = async () => {
      if (!user) {
        console.log('🔐 Pas d\'utilisateur connecté pour mettre à jour last_login_at');
        return;
      }

      console.log('🔐 Mise à jour de last_login_at pour l\'utilisateur:', user.id);
      
      try {
        // Update last_login_at for the current user
        const { error } = await supabase
          .from('profiles')
          .update({ last_login_at: new Date().toISOString() })
          .eq('user_id', user.id);

        if (error) {
          console.error('❌ Erreur lors de la mise à jour de last_login_at:', error);
        } else {
          console.log('✅ last_login_at mis à jour avec succès');
        }
      } catch (error) {
        console.error('❌ Erreur lors de la mise à jour de l\'activité utilisateur:', error);
      }
    };

    // Update on first load if user is logged in
    if (user) {
      console.log('👤 Utilisateur détecté, mise à jour de last_login_at...');
      updateLastLogin();
    }
  }, [user]);

  React.useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut({ scope: 'global' });
      // Force page reload for a clean state
      window.location.href = '/auth';
    } catch (error) {
      console.error('Sign out error:', error);
      // Force reload anyway
      window.location.href = '/auth';
    }
  };

  return (
    <React.Fragment>
      {React.createElement(AuthContext.Provider, { value: { user, session, loading, signOut } }, children)}
    </React.Fragment>
  );
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};