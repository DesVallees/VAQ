<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import type { Product, ProductType } from '../../types';
	import { db } from '$lib/firebase/vaqmas';
	import { getDocs, collection, deleteDoc, doc } from 'firebase/firestore';
	import { getImageUrl, getFallbackImage } from '../../lib/utils/imageUtils';

	let products: Product[] = [];
	let loading = true;

	// Initialize from sessionStorage, URL params, or defaults
	let searchTerm = '';
	let selectedType: ProductType | 'all' = 'all';
	let sortBy: 'name' | 'price' | 'date' | 'type' = 'type';
	let sortOrder: 'asc' | 'desc' = 'asc';

	const STORAGE_KEY = 'products-filters';

	// Save to sessionStorage
	function saveToStorage() {
		if (typeof window !== 'undefined') {
			sessionStorage.setItem(
				STORAGE_KEY,
				JSON.stringify({
					searchTerm,
					selectedType,
					sortBy,
					sortOrder,
				}),
			);
		}
	}

	// Load from sessionStorage
	function loadFromStorage() {
		if (typeof window !== 'undefined') {
			const stored = sessionStorage.getItem(STORAGE_KEY);
			if (stored) {
				try {
					const parsed = JSON.parse(stored);
					searchTerm = parsed.searchTerm || '';
					selectedType = parsed.selectedType || 'all';
					sortBy = parsed.sortBy || 'type';
					sortOrder = parsed.sortOrder || 'asc';
				} catch (e) {
					console.error('Error loading from sessionStorage:', e);
				}
			}
		}
	}

	// Update URL and sessionStorage when filters/sort change
	function updateURL() {
		const params = new URLSearchParams();
		if (searchTerm) params.set('search', searchTerm);
		if (selectedType !== 'all') params.set('type', selectedType);
		if (sortBy !== 'type') params.set('sortBy', sortBy);
		if (sortOrder !== 'asc') params.set('sortOrder', sortOrder);

		const queryString = params.toString();
		const newUrl = queryString ? `${$page.url.pathname}?${queryString}` : $page.url.pathname;
		goto(newUrl, { replaceState: true, noScroll: true });
		saveToStorage();
	}

	// Initialize from URL params (priority) or sessionStorage
	function initializeFromURL() {
		const params = $page.url.searchParams;

		// URL params take priority if they exist
		if (
			params.has('search') ||
			params.has('type') ||
			params.has('sortBy') ||
			params.has('sortOrder')
		) {
			searchTerm = params.get('search') || '';
			selectedType = (params.get('type') as ProductType | 'all') || 'all';
			sortBy = (params.get('sortBy') as 'name' | 'price' | 'date' | 'type') || 'type';
			sortOrder = (params.get('sortOrder') as 'asc' | 'desc') || 'asc';
			// Save URL params to storage
			saveToStorage();
		} else {
			// Otherwise load from sessionStorage
			loadFromStorage();
		}
	}

	onMount(async () => {
		initializeFromURL();
		await loadProducts();
	});

	const loadProducts = async () => {
		loading = true;
		try {
			const productsSnapshot = await getDocs(collection(db, 'products'));
			products = await Promise.all(
				productsSnapshot.docs.map(async (docSnap) => {
					const data = docSnap.data();
					const resolvedImageUrl = await getImageUrl(data.imageUrl, data.type);
					return {
						id: docSnap.id,
						...data,
						createdAt: data.createdAt?.toDate() || new Date(),
						resolvedImageUrl,
					} as Product & { resolvedImageUrl: string };
				}),
			);
		} catch (error) {
			console.error('Error loading products:', error);
		} finally {
			loading = false;
		}
	};

	const handleDelete = async (product: Product) => {
		if (confirm(`¿Estás seguro de que quieres eliminar "${product.name}"?`)) {
			try {
				await deleteDoc(doc(db, 'products', product.id));
				await loadProducts();
			} catch (error) {
				console.error('Error deleting product:', error);
				alert('Error al eliminar el producto');
			}
		}
	};

	const formatPrice = (product: Product) => {
		// For bundles and packages, show dash if canPayForWholeProgram is false
		if (
			(product.type === 'bundle' || product.type === 'package') &&
			!product.canPayForWholeProgram
		) {
			return '-';
		}
		// For other cases, show dash if price is null
		if (product.price === null) return '-';
		return new Intl.NumberFormat('es-CO', {
			style: 'currency',
			currency: 'COP',
		}).format(product.price);
	};

	const formatType = (type: ProductType) => {
		const typeMap = {
			vaccine: 'Vacuna',
			bundle: 'Programa',
			package: 'Paquete',
		};
		return typeMap[type] || type;
	};

	const formatDate = (date: Date) => {
		return date.toLocaleDateString('es-CO');
	};

	// Function to handle image loading errors
	const handleImageError = (event: Event, product: Product) => {
		const img = event.target as HTMLImageElement;
		img.style.display = 'none';

		// Create a fallback element
		const fallback = document.createElement('div');
		fallback.className = 'product-image-fallback';
		fallback.textContent = getFallbackImage(product.type);
		fallback.style.cssText = `
			width: 40px;
			height: 40px;
			border-radius: 8px;
			background: linear-gradient(135deg, #e6f7f8 0%, #b3e8ec 100%);
			display: flex;
			align-items: center;
			justify-content: center;
			font-size: 20px;
			border: 2px solid #e5e7eb;
		`;

		img.parentNode?.insertBefore(fallback, img);
	};

	$: filteredProducts = products
		.filter((product) => {
			// Type filter
			if (selectedType !== 'all' && product.type !== selectedType) {
				return false;
			}
			// Search filter
			const searchLower = searchTerm.toLowerCase();
			return (
				product.name.toLowerCase().includes(searchLower) ||
				product.commonName.toLowerCase().includes(searchLower) ||
				product.manufacturer?.toLowerCase().includes(searchLower)
			);
		})
		.sort((a, b) => {
			// First, apply the chosen sort
			let comparison = 0;

			switch (sortBy) {
				case 'name':
					comparison = a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
					break;
				case 'price':
					const priceA = a.price ?? 0;
					const priceB = b.price ?? 0;
					comparison = priceA - priceB;
					break;
				case 'date':
					comparison = a.createdAt.getTime() - b.createdAt.getTime();
					break;
				case 'type':
					comparison = a.type.localeCompare(b.type);
					// If types are equal, sort by name
					if (comparison === 0) {
						comparison = a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
					}
					break;
			}

			// Apply sort order
			let primaryComparison = sortOrder === 'asc' ? comparison : -comparison;

			// Then, if conditions are met, rearrange bundles by hidden status (non-hidden first)
			// Only apply this if: selectedType is 'all' or 'bundle' AND sortBy is 'type'
			const shouldSortByHidden =
				(selectedType === 'all' || selectedType === 'bundle') && sortBy === 'type';

			if (shouldSortByHidden) {
				const aIsBundle = a.type === 'bundle';
				const bIsBundle = b.type === 'bundle';

				// If both are bundles, rearrange by hidden status after primary sort
				if (aIsBundle && bIsBundle) {
					const aIsHidden = Boolean(a.isHidden);
					const bIsHidden = Boolean(b.isHidden);

					// Non-hidden bundles come first (false < true)
					if (aIsHidden !== bIsHidden) {
						// Override primary comparison with hidden status
						return aIsHidden ? 1 : -1;
					}
					// If both have same hidden status, use primary comparison
				}
			}

			// Return the primary comparison
			return primaryComparison;
		});
