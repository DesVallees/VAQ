import { writable } from 'svelte/store';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
	id: string;
	type: ToastType;
	message: string;
	duration?: number; // in milliseconds, default 5000
}

function createToastStore() {
	const { subscribe, update } = writable<Toast[]>([]);

	const add = (toast: Omit<Toast, 'id'>) => {
		const id = Math.random().toString(36).substring(2, 9);
		update((toasts) => [...toasts, { ...toast, id }]);
		
		// Auto-remove after duration (default 5 seconds)
		const duration = toast.duration ?? 5000;
		if (duration > 0) {
			setTimeout(() => {
				remove(id);
			}, duration);
		}
		
		return id;
	};

	const remove = (id: string) => {
		update((toasts) => toasts.filter((t) => t.id !== id));
	};

	const clear = () => {
		update(() => []);
	};

	return {
		subscribe,
		add,
		remove,
		clear,
		// Convenience methods
		success: (message: string, duration?: number) => {
			return add({ type: 'success', message, duration });
		},
		error: (message: string, duration?: number) => {
			return add({ type: 'error', message, duration });
		},
		warning: (message: string, duration?: number) => {
			return add({ type: 'warning', message, duration });
		},
		info: (message: string, duration?: number) => {
			return add({ type: 'info', message, duration });
		},
	};
}

export const toastStore = createToastStore();

