import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useUserActivity = () => {
  const { user } = useAuth();

  useEffect(() => {
    const updateLastLogin = async () => {
      if (!user) return;

      try {
        // Update last_login_at for the current user
        const { error } = await supabase
          .from('profiles')
          .update({ last_login_at: new Date().toISOString() })
          .eq('user_id', user.id);

        if (error) {
          console.error('Error updating last login:', error);
        }
      } catch (error) {
        console.error('Error updating user activity:', error);
      }
    };

    // Update on first load if user is logged in
    if (user) {
      updateLastLogin();
    }
  }, [user]);

  return null; // This hook doesn't return anything, just performs side effects
};