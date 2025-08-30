<script lang="ts">
	import { onMount } from 'svelte';
	import type { Product, ProductType } from '../../types';
	import { db } from '$lib/firebase/vaqmas';
	import { getDocs, collection, deleteDoc, doc } from 'firebase/firestore';
	import { getImageUrl, getFallbackImage } from '../../lib/utils/imageUtils';

	let products: Product[] = [];
	let loading = true;
	let searchTerm = '';

	onMount(async () => {
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

	const formatPrice = (price: number | null) => {
		if (price === null) return '-';
		return new Intl.NumberFormat('es-CO', {
			style: 'currency',
			currency: 'COP',
		}).format(price);
	};

	const formatType = (type: ProductType) => {
		const typeMap = {
			vaccine: 'Vacuna',
			bundle: 'Paquete',
			package: 'Programa',
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

	$: filteredProducts = products.filter(
		(product) =>
			product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			product.commonName.toLowerCase().includes(searchTerm.toLowerCase()) ||
			product.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase()),
	);
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
					<p>Administra vacunas, paquetes y productos médicos</p>
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
				class="search-input"
			/>
		</div>

		<button class="create-btn" on:click={() => (window.location.href = '/products/create')}>
			<svg viewBox="0 0 24 24">
				<path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
			</svg>
			Crear Producto
		</button>
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
			<table class="products-table">
				<thead>
					<tr>
						<th>Nombre</th>
						<th>Tipo</th>
						<th>Precio</th>
						<th>Edad Mín</th>
						<th>Edad Máx</th>
						<th>Fabricante</th>
						<th>Creado</th>
						<th>Acciones</th>
					</tr>
				</thead>
				<tbody>
					{#each filteredProducts as product (product.id)}
						<tr class="product-row">
							<td>
								<div class="product-info">
									<img
										src={product.resolvedImageUrl}
										alt={product.name}
										class="product-image"
										on:error={(event) => handleImageError(event, product)}
									/>
									<div>
										<div class="product-name">{product.name}</div>
										<div class="product-common-name">{product.commonName}</div>
									</div>
								</div>
							</td>
							<td>
								<span class="type-badge type-{product.type}">
									{formatType(product.type)}
								</span>
							</td>
							<td>{formatPrice(product.price)}</td>
							<td>{product.minAge} años</td>
							<td>{product.maxAge} años</td>
							<td>{product.manufacturer || '-'}</td>
							<td>{formatDate(product.createdAt)}</td>
							<td>
								<div class="action-buttons">
									<button
										class="action-btn edit"
										on:click={() =>
											(window.location.href = `/products/${product.id}/edit`)}
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
					<h3>Paquetes</h3>
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

	.table-container {
		background: white;
		border-radius: 12px;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
		overflow: hidden;
		margin-bottom: 2rem;
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
	}
</style>
