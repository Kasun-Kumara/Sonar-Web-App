import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import type { Team } from './types';
import { validateTeamCredentials, getTeamById } from './appwrite';

interface AuthState {
	user: Team | null;
	isAuthenticated: boolean;
	isLoading: boolean;
}

function createAuthStore() {
	const { subscribe, set, update } = writable<AuthState>({
		user: null,
		isAuthenticated: false,
		isLoading: true
	});

	// Initialize from localStorage
	if (browser) {
		const stored = localStorage.getItem('sonar_session');
		if (stored) {
			try {
				const user = JSON.parse(stored);
				set({ user, isAuthenticated: true, isLoading: false });
			} catch (e) {
				localStorage.removeItem('sonar_session');
				set({ user: null, isAuthenticated: false, isLoading: false });
			}
		} else {
			update((state) => ({ ...state, isLoading: false }));
		}
	}

	return {
		subscribe,
		login: async (teamName: string, password: string) => {
			update((state) => ({ ...state, isLoading: true }));
			try {
				const team = await validateTeamCredentials(teamName, password);
				if (team) {
					if (browser) {
						localStorage.setItem('sonar_session', JSON.stringify(team));
					}
					set({ user: team, isAuthenticated: true, isLoading: false });
					return { success: true, user: team };
				} else {
					set({ user: null, isAuthenticated: false, isLoading: false });
					return { success: false, error: 'Invalid credentials' };
				}
			} catch (error) {
				set({ user: null, isAuthenticated: false, isLoading: false });
				return { success: false, error: 'Login failed' };
			}
		},
		logout: () => {
			if (browser) {
				localStorage.removeItem('sonar_session');
			}
			set({ user: null, isAuthenticated: false, isLoading: false });
		},
		updateUser: (user: Team) => {
			if (browser) {
				localStorage.setItem('sonar_session', JSON.stringify(user));
			}
			update((state) => ({ ...state, user }));
		},
		checkAuth: () => {
			if (browser) {
				const stored = localStorage.getItem('sonar_session');
				if (stored) {
					try {
						const user = JSON.parse(stored);
						set({ user, isAuthenticated: true, isLoading: false });
						return true;
					} catch (e) {
						localStorage.removeItem('sonar_session');
						set({ user: null, isAuthenticated: false, isLoading: false });
						return false;
					}
				}
			}
			return false;
		},
		refreshUser: async (userId: string) => {
			try {
				const team = await getTeamById(userId);
				if (team && browser) {
					localStorage.setItem('sonar_session', JSON.stringify(team));
					update((state) => ({ ...state, user: team }));
				}
			} catch (e) {
				console.error('Failed to refresh user:', e);
			}
		}
	};
}

export const authStore = createAuthStore();