</script>

<svelte:head>
	<title>VAQ+ Admin - Productos</title>
</svelte:head>

<div class="products-page">
	<div class="page-header">
		<div class="header-content">
			<div class="header-logo">
				<img src="/images/logo.png" alt="VAQ+ Logo" class="header-logo-image" />
				<div class="header-text">
					<h1>Gestión de Productos</h1>
					<p>Administra vacunas, programas y productos médicos</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Search and Actions -->
	<div class="actions-bar">
		<div class="search-container">
			<svg class="search-icon" viewBox="0 0 24 24">
				<path
					d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
				/>
			</svg>
			<input
				type="text"
				placeholder="Buscar productos..."
				bind:value={searchTerm}
				on:input={() => updateURL()}
				class="search-input"
			/>
		</div>

		<button
			class="create-btn"
			on:click={() => {
				const url =
					selectedType !== 'all'
						? `/products/create?type=${selectedType}`
						: '/products/create';
				goto(url);
			}}
		>
			<svg viewBox="0 0 24 24">
				<path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
			</svg>
			Crear Producto
		</button>
	</div>

	<!-- Filters and Sort Controls -->
	<div class="controls-bar">
		<div class="filters-group">
			<label class="control-label">Filtrar por tipo:</label>
			<div class="filter-buttons">
				<button
					class="filter-btn"
					class:active={selectedType === 'all'}
					on:click={() => {
						selectedType = 'all';
						updateURL();
					}}
				>
					Todos
				</button>
				<button
					class="filter-btn"
					class:active={selectedType === 'vaccine'}
					on:click={() => {
						selectedType = 'vaccine';
						updateURL();
					}}
				>
					Vacunas
				</button>
				<button
					class="filter-btn"
					class:active={selectedType === 'bundle'}
					on:click={() => {
						selectedType = 'bundle';
						updateURL();
					}}
				>
					Programas
				</button>
				<button
					class="filter-btn"
					class:active={selectedType === 'package'}
					on:click={() => {
						selectedType = 'package';
						updateURL();
					}}
				>
					Paquetes
				</button>
			</div>
		</div>

		<div class="sort-group">
			<label class="control-label">Ordenar por:</label>
			<select class="sort-select" bind:value={sortBy} on:change={() => updateURL()}>
				<option value="name">Nombre</option>
				<option value="type">Tipo</option>
				<option value="price">Precio</option>
				<option value="date">Fecha de creación</option>
			</select>
			<button
				class="sort-order-btn"
				on:click={() => {
					sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
					updateURL();
				}}
				title={sortOrder === 'asc' ? 'Ascendente' : 'Descendente'}
			>
				<svg viewBox="0 0 24 24" class:desc={sortOrder === 'desc'}>
					<path d="M7 10l5 5 5-5z" />
				</svg>
			</button>
		</div>
	</div>

	<!-- Products Table -->
	<div class="table-container">
		{#if loading}
			<div class="loading-state">
				<div class="spinner" />
				<p>Cargando productos...</p>
			</div>
		{:else if filteredProducts.length === 0}
			<div class="empty-state">
				<svg viewBox="0 0 24 24">
					<path
						d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"
					/>
				</svg>
				<p>No se encontraron productos</p>
				{#if searchTerm}
					<p class="empty-subtitle">Intenta con otros términos de búsqueda</p>
				{/if}
			</div>
		{:else}
			<div class="table-scroll-wrapper">
				<table class="products-table">
					<thead>
						<tr>
							<th class="col-name">Nombre</th>
							<th class="col-type">Tipo</th>
							<th class="col-price">Precio</th>
							<th class="col-age-min">Edad Mín</th>
							<th class="col-age-max">Edad Máx</th>
							<th class="col-manufacturer">Fabricante</th>
							<th class="col-created">Creado</th>
							<th class="col-actions">Acciones</th>
						</tr>
					</thead>
					<tbody>
						{#each filteredProducts as product (product.id)}
							<tr class="product-row">
								<td class="col-name">
									<div class="product-info">
										<img
											src={product.resolvedImageUrl}
											alt={product.name}
											class="product-image"
											on:error={(event) => handleImageError(event, product)}
										/>
										<div>
											<div class="product-name">{product.name}</div>
											<div class="product-common-name">
												{product.commonName}
											</div>
										</div>
									</div>
								</td>
								<td class="col-type">
									<span class="type-badge type-{product.type}">
										{formatType(product.type)}
									</span>
								</td>
								<td class="col-price">{formatPrice(product)}</td>
								<td class="col-age-min"
									>{product.minAge}
									{product.ageUnit === 'years' ? 'años' : 'meses'}</td
								>
								<td class="col-age-max"
									>{product.maxAge}
									{product.ageUnit === 'years' ? 'años' : 'meses'}</td
								>
								<td class="col-manufacturer">{product.manufacturer || '-'}</td>
								<td class="col-created">{formatDate(product.createdAt)}</td>
								<td class="col-actions">
									<div class="action-buttons">
										<button
											class="action-btn edit"
											on:click={() => goto(`/products/${product.id}/edit`)}
											title="Editar"
										>
											<svg viewBox="0 0 24 24">
												<path
													d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
												/>
											</svg>
										</button>
										<button
											class="action-btn delete"
											on:click={() => handleDelete(product)}
											title="Eliminar"
										>
											<svg viewBox="0 0 24 24">
												<path
													d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
												/>
											</svg>
										</button>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>

	<!-- Stats Cards -->
	<div class="stats-section">
		<div class="stats-grid">
			<div class="stat-card">
				<div class="stat-icon">
					<svg viewBox="0 0 24 24">
						<path
							d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"
						/>
					</svg>
				</div>
				<div class="stat-content">
					<h3>Total Productos</h3>
					<p class="stat-number">{products.length}</p>
				</div>
			</div>

			<div class="stat-card">
				<div class="stat-icon vaccines">
					<svg viewBox="0 0 24 24">
						<path
							d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
						/>
					</svg>
				</div>
				<div class="stat-content">
					<h3>Vacunas</h3>
					<p class="stat-number">{products.filter((p) => p.type === 'vaccine').length}</p>
				</div>
			</div>

			<div class="stat-card">
				<div class="stat-icon bundles">
					<svg viewBox="0 0 24 24">
						<path
							d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"
						/>
					</svg>
				</div>
				<div class="stat-content">
					<h3>Programas y Paquetes</h3>
					<p class="stat-number">
						{products.filter((p) => p.type === 'bundle' || p.type === 'package').length}
					</p>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.products-page {
		max-width: 1200px;
		margin: 0 auto;
	}

	.page-header {
		margin-bottom: 2rem;
	}

	.header-content h1 {
		margin: 0 0 0.5rem 0;
		font-size: 2rem;
		font-weight: 700;
		color: #1e3a8a;
	}

	.header-content p {
		margin: 0;
		color: #6b7280;
		font-size: 1rem;
	}

	.actions-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
		gap: 1rem;
	}

	.search-container {
		position: relative;
		flex: 1;
		max-width: 400px;
	}

	.search-icon {
		position: absolute;
		left: 12px;
		top: 50%;
		transform: translateY(-50%);
		width: 20px;
		height: 20px;
		fill: #9ca3af;
	}

	.search-input {
		width: 100%;
		padding: 0.75rem 1rem 0.75rem 2.5rem;
		border: 2px solid #e5e7eb;
		border-radius: 8px;
		font-size: 0.875rem;
		transition: all 0.2s ease;
	}

	.search-input:focus {
		outline: none;
		border-color: #667eea;
		box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
	}

	.create-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		background: #667eea;
		color: white;
		border: none;
		border-radius: 8px;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.create-btn:hover {
		background: #5a67d8;
		transform: translateY(-1px);
	}

	.create-btn svg {
		width: 16px;
		height: 16px;
	}

	.controls-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
		padding: 1rem;
		background: white;
		border-radius: 12px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
		gap: 1.5rem;
		flex-wrap: wrap;
	}

	.filters-group,
	.sort-group {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.control-label {
		font-size: 0.875rem;
		font-weight: 600;
		color: #374151;
		white-space: nowrap;
	}

	.filter-buttons {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.filter-btn {
		padding: 0.5rem 1rem;
		border: 2px solid #e5e7eb;
		background: white;
		border-radius: 8px;
		font-size: 0.875rem;
		font-weight: 500;
		color: #6b7280;
		cursor: pointer;
		transition: all 0.2s ease;
		white-space: nowrap;
	}

	.filter-btn:hover {
		border-color: #667eea;
		color: #667eea;
		background: #f5f3ff;
	}

	.filter-btn.active {
		background: #667eea;
		border-color: #667eea;
		color: white;
	}

	.sort-select {
		padding: 0.5rem 1rem;
		border: 2px solid #e5e7eb;
		border-radius: 8px;
		font-size: 0.875rem;
		font-weight: 500;
		color: #374151;
		background: white;
		cursor: pointer;
		transition: all 0.2s ease;
		appearance: none;
		background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e");
		background-repeat: no-repeat;
		background-position: right 0.75rem center;
		background-size: 1rem;
		padding-right: 2.5rem;
	}

	.sort-select:focus {
		outline: none;
		border-color: #667eea;
		box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
	}

	.sort-order-btn {
		width: 36px;
		height: 36px;
		border: 2px solid #e5e7eb;
		background: white;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.2s ease;
		color: #6b7280;
	}

	.sort-order-btn:hover {
		border-color: #667eea;
		color: #667eea;
		background: #f5f3ff;
	}

	.sort-order-btn svg {
		width: 20px;
		height: 20px;
		transition: transform 0.2s ease;
		fill: currentColor;
	}

	.sort-order-btn svg.desc {
		transform: rotate(180deg);
	}

	.table-container {
		background: white;
		border-radius: 12px;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
		overflow: hidden;
		margin-bottom: 2rem;
	}

	.table-scroll-wrapper {
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}

	.loading-state,
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 4rem 2rem;
		color: #6b7280;
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 3px solid #e5e7eb;
		border-top: 3px solid #667eea;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 1rem;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	.empty-state svg {
		width: 48px;
		height: 48px;
		fill: #d1d5db;
		margin-bottom: 1rem;
	}

	.empty-state p {
		margin: 0;
		font-size: 1rem;
		font-weight: 500;
	}

	.empty-subtitle {
		font-size: 0.875rem !important;
		opacity: 0.7;
	}

	.products-table {
		width: 100%;
		border-collapse: collapse;
	}

	.products-table th {
		background: #f9fafb;
		padding: 1rem;
		text-align: left;
		font-weight: 600;
		font-size: 0.875rem;
		color: #374151;
		border-bottom: 1px solid #e5e7eb;
	}

	.product-row {
		transition: background-color 0.2s ease;
	}

	.product-row:hover {
		background: #f9fafb;
	}

	.product-row td {
		padding: 1rem;
		border-bottom: 1px solid #f3f4f6;
		font-size: 0.875rem;
		color: #374151;
	}

	.product-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.product-image {
		width: 40px;
		height: 40px;
		border-radius: 8px;
		object-fit: cover;
	}

	.product-image-fallback {
		width: 40px;
		height: 40px;
		border-radius: 8px;
		background: linear-gradient(135deg, #e6f7f8 0%, #b3e8ec 100%);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 20px;
		border: 2px solid #e5e7eb;
	}

	.product-name {
		font-weight: 600;
		color: #1f2937;
	}

	.product-common-name {
		font-size: 0.75rem;
		color: #6b7280;
	}

	.type-badge {
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
	}

	.type-vaccine {
		background: #d1fae5;
		color: #065f46;
	}

	.type-bundle,
	.type-package {
		background: #dbeafe;
		color: #1e40af;
	}

	.action-buttons {
		display: flex;
		gap: 0.5rem;
	}

	.action-btn {
		width: 32px;
		height: 32px;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s ease;
	}

	.action-btn svg {
		width: 16px;
		height: 16px;
	}

	.action-btn.edit {
		background: #dbeafe;
		color: #1d4ed8;
	}

	.action-btn.edit:hover {
		background: #bfdbfe;
	}

	.action-btn.delete {
		background: #fee2e2;
		color: #dc2626;
	}

	.action-btn.delete:hover {
		background: #fecaca;
	}

	.stats-section {
		margin-top: 2rem;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1.5rem;
	}

	.stat-card {
		background: white;
		padding: 1.5rem;
		border-radius: 12px;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
		display: flex;
		align-items: center;
		gap: 1rem;
		transition: transform 0.2s ease, box-shadow 0.2s ease;
	}

	.stat-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1);
	}

	.stat-icon {
		width: 60px;
		height: 60px;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	}

	.stat-icon.vaccines {
		background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
	}

	.stat-icon.bundles {
		background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
	}

	.stat-icon svg {
		width: 30px;
		height: 30px;
		fill: white;
	}

	.stat-content h3 {
		margin: 0 0 0.5rem 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.stat-number {
		margin: 0;
		font-size: 1.875rem;
		font-weight: 700;
		color: #1f2937;
	}

	@media (max-width: 768px) {
		.actions-bar {
			flex-direction: column;
			align-items: stretch;
		}

		.search-container {
			max-width: none;
		}

		.controls-bar {
			flex-direction: column;
			align-items: stretch;
			gap: 1rem;
		}

		.filters-group,
		.sort-group {
			flex-direction: column;
			align-items: stretch;
			width: 100%;
		}

		.filter-buttons {
			width: 100%;
		}

		.filter-btn {
			flex: 1;
			min-width: 0;
		}

		.sort-group {
			display: grid;
			grid-template-columns: 1fr auto;
			gap: 0.75rem;
		}

		.sort-select {
			width: 100%;
		}

		.stats-grid {
			grid-template-columns: 1fr;
		}

		.products-table {
			font-size: 0.75rem;
		}

		.product-info {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}

		/* Hide less important columns on mobile */
		.col-age-min,
		.col-age-max,
		.col-manufacturer,
		.col-created {
			display: none;
		}

		/* Ensure minimum table width for scrolling */
		.products-table {
			min-width: 600px;
		}
	}

	@media (max-width: 480px) {
		/* Hide more columns on very small screens */
		.col-type,
		.col-price {
			display: none;
		}

		.products-table {
			min-width: 400px;
		}
	}
</style>
