import { useState, useEffect } from 'react';
import { createAuthClient } from 'better-auth/react'; // adjust import if needed
import { useNavigate } from 'react-router-dom';
import { adminClient } from 'better-auth/client/plugins';

export interface UseAuthStatusInterface {
  isLoading: boolean;
  isLoggedIn: boolean;
  user: {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    email: string;
    emailVerified: boolean;
    name: string;
    image?: string | null | undefined;
    banned: boolean | null | undefined;
    role?: string | null | undefined;
    banReason?: string | null | undefined;
    banExpires?: Date | null | undefined;
  };
  session: {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    expiresAt: Date;
    token: string;
    ipAddress?: string | null | undefined;
    userAgent?: string | null | undefined;
    impersonatedBy?: string | null | undefined;
  };
  refresh: () => void;
}

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_SERVER_URL,
  plugins: [adminClient()],
});

export const useAuthStatus = (): UseAuthStatusInterface => {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<any | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const navigate = useNavigate();

  const checkSession = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await authClient.getSession(); // or authClient.useSession()

      if (error || !data?.user) {
        setIsLoggedIn(false);
        setUser(null);
        setSession(null);
        navigate('/home');
      } else {
        setIsLoggedIn(true);
        console.log(data.user);
        setUser(data.user);
        setSession(data.session);
      }
    } catch (err) {
      setIsLoggedIn(false);
      setUser(null);
      navigate('/home');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  return { isLoading, isLoggedIn, user, session, refresh: checkSession };
};

export const authActions = {
  changePassword: async (currentPassword: string, newPassword: string, revokeSessions: boolean) => {
    return await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: revokeSessions,
    });
  },

  listSessions: async () => {
    return await authClient.listSessions();
  },

  revokeSession: async (sessionToken: string) => {
    return await authClient.revokeSession({ token: sessionToken });
  },

  revokeSessions: async () => {
    return await authClient.revokeSessions();
  },
  updateProfile: (data: { name?: string; image?: string }) => authClient.updateUser(data),

};
