<script lang="ts">
	import { programs, publicProductsStore } from '../../stores/publicProducts';
	import { getFallbackImage } from '../../lib/utils/imageUtils';
	import type { Product } from '../../types';

	function formatPrice(product: Product): string {
		if (
			(product.type === 'bundle' || product.type === 'package') &&
			!product.canPayForWholeProgram
		) {
			return '';
		}
		if (product.price === null) return '';
		return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(
			product.price,
		);
	}

	function shortDescription(description: string, maxLen = 120): string {
		if (!description) return '';
		const trimmed = description.trim();
		if (trimmed.length <= maxLen) return trimmed;
		return trimmed.slice(0, maxLen).trim() + '…';
	}

	function handleImageError(event: Event, type: string) {
		const img = event.target as HTMLImageElement;
		img.style.display = 'none';
		const fallback = document.createElement('div');
		fallback.className = 'product-card-fallback';
		fallback.textContent = getFallbackImage(type);
		img.parentNode?.insertBefore(fallback, img);
	}

	$: list = $programs;
	$: loading = $publicProductsStore.loading;
	$: loaded = $publicProductsStore.loaded;
</script>

<svelte:head>
	<title>Programas | VAQ+</title>
	<meta
		name="description"
		content="Programas de vacunación. Combinaciones optimizadas para máxima protección."
	/>
</svelte:head>

<div class="list-page">
	<div class="container">
		<header class="page-header">
			<h1>Programas</h1>
			<p class="page-intro">
				Combinaciones optimizadas de vacunas para máxima protección. Consulta precios e
				información de cada programa.
			</p>
		</header>

		{#if loading && !loaded}
			<div class="loading-state">
				<div class="spinner" />
				<p>Cargando programas...</p>
			</div>
		{:else if loaded && list.length === 0}
			<div class="empty-state">
				<p>No hay programas disponibles en este momento.</p>
				<a href="/#products" class="back-link">Volver al inicio</a>
			</div>
		{:else}
			<div class="cards-grid">
				{#each list as product (product.id)}
					<a href="/programs/{product.id}" class="product-card">
						<div class="card-image-wrap">
							<img
								src={product.resolvedImageUrl}
								alt={product.name}
								loading="lazy"
								on:error={(e) => handleImageError(e, product.type)}
							/>
						</div>
						<div class="card-body">
							<h2 class="card-title">{product.name}</h2>
							<p class="card-price">{formatPrice(product)}</p>
							<p class="card-description">{shortDescription(product.description)}</p>
						</div>
					</a>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.list-page {
		padding: 2rem 0 4rem;
		min-height: 60vh;
	}

	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 1rem;
	}

	.page-header {
		margin-bottom: 2.5rem;
		text-align: center;
	}

	.page-header h1 {
		font-size: 2.5rem;
		font-weight: 700;
		color: var(--primary-800, #1e3a8a);
		margin: 0 0 0.5rem 0;
	}

	.page-intro {
		font-size: 1.1rem;
		color: var(--surface-600, #6b7280);
		margin: 0;
		line-height: 1.6;
	}

	.loading-state,
	.empty-state {
		text-align: center;
		padding: 3rem 1rem;
	}

	.spinner {
		width: 40px;
		height: 40px;
		margin: 0 auto 1rem;
		border: 3px solid var(--surface-200, #e5e7eb);
		border-top-color: var(--primary-500, #00aab2);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.empty-state p {
		margin-bottom: 1rem;
		color: var(--surface-600, #6b7280);
	}

	.back-link {
		color: var(--primary-600, #0099a0);
		font-weight: 600;
		text-decoration: none;
	}

	.back-link:hover {
		text-decoration: underline;
	}

	.cards-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1.5rem;
	}

	.product-card {
		background: white;
		border-radius: 12px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
		overflow: hidden;
		text-decoration: none;
		color: inherit;
		transition: transform 0.2s ease, box-shadow 0.2s ease;
		display: flex;
		flex-direction: column;
	}

	.product-card:hover {
		transform: translateY(-4px);
		box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
	}

	.card-image-wrap {
		width: 100%;
		aspect-ratio: 1;
		background: var(--surface-100, #f4f6f8);
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
	}

	.card-image-wrap img {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	.product-card-fallback {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 3rem;
		background: linear-gradient(
			135deg,
			var(--primary-50, #e6f7f8) 0%,
			var(--primary-100, #b3e8ec) 100%
		);
	}

	.card-body {
		padding: 1.25rem;
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.card-title {
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--primary-800, #1e3a8a);
		margin: 0;
		line-height: 1.3;
	}

	.card-price {
		font-size: 1rem;
		font-weight: 600;
		color: var(--primary-600, #0099a0);
		margin: 0;
	}

	.card-description {
		font-size: 0.9rem;
		color: var(--surface-600, #6b7280);
		margin: 0;
		line-height: 1.5;
		flex: 1;
	}

	@media (max-width: 768px) {
		.page-header h1 {
			font-size: 2rem;
		}
		.cards-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
