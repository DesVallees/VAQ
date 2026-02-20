import { writable, derived, get } from 'svelte/store';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '$lib/firebase/vaqmas';
import type { Product } from '../types';
import { getImageUrl } from '../lib/utils/imageUtils';

export type ProductWithImage = Product & { resolvedImageUrl: string };

interface PublicProductsState {
	products: ProductWithImage[];
	loading: boolean;
	loaded: boolean;
	error: string | null;
}

const initialState: PublicProductsState = {
	products: [],
	loading: false,
	loaded: false,
	error: null
};

const store = writable<PublicProductsState>(initialState);

export const publicProductsStore = store;

export const vaccines = derived(store, ($s) =>
	$s.products.filter((p) => p.type === 'vaccine')
);

export const programs = derived(store, ($s) =>
	$s.products.filter((p) => p.type === 'bundle' && !p.isHidden)
);

export const packages = derived(store, ($s) =>
	$s.products.filter((p) => p.type === 'package')
);

export function getProductById(id: string): ProductWithImage | undefined {
	return get(store).products.find((p) => p.id === id);
}

export async function loadProductsIfNeeded(): Promise<void> {
	const state = get(store);
	if (state.loaded || state.loading) return;

	store.update((s) => ({ ...s, loading: true, error: null }));

	try {
		const snapshot = await getDocs(collection(db, 'products'));
		const list = await Promise.all(
			snapshot.docs.map(async (docSnap) => {
				const data = docSnap.data();
				const resolvedImageUrl = await getImageUrl(data.imageUrl, data.type);
				return {
					id: docSnap.id,
					...data,
					createdAt: data.createdAt?.toDate() ?? new Date(),
					resolvedImageUrl
				} as ProductWithImage;
			})
		);
		store.set({
			products: list,
			loading: false,
			loaded: true,
			error: null
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Error al cargar productos';
		console.error('publicProducts load error:', err);
		store.set({
			...get(store),
			loading: false,
			loaded: false,
			error: message
		});
	}
}
