import { User } from '../types';

const USER_STORAGE_KEY = 'swimming_app_user';

export const login = (email: string, nickname: string): User => {
  const user: User = {
    id: btoa(email), // Simple ID generation
    email,
    nickname,
    joinedAt: new Date().toISOString().split('T')[0]
  };
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  return user;
};

export const logout = (): void => {
  localStorage.removeItem(USER_STORAGE_KEY);
};

export const getCurrentUser = (): User | null => {
  const stored = localStorage.getItem(USER_STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
};

export const isLoggedIn = (): boolean => {
  return !!localStorage.getItem(USER_STORAGE_KEY);
};