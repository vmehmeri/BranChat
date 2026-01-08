import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const PROFILE_STORAGE_KEY = 'branchat_profile';

export interface UserProfile {
  firstName: string;
  lastName: string;
  bio: string;
  photoUrl: string | null;
}

interface UserProfileContextType {
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => void;
  getDisplayName: () => string;
  getInitials: () => string;
}

const defaultProfile: UserProfile = {
  firstName: '',
  lastName: '',
  bio: '',
  photoUrl: null,
};

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (saved) {
      try {
        return { ...defaultProfile, ...JSON.parse(saved) };
      } catch {
        return defaultProfile;
      }
    }
    return defaultProfile;
  });

  // Save to localStorage whenever profile changes
  useEffect(() => {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  }, [profile]);

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setProfile(prev => ({ ...prev, ...updates }));
  }, []);

  const getDisplayName = useCallback(() => {
    const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim();
    return name || 'User';
  }, [profile.firstName, profile.lastName]);

  const getInitials = useCallback(() => {
    if (profile.firstName || profile.lastName) {
      const first = profile.firstName?.[0] || '';
      const last = profile.lastName?.[0] || '';
      return (first + last).toUpperCase() || 'U';
    }
    return 'U';
  }, [profile.firstName, profile.lastName]);

  return (
    <UserProfileContext.Provider value={{
      profile,
      updateProfile,
      getDisplayName,
      getInitials,
    }}>
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
}
