import type { ProductType } from '../../types';
import { ref, deleteObject } from 'firebase/storage';
import { storage } from '$lib/firebase/vaqmas';

export interface ProductFormData {
	type: ProductType;
	price: number | null;
	oldPrice: number | null;
	canPayForWholeProgram?: boolean;
	ageUnit?: 'months' | 'years';
	[key: string]: any;
}

export interface ValidationErrors {
	oldPrice?: string;
	[key: string]: string | undefined;
}

/**
 * Validates oldPrice field if provided
 */
export function validateOldPrice(
	formData: ProductFormData,
	errors: ValidationErrors,
): void {
	if (formData.oldPrice !== null && formData.oldPrice !== undefined) {
		if (formData.oldPrice < 0) {
			errors.oldPrice = 'El precio anterior debe ser un número válido';
			return;
		}
		if (formData.oldPrice <= (formData.price || 0)) {
			errors.oldPrice = 'El precio anterior debe ser mayor que el precio actual';
		}
	}
}

/**
 * Normalizes price and oldPrice for Firestore based on product type and settings
 */
export function normalizeProductPrices(formData: ProductFormData): {
	price: number | null;
	oldPrice: number | null;
} {
	// For packages and bundles, only save price/oldPrice if toggle is enabled
	if (
		(formData.type === 'package' || formData.type === 'bundle') &&
		!formData.canPayForWholeProgram
	) {
		return { price: null, oldPrice: null };
	}

	return {
		price:
			formData.price !== undefined ? Number(formData.price) : null,
		oldPrice:
			formData.oldPrice !== undefined && formData.oldPrice !== null
				? Number(formData.oldPrice)
				: null,
	};
}

/**
 * Normalizes ageUnit to default to 'months' if not set
 */
export function normalizeAgeUnit(ageUnit?: 'months' | 'years'): 'months' | 'years' {
	return ageUnit || 'months';
}

/**
 * Helper to add unique ID to array
 */
export function addUniqueId(arr: string[], id: string): string[] {
	return arr.includes(id) ? arr : [...arr, id];
}

/**
 * Helper to remove ID from array
 */
export function removeId(arr: string[], idToRemove: string): string[] {
	return arr.filter((id) => id !== idToRemove);
}

/**
 * Helper to handle Enter key for adding IDs
 */
export function handleEnterToAddId(
	event: KeyboardEvent,
	currentIds: string[],
	setter: (ids: string[]) => void,
): void {
	if (event.key !== 'Enter') return;

	const target = event.target as HTMLInputElement;
	const value = target.value.trim();

	if (value && !currentIds.includes(value)) {
		setter(addUniqueId(currentIds, value));
		target.value = '';
	}

	event.preventDefault();
}

/**
 * Helper to handle autocomplete selection
 */
export function handleAutocompleteSelect(
	event: CustomEvent<{ option: { id: string } }>,
	currentIds: string[],
	setter: (ids: string[]) => void,
): void {
	const { option } = event.detail;
	if (!currentIds.includes(option.id)) {
		setter(addUniqueId(currentIds, option.id));
	}
}

/**
 * Resolves storage folder based on product type
 */
export function resolveProductFolder(type: ProductType): string {
	const t = type.toLowerCase().trim();
	if (t === 'vaccine' || t === 'vaccines') return 'products';
	if (t === 'bundle' || t === 'bundles') return 'bundles';
	if (t === 'package' || t === 'packages') return 'packages';
	return t || 'general';
}

/**
 * Deletes product image from storage
 */
export async function deleteProductImage(
	imageUrl: string | null | undefined,
	productType: ProductType,
): Promise<void> {
	if (!imageUrl || imageUrl.startsWith('data:')) {
		return;
	}

	try {
		const folder = resolveProductFolder(productType);
		const imageRef = ref(storage, `${folder}/${imageUrl}`);
		await deleteObject(imageRef);
	} catch (error) {
		console.warn('Could not delete product image:', error);
	}
}

/**
 * Checks if discount preview should be shown
 */
export function shouldShowDiscountPreview(
	price: number | null | undefined,
	oldPrice: number | null | undefined,
): boolean {
	return (
		price !== null &&
		price !== undefined &&
		oldPrice !== null &&
		oldPrice !== undefined &&
		oldPrice > price
	);
}

/**
 * Calculates discount percentage
 */
export function calculateDiscountPercentage(
	oldPrice: number,
	currentPrice: number,
): number {
	return Math.round(((oldPrice - currentPrice) / oldPrice) * 100);
}
