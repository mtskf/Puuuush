import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithCredential,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { getDatabase, ref, set, get, onValue, type Unsubscribe } from 'firebase/database';
import type { Group } from '@/types';

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
};

// Google OAuth Client ID for Web application (not Chrome extension)
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

/**
 * Sign in with Google using launchWebAuthFlow
 * This opens a browser popup for OAuth and works on any machine
 */
export async function signInWithGoogle(): Promise<User> {
  const redirectUri = chrome.identity.getRedirectURL();

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'token');
  authUrl.searchParams.set('scope', 'openid email profile');

  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      { url: authUrl.toString(), interactive: true },
      async (responseUrl) => {
        if (chrome.runtime.lastError || !responseUrl) {
          reject(new Error(chrome.runtime.lastError?.message || 'Auth failed'));
          return;
        }

        try {
          // Extract access token from response URL
          const url = new URL(responseUrl);
          const hashParams = new URLSearchParams(url.hash.substring(1));
          const accessToken = hashParams.get('access_token');

          if (!accessToken) {
            reject(new Error('No access token in response'));
            return;
          }

          // Sign in to Firebase with the access token
          const credential = GoogleAuthProvider.credential(null, accessToken);
          const result = await signInWithCredential(auth, credential);
          resolve(result.user);
        } catch (error) {
          reject(error);
        }
      }
    );
  });
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

/**
 * Get the current authenticated user
 */
export function getCurrentUser(): User | null {
  return auth.currentUser;
}

/**
 * Subscribe to auth state changes
 */
export function onAuthStateChanged(callback: (user: User | null) => void): Unsubscribe {
  return firebaseOnAuthStateChanged(auth, callback);
}

/**
 * Get user's groups from Firebase
 */
export async function getGroupsFromFirebase(userId: string): Promise<Group[]> {
  const groupsRef = ref(database, `users/${userId}/groups`);
  const snapshot = await get(groupsRef);

  if (!snapshot.exists()) {
    return [];
  }

  const data = snapshot.val();
  // Convert object to array
  return Object.values(data) as Group[];
}

/**
 * Save groups to Firebase
 */
export async function saveGroupsToFirebase(userId: string, groups: Group[]): Promise<void> {
  const groupsRef = ref(database, `users/${userId}/groups`);

  // Convert array to object with group IDs as keys for efficient updates
  const groupsObject: Record<string, Group> = {};
  groups.forEach(group => {
    groupsObject[group.id] = group;
  });

  await set(groupsRef, groupsObject);
}

/**
 * Subscribe to real-time updates for user's groups
 */
export function subscribeToGroups(
  userId: string,
  callback: (groups: Group[]) => void
): Unsubscribe {
  const groupsRef = ref(database, `users/${userId}/groups`);

  return onValue(groupsRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }

    const data = snapshot.val();
    const groups = Object.values(data) as Group[];
    callback(groups);
  });
}

export { auth, database };
export type { User };
