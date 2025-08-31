<script lang="ts">
	import { onMount } from 'svelte';
	import type { Article, ArticleCategory } from '../../types';
	import { db } from '$lib/firebase/vaqmas';
	import { getDocs, collection, deleteDoc, doc } from 'firebase/firestore';
	import { getImageUrl, getFallbackImage } from '../../lib/utils/imageUtils';

	let articles: (Article & { resolvedImageUrl: string })[] = [];
	let loading = true;
	let searchTerm = '';
	let categoryFilter: ArticleCategory | 'all' = 'all';
	let selectedArticle: (Article & { resolvedImageUrl: string }) | null = null;
	let showDetails = false;

	onMount(async () => {
		await loadArticles();
	});

	const loadArticles = async () => {
		loading = true;
		try {
			const articlesSnapshot = await getDocs(collection(db, 'articles'));
			articles = await Promise.all(
				articlesSnapshot.docs.map(async (doc) => {
					const data = doc.data();
					const resolvedImageUrl = await getImageUrl(data.heroImageUrl, 'articles');
					return {
						id: doc.id,
						...data,
						createdAt: data.createdAt?.toDate() || new Date(),
						publishedAt: data.publishedAt?.toDate() || null,
						resolvedImageUrl,
					} as Article & { resolvedImageUrl: string };
				}),
			);
		} catch (error) {
			console.error('Error loading articles:', error);
		} finally {
			loading = false;
		}
	};

	const handleDelete = async (article: Article) => {
		if (confirm(`¿Estás seguro de que quieres eliminar "${article.title}"?`)) {
			try {
				await deleteDoc(doc(db, 'articles', article.id));
				await loadArticles();
			} catch (error) {
				console.error('Error deleting article:', error);
				alert('Error al eliminar el artículo');
			}
		}
	};

	const openDetails = (article: Article & { resolvedImageUrl: string }) => {
		selectedArticle = article;
		showDetails = true;
	};

	const closeDetails = () => {
		showDetails = false;
		selectedArticle = null;
	};

	const formatDate = (date: Date | null) => {
		if (!date) return 'No publicado';
		return date.toLocaleDateString('es-CO');
	};

	const formatDateTime = (date: Date | null) => {
		if (!date) return 'No publicado';
		return date.toLocaleDateString('es-CO', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	};

	const formatCategory = (category: ArticleCategory) => {
		const categoryMap = {
			education: 'Educación',
			promotion: 'Promoción',
			announcement: 'Anuncio',
		};
		return categoryMap[category] || category;
	};

	const getCategoryColor = (category: ArticleCategory) => {
		const colorMap = {
			education: '#10b981',
			promotion: '#f59e0b',
			announcement: '#3b82f6',
		};
		return colorMap[category] || '#6b7280';
	};

	const getCategoryBadgeClass = (category: ArticleCategory) => {
		return `category-badge category-${category}`;
	};

	// Get unique categories for filter
	$: categories = [...new Set(articles.map((a) => a.category))];

	// Filter articles based on search and filters
	$: filteredArticles = articles.filter((article) => {
		const matchesSearch =
			article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
			article.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
			article.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
			false;

		const matchesCategory = categoryFilter === 'all' || article.category === categoryFilter;

		return matchesSearch && matchesCategory;
	});

	// Calculate statistics
	$: totalArticles = articles.length;
	$: publishedArticles = articles.filter((a) => a.publishedAt).length;
	$: draftArticles = articles.filter((a) => !a.publishedAt).length;
	$: totalCategories = categories.length;
	$: totalViews = 0; // Articles don't have view count in current schema

	// Function to handle image loading errors
	const handleImageError = (event: Event, article: Article) => {
		const img = event.target as HTMLImageElement;
		img.style.display = 'none';

		// Create a fallback element
		const fallback = document.createElement('div');
		fallback.className = 'article-image-fallback';
		fallback.innerHTML = `
			<svg viewBox="0 0 24 24">
				<path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
			</svg>
		`;

		img.parentNode?.insertBefore(fallback, img);
	};
</script>

<div class="articles-page">
	<div class="page-header">
		<div class="header-content">
			<div class="header-logo">
				<img src="/images/logo.png" alt="VAQ+ Logo" class="header-logo-image" />
				<div class="header-text">
					<h1>Gestión de Artículos</h1>
					<p>Administra contenido educativo y artículos médicos para padres</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Search and Filters -->
	<div class="actions-bar">
		<div class="search-container">
			<svg class="search-icon" viewBox="0 0 24 24">
				<path
					d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
				/>
			</svg>
			<input
				type="text"
				placeholder="Buscar artículos por título, resumen o autor..."
				bind:value={searchTerm}
				class="search-input"
			/>
		</div>

		<div class="filters-container">
			<select bind:value={categoryFilter} class="filter-select">
				<option value="all">Todas las categorías</option>
				{#each categories as category}
					<option value={category}>{formatCategory(category)}</option>
				{/each}
			</select>
		</div>

		<button class="create-btn" on:click={() => (window.location.href = '/articles/create')}>
			<svg viewBox="0 0 24 24">
				<path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
			</svg>
			Nuevo Artículo
		</button>
	</div>

	<!-- Articles Table -->
	<div class="table-container">
		{#if loading}
			<div class="loading-state">
				<div class="spinner" />
				<p>Cargando artículos...</p>
			</div>
		{:else if filteredArticles.length === 0}
			<div class="empty-state">
				<svg viewBox="0 0 24 24">
					<path
						d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"
					/>
				</svg>
				<p>No se encontraron artículos</p>
				{#if searchTerm || categoryFilter !== 'all'}
					<p class="empty-subtitle">Intenta con otros filtros de búsqueda</p>
				{/if}
			</div>
		{:else}
			<div class="table-scroll-wrapper">
				<table class="articles-table">
					<thead>
						<tr>
							<th class="col-article">Artículo</th>
							<th class="col-category">Categoría</th>
							<th class="col-author">Autor</th>
							<th class="col-status">Estado</th>
							<th class="col-views">Vistas</th>
							<th class="col-date">Fecha</th>
							<th class="col-actions">Acciones</th>
						</tr>
					</thead>
					<tbody>
						{#each filteredArticles as article (article.id)}
							<tr class="article-row">
								<td class="col-article">
									<div class="article-info">
										<div class="article-image">
											{#if article.resolvedImageUrl}
												<img
													src={article.resolvedImageUrl}
													alt="Imagen destacada"
													on:error={(event) =>
														handleImageError(event, article)}
												/>
											{:else}
												<svg viewBox="0 0 24 24">
													<path
														d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"
													/>
												</svg>
											{/if}
										</div>
										<div class="article-details">
											<div class="article-title">{article.title}</div>
											<div class="article-summary">{article.excerpt}</div>
										</div>
									</div>
								</td>
								<td class="col-category">
									<span
										class={getCategoryBadgeClass(article.category)}
										style="background-color: {getCategoryColor(
											article.category,
										)}"
									>
										{formatCategory(article.category)}
									</span>
								</td>
								<td class="col-author">
									<div class="author-info">
										<div class="author-name">{article.author}</div>
									</div>
								</td>
								<td class="col-status">
									<div class="status-info">
										{#if article.publishedAt}
											<span class="status-badge published">Publicado</span>
										{:else}
											<span class="status-badge draft">Borrador</span>
										{/if}
									</div>
								</td>
								<td class="col-views">
									<div class="views-info">
										<div class="views-count">-</div>
									</div>
								</td>
								<td class="col-date">
									<div class="date-info">
										<div class="publish-date">
											{formatDate(article.publishedAt)}
										</div>
										<div class="create-date">
											Creado: {formatDate(article.createdAt)}
										</div>
									</div>
								</td>
								<td class="col-actions">
									<div class="action-buttons">
										<button
											class="action-btn view"
											on:click={() => openDetails(article)}
											title="Ver detalles"
										>
											<svg viewBox="0 0 24 24">
												<path
													d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
												/>
											</svg>
										</button>
										<button
											class="action-btn edit"
											on:click={() =>
												(window.location.href = `/articles/${article.id}/edit`)}
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
											on:click={() => handleDelete(article)}
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
							d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"
						/>
					</svg>
				</div>
				<div class="stat-content">
					<h3>Total Artículos</h3>
					<p class="stat-number">{totalArticles}</p>
				</div>
			</div>

			<div class="stat-card">
				<div class="stat-icon published">
					<svg viewBox="0 0 24 24">
						<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
					</svg>
				</div>
				<div class="stat-content">
					<h3>Publicados</h3>
					<p class="stat-number">{publishedArticles}</p>
				</div>
			</div>

			<div class="stat-card">
				<div class="stat-icon draft">
					<svg viewBox="0 0 24 24">
						<path
							d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
						/>
					</svg>
				</div>
				<div class="stat-content">
					<h3>Borradores</h3>
					<p class="stat-number">{draftArticles}</p>
				</div>
			</div>

			<div class="stat-card">
				<div class="stat-icon views">
					<svg viewBox="0 0 24 24">
						<path
							d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
						/>
					</svg>
				</div>
				<div class="stat-content">
					<h3>Total Vistas</h3>
					<p class="stat-number">{totalViews.toLocaleString()}</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Article Details Modal -->
	{#if showDetails && selectedArticle}
		<div class="modal-overlay" on:click={closeDetails}>
			<div class="modal-content" on:click|stopPropagation>
				<div class="modal-header">
					<h2>Detalles del Artículo</h2>
					<button class="modal-close" on:click={closeDetails}>
						<svg viewBox="0 0 24 24">
							<path
								d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
							/>
						</svg>
					</button>
				</div>
				<div class="modal-body">
					<div class="detail-section">
						<h3>Información Básica</h3>
						<div class="detail-grid">
							<div class="detail-item">
								<label>Título:</label>
								<span>{selectedArticle.title}</span>
							</div>
							<div class="detail-item">
								<label>Categoría:</label>
								<span
									class={getCategoryBadgeClass(selectedArticle.category)}
									style="background-color: {getCategoryColor(
										selectedArticle.category,
									)}"
								>
									{formatCategory(selectedArticle.category)}
								</span>
							</div>
							<div class="detail-item">
								<label>Autor:</label>
								<span>{selectedArticle.author}</span>
							</div>
							<div class="detail-item">
								<label>Estado:</label>
								<span
									class={selectedArticle.publishedAt
										? 'status-badge published'
										: 'status-badge draft'}
								>
									{selectedArticle.publishedAt ? 'Publicado' : 'Borrador'}
								</span>
							</div>
						</div>
					</div>

					<div class="detail-section">
						<h3>Resumen</h3>
						<div class="detail-item full-width">
							<label>Descripción:</label>
							<span>{selectedArticle.excerpt}</span>
						</div>
					</div>

					{#if selectedArticle.heroImageUrl}
						<div class="detail-section">
							<h3>Imagen Destacada</h3>
							<div class="detail-item full-width">
								<img
									src={selectedArticle.resolvedImageUrl}
									alt="Imagen destacada"
									class="featured-image"
									on:error={(event) =>
										selectedArticle && handleImageError(event, selectedArticle)}
								/>
							</div>
						</div>
					{/if}

					<div class="detail-section">
						<h3>Estadísticas</h3>
						<div class="detail-grid">
							<div class="detail-item">
								<label>Vistas:</label>
								<span>-</span>
							</div>
							<div class="detail-item">
								<label>Likes:</label>
								<span>-</span>
							</div>
							<div class="detail-item">
								<label>Compartidos:</label>
								<span>-</span>
							</div>
						</div>
					</div>

					<div class="detail-section">
						<h3>Fechas</h3>
						<div class="detail-grid">
							<div class="detail-item">
								<label>Fecha de Creación:</label>
								<span>{formatDate(selectedArticle.createdAt)}</span>
							</div>
							<div class="detail-item">
								<label>Fecha de Publicación:</label>
								<span>{formatDate(selectedArticle.publishedAt)}</span>
							</div>
						</div>
					</div>

					{#if selectedArticle.tags && selectedArticle.tags.length > 0}
						<div class="detail-section">
							<h3>Etiquetas</h3>
							<div class="detail-item full-width">
								<div class="tags-container">
									{#each selectedArticle.tags as tag}
										<span class="tag">{tag}</span>
									{/each}
								</div>
							</div>
						</div>
					{/if}
				</div>
				<div class="modal-footer">
					<button class="btn btn-secondary" on:click={closeDetails}>Cerrar</button>
					<button
						class="btn btn-primary"
						on:click={() => {
							if (selectedArticle) {
								closeDetails();
								window.location.href = `/articles/${selectedArticle.id}/edit`;
							}
						}}
					>
						Editar Artículo
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.table-scroll-wrapper {
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}

	/* Articles specific styles */
	.articles-table {
		width: 100%;
		border-collapse: collapse;
	}

	.articles-table th {
		background-color: var(--neutral-50);
		padding: var(--spacing-4);
		text-align: left;
		font-weight: var(--font-weight-semibold);
		color: var(--neutral-700);
		border-bottom: 1px solid var(--neutral-200);
		font-size: var(--font-size-sm);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.articles-table td {
		padding: var(--spacing-4);
		border-bottom: 1px solid var(--neutral-100);
		vertical-align: middle;
	}

	.articles-table tbody tr {
		transition: background-color var(--transition-fast);
	}

	.articles-table tbody tr:hover {
		background-color: var(--neutral-50);
	}

	.article-info {
		display: flex;
		align-items: center;
		gap: var(--spacing-3);
	}

	.article-image {
		width: 64px;
		height: 48px;
		border-radius: var(--radius-lg);
		overflow: hidden;
		background-color: var(--neutral-200);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.article-image img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.article-image svg {
		width: 24px;
		height: 24px;
		color: var(--neutral-500);
	}

	.article-image-fallback {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: var(--neutral-100);
		border-radius: var(--radius-lg);
		z-index: 1;
	}

	.article-image-fallback svg {
		width: 48px;
		height: 48px;
		color: var(--neutral-500);
	}

	.article-details {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-1);
		min-width: 0;
	}

	.article-title {
		font-weight: var(--font-weight-semibold);
		color: var(--neutral-900);
		font-size: var(--font-size-base);
		line-height: 1.3;
	}

	.article-summary {
		font-size: var(--font-size-sm);
		color: var(--neutral-600);
		line-height: 1.4;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.category-badge {
		display: inline-block;
		padding: var(--spacing-1) var(--spacing-3);
		color: white;
		border-radius: var(--radius-full);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-medium);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.author-info {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-1);
	}

	.author-name {
		font-weight: var(--font-weight-medium);
		color: var(--neutral-800);
	}

	.status-info {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-1);
	}

	.status-badge {
		display: inline-block;
		padding: var(--spacing-1) var(--spacing-3);
		border-radius: var(--radius-full);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-medium);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.status-badge.published {
		background-color: var(--success-500);
		color: white;
	}

	.status-badge.draft {
		background-color: var(--neutral-500);
		color: white;
	}

	.views-info {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-1);
	}

	.views-count {
		font-weight: var(--font-weight-medium);
		color: var(--neutral-800);
		font-family: monospace;
	}

	.date-info {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-1);
	}

	.publish-date {
		font-weight: var(--font-weight-medium);
		color: var(--neutral-800);
		font-size: var(--font-size-sm);
	}

	.create-date {
		font-size: var(--font-size-xs);
		color: var(--neutral-500);
	}

	.stat-icon.published {
		background: linear-gradient(135deg, var(--success-100) 0%, var(--success-200) 100%);
	}

	.stat-icon.published svg {
		color: var(--success-600);
	}

	.stat-icon.draft {
		background: linear-gradient(135deg, var(--neutral-100) 0%, var(--neutral-200) 100%);
	}

	.stat-icon.draft svg {
		color: var(--neutral-600);
	}

	.stat-icon.views {
		background: linear-gradient(135deg, var(--primary-100) 0%, var(--primary-200) 100%);
	}

	.stat-icon.views svg {
		color: var(--primary-600);
	}

	/* Modal styles */
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: var(--spacing-4);
	}

	.modal-content {
		background: white;
		border-radius: var(--radius-xl);
		max-width: 700px;
		width: 100%;
		max-height: 90vh;
		overflow-y: auto;
		box-shadow: var(--shadow-xl);
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--spacing-6);
		border-bottom: 1px solid var(--neutral-200);
	}

	.modal-header h2 {
		margin: 0;
		color: var(--neutral-900);
	}

	.modal-close {
		background: none;
		border: none;
		cursor: pointer;
		padding: var(--spacing-2);
		border-radius: var(--radius-md);
		transition: background-color var(--transition-fast);
	}

	.modal-close:hover {
		background-color: var(--neutral-100);
	}

	.modal-close svg {
		width: 24px;
		height: 24px;
		color: var(--neutral-500);
	}

	.modal-body {
		padding: var(--spacing-6);
	}

	.detail-section {
		margin-bottom: var(--spacing-6);
	}

	.detail-section h3 {
		font-size: var(--font-size-lg);
		color: var(--neutral-800);
		margin-bottom: var(--spacing-4);
		padding-bottom: var(--spacing-2);
		border-bottom: 1px solid var(--neutral-200);
	}

	.detail-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--spacing-4);
	}

	.detail-item {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-1);
	}

	.detail-item.full-width {
		grid-column: 1 / -1;
	}

	.detail-item label {
		font-weight: var(--font-weight-medium);
		color: var(--neutral-600);
		font-size: var(--font-size-sm);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.detail-item span {
		color: var(--neutral-900);
		font-size: var(--font-size-base);
	}

	.featured-image {
		width: 100%;
		max-width: 400px;
		height: auto;
		border-radius: var(--radius-lg);
		border: 1px solid var(--neutral-200);
	}

	.tags-container {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-2);
	}

	.tag {
		display: inline-block;
		padding: var(--spacing-1) var(--spacing-3);
		background-color: var(--primary-100);
		color: var(--primary-700);
		border-radius: var(--radius-full);
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: var(--spacing-3);
		padding: var(--spacing-6);
		border-top: 1px solid var(--neutral-200);
	}

	.btn {
		padding: var(--spacing-3) var(--spacing-5);
		border: none;
		border-radius: var(--radius-lg);
		font-weight: var(--font-weight-medium);
		font-size: var(--font-size-base);
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.btn-primary {
		background: linear-gradient(135deg, var(--primary-600) 0%, var(--primary-700) 100%);
		color: white;
		box-shadow: var(--shadow-md);
	}

	.btn-primary:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-lg);
		background: linear-gradient(135deg, var(--primary-700) 0%, var(--primary-800) 100%);
	}

	.btn-secondary {
		background-color: var(--neutral-100);
		color: var(--neutral-700);
		border: 1px solid var(--neutral-300);
	}

	.btn-secondary:hover {
		background-color: var(--neutral-200);
		color: var(--neutral-800);
	}

	.filters-container {
		display: flex;
		gap: var(--spacing-3);
	}

	.filter-select {
		padding: var(--spacing-3) var(--spacing-4);
		border: 2px solid var(--color-border);
		border-radius: var(--radius-lg);
		font-size: var(--font-size-base);
		background-color: white;
		color: var(--neutral-700);
		cursor: pointer;
		transition: border-color 0.2s ease;
		appearance: none;
		background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e");
		background-repeat: no-repeat;
		background-position: right 0.75rem center;
		background-size: 1rem;
		padding-right: 2.5rem;
	}

	.filter-select:hover {
		border-color: var(--color-primary-light);
	}

	.filter-select:focus {
		outline: none;
		border-color: var(--primary-500);
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	@media (max-width: 768px) {
		.actions-bar {
			flex-direction: column;
			align-items: stretch;
			gap: var(--spacing-4);
		}

		.filters-container {
			flex-direction: column;
		}

		.detail-grid {
			grid-template-columns: 1fr;
		}

		.modal-content {
			margin: var(--spacing-2);
			max-height: 95vh;
		}

		.article-info {
			flex-direction: column;
			align-items: flex-start;
			gap: var(--spacing-2);
		}

		.article-image {
			width: 48px;
			height: 36px;
		}

		.article-title {
			font-size: var(--font-size-sm);
		}

		.article-summary {
			font-size: var(--font-size-xs);
		}

		/* Hide less important columns on mobile */
		.col-author,
		.col-views {
			display: none;
		}

		/* Ensure minimum table width for scrolling */
		.articles-table {
			min-width: 600px;
		}
	}

	@media (max-width: 480px) {
		/* Hide more columns on very small screens */
		.col-category,
		.col-date {
			display: none;
		}

		.articles-table {
			min-width: 400px;
		}
	}
</style>
