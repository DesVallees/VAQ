/**
 * Utility functions for handling image URLs in the VAQ application
 */

import { storage } from '$lib/firebase/vaqmas';
import { ref, getDownloadURL } from 'firebase/storage';

/**
 * Resolve the folder to use for a given product type.
 * - vaccines  -> "products"
 * - bundles   -> "bundles"
 * - packages  -> "packages"
 * - anything else -> the provided type as the folder name
 */
function resolveFolder(type?: string): string {
    const t = (type || '').toLowerCase().trim();

    if (t === 'vaccine' || t === 'vaccines') return 'products';
    if (t === 'bundle' || t === 'bundles') return 'bundles';
    if (t === 'package' || t === 'packages') return 'packages';

    // Use the provided type directly as folder name (per requirement),
    // or default to "general" if nothing is given.
    return t || 'general';
}

/**
 * Returns the Firebase Storage download URL for a product image.
 * @param fileName  e.g. "12meses.jpg" (DB now stores just the file name)
 * @param type      product type, used to decide the folder (see resolveFolder)
 * @returns         a public download URL, or the fallback image URL on failure
 */
export async function getImageUrl(fileName?: string, type?: string): Promise<string> {
    // Guard: if we don't have a file name, go straight to fallback
    if (!fileName || typeof fileName !== 'string') {
        return await Promise.resolve(getFallbackImage(type));
    }

    // Make sure we only keep the base file name (strip accidental paths)
    const baseName = fileName.split('/').pop()!.trim();
    if (!baseName) {
        return await Promise.resolve(getFallbackImage(type));
    }

    const folder = resolveFolder(type);
    const storagePath = `${folder}/${baseName}`;

    try {
        const fileRef = ref(storage, storagePath);
        const url = await getDownloadURL(fileRef);
        return url;
    } catch (err) {
        // Could be missing object or permissions. Fall back gracefully.
        console.warn(`getImageUrl: falling back for ${storagePath}`, err);
        return await Promise.resolve(getFallbackImage(type));
    }
}

/**
 * Gets a fallback image URL when the main image fails to load
 * @param productType - Type of product (vaccine, bundle, package)
 * @returns Fallback image URL or emoji
 */
export function getFallbackImage(productType: string = 'default'): string {
    // You can replace these with actual fallback image URLs
    const fallbackImages = {
        vaccine: '💉',
        bundle: '📦',
        package: '📦',
        default: '💊'
    };

    return fallbackImages[productType as keyof typeof fallbackImages] || fallbackImages.default;
}

/**
 * Checks if an image URL is valid and accessible
 * @param imageUrl - Image URL to check
 * @returns Promise that resolves to true if image is accessible
 */
export async function isImageAccessible(imageUrl: string): Promise<boolean> {
    if (!imageUrl) return false;

    try {
        const response = await fetch(imageUrl, { method: 'HEAD' });
        return response.ok;
    } catch (error) {
        console.warn('Image accessibility check failed:', error);
        return false;
    }
}

/**
 * Gets the Firebase Storage bucket name from the app config
 * @returns Storage bucket name
 */
export function getStorageBucket(): string {
    return storage.app.options.storageBucket || '';
}
