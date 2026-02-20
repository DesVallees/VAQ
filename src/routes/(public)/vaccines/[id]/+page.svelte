<script lang="ts">
	import { page } from '$app/stores';
	import { getProductById } from '../../../stores/publicProducts';
	import { getFallbackImage } from '../../../lib/utils/imageUtils';
	import type { Vaccine } from '../../../types';

	function formatPrice(price: number | null): string {
		if (price === null) return '';
		return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(price);
	}

	function handleImageError(event: Event, type: string) {
		const img = event.target as HTMLImageElement;
		img.style.display = 'none';
		const fallback = document.createElement('div');
		fallback.className = 'detail-fallback';
		fallback.textContent = getFallbackImage(type);
		img.parentNode?.insertBefore(fallback, img);
	}

	$: productId = $page.params.id;
	$: rawProduct = getProductById(productId);
	$: product = rawProduct?.type === 'vaccine' ? (rawProduct as Vaccine) : undefined;
	$: notFound = product === undefined;
</script>

<svelte:head>
	<title>{product ? `${product.name} | VAQ+` : 'Vacuna | VAQ+'}</title>
	<meta
		name="description"
		content={product
			? product.description?.slice(0, 160) ?? product.name
			: 'Información de vacuna en VAQ+'}
	/>
</svelte:head>

<div class="detail-page">
	<div class="container">
		{#if notFound}
			<div class="not-found">
				<h1>No encontrado</h1>
				<p>La vacuna que buscas no existe o no está disponible.</p>
				<a href="/vaccines" class="back-link">Volver a vacunas</a>
			</div>
		{:else if product}
			<a href="/vaccines" class="back-link breadcrumb">← Volver a vacunas</a>

			<article class="detail-article">
				<div class="detail-hero">
					<div class="detail-image-wrap">
						<img
							src={product.resolvedImageUrl}
							alt={product.name}
							loading="lazy"
							on:error={(e) => handleImageError(e, product.type)}
						/>
					</div>
					<div class="detail-hero-text">
						<h1>{product.name}</h1>
						{#if product.commonName && product.commonName !== product.name}
							<p class="common-name">{product.commonName}</p>
						{/if}
						<p class="detail-price">{formatPrice(product.price)}</p>
					</div>
				</div>

				{#if product.description}
					<section class="detail-section">
						<h2>Descripción</h2>
						<p class="detail-description">{product.description}</p>
					</section>
				{/if}

				<section class="detail-section">
					<h2>Información</h2>
					<dl class="detail-dl">
						{#if product.manufacturer}
							<dt>Fabricante</dt>
							<dd>{product.manufacturer}</dd>
						{/if}
						{#if product.dosageInfo}
							<dt>Dosis</dt>
							<dd>{product.dosageInfo}</dd>
						{/if}
						{#if product.targetDiseases}
							<dt>Enfermedades que previene</dt>
							<dd>{product.targetDiseases}</dd>
						{/if}
						{#if product.dosesAndBoosters}
							<dt>Dosis y refuerzos</dt>
							<dd>{product.dosesAndBoosters}</dd>
						{/if}
						{#if product.specialIndications}
							<dt>Indicaciones especiales</dt>
							<dd>{product.specialIndications}</dd>
						{/if}
						{#if product.contraindications}
							<dt>Contraindicaciones</dt>
							<dd>{product.contraindications}</dd>
						{/if}
						{#if product.precautions}
							<dt>Precauciones</dt>
							<dd>{product.precautions}</dd>
						{/if}
					</dl>
				</section>

				<div class="app-note">
					<p>La compra y el agendamiento se realizan desde la app VAQ+.</p>
				</div>
			</article>
		{/if}
	</div>
</div>

<style>
	.detail-page {
		padding: 2rem 0 4rem;
		min-height: 60vh;
	}

	.container {
		max-width: 800px;
		margin: 0 auto;
		padding: 0 1rem;
	}

	.back-link {
		color: var(--primary-600, #0099a0);
		font-weight: 600;
		text-decoration: none;
		display: inline-block;
		margin-bottom: 1.5rem;
	}

	.back-link:hover {
		text-decoration: underline;
	}

	.breadcrumb {
		font-size: 0.95rem;
	}

	.not-found {
		text-align: center;
		padding: 3rem 1rem;
	}

	.not-found h1 {
		font-size: 1.75rem;
		color: var(--primary-800, #1e3a8a);
		margin-bottom: 0.5rem;
	}

	.not-found p {
		color: var(--surface-600, #6b7280);
		margin-bottom: 1rem;
	}

	.detail-hero {
		display: flex;
		gap: 2rem;
		align-items: flex-start;
		margin-bottom: 2rem;
		flex-wrap: wrap;
	}

	.detail-image-wrap {
		width: 240px;
		flex-shrink: 0;
		background: var(--surface-100, #f4f6f8);
		border-radius: 12px;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.detail-image-wrap img {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	.detail-fallback {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 4rem;
		background: linear-gradient(
			135deg,
			var(--primary-50, #e6f7f8) 0%,
			var(--primary-100, #b3e8ec) 100%
		);
	}

	.detail-hero-text {
		flex: 1;
		min-width: 200px;
	}

	.detail-hero-text h1 {
		font-size: 2rem;
		font-weight: 700;
		color: var(--primary-800, #1e3a8a);
		margin: 0 0 0.25rem 0;
		line-height: 1.3;
	}

	.common-name {
		font-size: 1rem;
		color: var(--surface-600, #6b7280);
		margin: 0 0 0.5rem 0;
	}

	.detail-price {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--primary-600, #0099a0);
		margin: 0;
	}

	.detail-section {
		margin-bottom: 2rem;
	}

	.detail-section h2 {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--primary-800, #1e3a8a);
		margin: 0 0 0.75rem 0;
	}

	.detail-description {
		font-size: 1rem;
		line-height: 1.7;
		color: var(--surface-700, #374151);
		margin: 0;
	}

	.detail-dl {
		margin: 0;
		display: grid;
		gap: 0.5rem 1.5rem;
		grid-template-columns: auto 1fr;
	}

	.detail-dl dt {
		font-weight: 600;
		color: var(--surface-700, #374151);
		margin: 0;
	}

	.detail-dl dd {
		margin: 0;
		color: var(--surface-600, #6b7280);
		line-height: 1.5;
	}

	.app-note {
		background: var(--primary-50, #e6f7f8);
		border-radius: 10px;
		padding: 1.25rem;
		margin-top: 2rem;
	}

	.app-note p {
		margin: 0;
		font-size: 0.95rem;
		color: var(--primary-800, #1e3a8a);
		font-weight: 500;
	}

	@media (max-width: 768px) {
		.detail-hero {
			flex-direction: column;
			align-items: center;
			text-align: center;
		}

		.detail-hero-text {
			text-align: center;
		}

		.detail-image-wrap {
			width: 200px;
		}
	}
</style>
