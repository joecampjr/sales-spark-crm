"use client";

import { useState, createContext, useContext, ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  branchId?: string | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (cpf: string, password: string) => Promise<{ success: boolean; multipleProfiles?: boolean; profiles?: any[]; tempToken?: string; message?: string }>;
  selectProfile: (userId: string, tempToken: string) => Promise<{ success: boolean; message?: string }>;
  switchProfile: (targetUserId: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        } else {
          setUser(null);
        }
      } catch (error) {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = async (cpf: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf, password })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.multipleProfiles) {
          return { 
            success: true, 
            multipleProfiles: true, 
            profiles: data.profiles, 
            tempToken: data.tempToken 
          };
        }
        setUser(data);
        router.refresh(); 
        return { success: true, multipleProfiles: false };
      }
      const err = await res.json();
      return { success: false, message: err.error || 'Credenciais inválidas' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Erro ao conectar ao servidor' };
    }
  };

  const selectProfile = async (userId: string, tempToken: string) => {
    try {
      const res = await fetch('/api/auth/select-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, tempToken })
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data);
        router.push('/dashboard');
        router.refresh();
        return { success: true };
      }
      const err = await res.json();
      return { success: false, message: err.error || 'Erro ao selecionar perfil' };
    } catch (error) {
      console.error('Select profile error:', error);
      return { success: false, message: 'Erro ao conectar ao servidor' };
    }
  };

  const switchProfile = async (targetUserId: string) => {
    try {
      const res = await fetch('/api/auth/switch-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId })
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        router.push('/dashboard');
        router.refresh();
        window.location.reload(); // Recarrega para reconstruir a Sidebar com base nas roles
        return { success: true };
      }
      const err = await res.json();
      return { success: false, message: err.error || 'Erro ao alternar de visualização' };
    } catch (error) {
      console.error('Switch profile error:', error);
      return { success: false, message: 'Erro ao alternar de visualização' };
    }
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/login');
    router.refresh();
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, selectProfile, switchProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

