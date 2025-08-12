import { writable } from 'svelte/store';

export interface User {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
}

export interface AuthState {
    user: User | null;
    isAdmin: boolean;
    isLoading: boolean;
}

const initialState: AuthState = {
    user: null,
    isAdmin: false,
    isLoading: true
};

export const userStore = writable<AuthState>(initialState);
