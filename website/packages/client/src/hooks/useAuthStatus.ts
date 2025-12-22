import { useState, useEffect } from 'react';
import { createAuthClient } from 'better-auth/react'; // adjust import if needed
import { useNavigate } from 'react-router-dom';

interface UseAuthStatus {
  isLoading: boolean;
  isLoggedIn: boolean;
  session: {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    expiresAt: Date;
    token: string;
    ipAddress?: string | null | undefined;
    userAgent?: string | null | undefined;
  } | null;
  user: {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    email: string;
    emailVerified: boolean;
    name: string;
    image?: string | null | undefined;
  } | null;
}

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_SERVER_URL,
});

export const useAuthStatus = (): UseAuthStatus => {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<any | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await authClient.getSession(); // or authClient.useSession()
        if (!isMounted) return;

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
        if (!isMounted) return;
        setIsLoggedIn(false);
        setUser(null);
        navigate('/home');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    checkSession();

    console.log(user);
    return () => {
      isMounted = false;
    };
  }, []);

  return { isLoading, isLoggedIn, session, user };
};
