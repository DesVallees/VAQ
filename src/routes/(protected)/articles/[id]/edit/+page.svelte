<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import type { Article, ArticleCategory } from '../../../../types';
	import { db, storage } from '$lib/firebase/vaqmas';
	import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
	import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
	import { onMount } from 'svelte';
	import { getImageUrl } from '../../../../lib/utils/imageUtils';

	let loading = true;
	let saving = false;
	let article: Article | null = null;
	let imageFile: File | null = null;
	let imagePreview: string | null = null;
	let errorMessage = '';
	let successMessage = '';

	// Form data
	let formData: Partial<Article> = {};

	// Available options
	const articleCategories: ArticleCategory[] = ['education', 'promotion', 'announcement'];

	// Spanish translations for article categories
	const articleCategoryLabels = {
		education: 'Educación',
		promotion: 'Promoción',
		announcement: 'Anuncio',
	};

	// Validation
	let errors: Record<string, string> = {};

	onMount(async () => {
		await loadArticle();
	});

	const loadArticle = async () => {
		const articleId = $page.params.id;
		if (!articleId) {
			errorMessage = 'ID de artículo no válido';
			loading = false;
			return;
		}

		try {
			const articleDoc = await getDoc(doc(db, 'articles', articleId));
			if (articleDoc.exists()) {
				const data = articleDoc.data();
				article = {
					id: articleDoc.id,
					title: data.title || '',
					excerpt: data.excerpt || '',
					body: data.body || '',
					heroImageUrl: data.heroImageUrl || '',
					publishedAt: data.publishedAt?.toDate() || null,
					category: data.category || 'education',
					tags: data.tags || [],
					author: data.author || '',
					createdAt: data.createdAt?.toDate() || new Date(),
					updatedAt: data.updatedAt?.toDate() || new Date(),
				} as Article;

				// Initialize form data
				formData = { ...article };
				// Resolve the image URL for preview
				if (article.heroImageUrl) {
					imagePreview = await getImageUrl(article.heroImageUrl, 'articles');
				} else {
					imagePreview = null;
				}
			} else {
				errorMessage = 'Artículo no encontrado';
			}
		} catch (error) {
			console.error('Error loading article:', error);
			errorMessage = 'Error al cargar el artículo';
		} finally {
			loading = false;
		}
	};

	const validateForm = (): boolean => {
		errors = {};

		if (!formData.title?.trim()) {
			errors.title = 'El título del artículo es requerido';
		}

		if (!formData.excerpt?.trim()) {
			errors.excerpt = 'El extracto es requerido';
		}

		if (!formData.body?.trim()) {
			errors.body = 'El contenido del artículo es requerido';
		}

		if (!formData.author?.trim()) {
			errors.author = 'El autor es requerido';
		}

		return Object.keys(errors).length === 0;
	};

	const handleImageUpload = (event: Event) => {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files[0]) {
			imageFile = target.files[0];

			// Create preview
			const reader = new FileReader();
			reader.onload = (e) => {
				imagePreview = e.target?.result as string;
			};
			reader.readAsDataURL(imageFile);
		}
	};

	const removeImage = () => {
		imageFile = null;
		imagePreview = null;
		formData.heroImageUrl = '';
	};

	const addTag = (event: KeyboardEvent) => {
		const target = event.target as HTMLInputElement;
		if (event.key === 'Enter' && target.value.trim()) {
			event.preventDefault();
			if (!formData.tags?.includes(target.value.trim())) {
				formData.tags = [...(formData.tags || []), target.value.trim()];
			}
			target.value = '';
		}
	};

	const removeTag = (tagToRemove: string) => {
		formData.tags = formData.tags?.filter((tag) => tag !== tagToRemove) || [];
	};

	const handlePublishedAtChange = (e: Event) => {
		const target = e.target as HTMLInputElement;
		if (target.value) {
			formData.publishedAt = new Date(target.value);
		} else {
			formData.publishedAt = undefined;
		}
	};

	const handleSubmit = async () => {
		if (!validateForm() || !article) {
			return;
		}

		saving = true;
		errorMessage = '';
		successMessage = '';

		try {
			// Upload new image if selected
			if (imageFile) {
				// Delete old image if it exists
				if (article.heroImageUrl && !article.heroImageUrl.startsWith('data:')) {
					try {
						const oldImageRef = ref(storage, `articles/${article.heroImageUrl}`);
						await deleteObject(oldImageRef);
					} catch (error) {
						console.warn('Could not delete old image:', error);
					}
				}

				// Upload new image - store only the filename
				const imageRef = ref(storage, `articles/${Date.now()}_${imageFile.name}`);
				await uploadBytes(imageRef, imageFile);
				formData.heroImageUrl = `${Date.now()}_${imageFile.name}`;
			}

			// Prepare data for Firestore
			const updateData = {
				...formData,
				updatedAt: serverTimestamp(),
				publishedAt: formData.publishedAt ? new Date(formData.publishedAt) : null,
			};

			// Remove undefined values and id
			delete updateData.id;
			Object.keys(updateData).forEach((key) => {
				if (updateData[key as keyof typeof updateData] === undefined) {
					delete updateData[key as keyof typeof updateData];
				}
			});

			await updateDoc(doc(db, 'articles', article.id), updateData);

			successMessage = 'Artículo actualizado exitosamente';
			setTimeout(() => {
				goto('/articles');
			}, 1500);
		} catch (error) {
			console.error('Error updating article:', error);
			errorMessage = 'Error al actualizar el artículo. Por favor, inténtalo de nuevo.';
		} finally {
			saving = false;
		}
	};

	const handleCancel = () => {
		goto('/articles');
	};

	const handleDelete = async () => {
		if (
			!article ||
			!confirm(
				'¿Estás seguro de que quieres eliminar este artículo? Esta acción no se puede deshacer.',
			)
		) {
			return;
		}

		try {
			// Delete image from storage if it exists
			if (article.heroImageUrl && !article.heroImageUrl.startsWith('data:')) {
				try {
					const imageRef = ref(storage, article.heroImageUrl);
					await deleteObject(imageRef);
				} catch (error) {
					console.warn('Could not delete image:', error);
				}
			}

			// Delete document
			await updateDoc(doc(db, 'articles', article.id), {
				deletedAt: serverTimestamp(),
			});

			successMessage = 'Artículo eliminado exitosamente';
			setTimeout(() => {
				goto('/articles');
			}, 1500);
		} catch (error) {
			console.error('Error deleting article:', error);
			errorMessage = 'Error al eliminar el artículo';
		}
	};
</script>

<svelte:head>
	<title>Editar Artículo - VAQ+ Admin</title>
</svelte:head>

<div class="edit-article-container">
	<div class="page-header">
		<h1>Editar Artículo</h1>
		<p>Modificar artículo existente</p>
	</div>

	{#if errorMessage}
		<div class="error-message">
			{errorMessage}
		</div>
	{/if}

	{#if successMessage}
		<div class="success-message">
			{successMessage}
		</div>
	{/if}

	{#if loading}
		<div class="loading-state">
			<div class="spinner" />
			<p>Cargando artículo...</p>
		</div>
	{:else if article}
		<form on:submit|preventDefault={handleSubmit} class="article-form">
			<div class="form-sections">
				<!-- Basic Information -->
				<div class="form-section">
					<h3>Información Básica</h3>

					<div class="form-row">
						<div class="form-group">
							<label for="title">Título del Artículo *</label>
							<input
								id="title"
								type="text"
								bind:value={formData.title}
								placeholder="Título del artículo"
								class:error={errors.title}
							/>
							{#if errors.title}
								<span class="error-text">{errors.title}</span>
							{/if}
						</div>

						<div class="form-group">
							<label for="author">Autor *</label>
							<input
								id="author"
								type="text"
								bind:value={formData.author}
								placeholder="Nombre del autor"
								class:error={errors.author}
							/>
							{#if errors.author}
								<span class="error-text">{errors.author}</span>
							{/if}
						</div>
					</div>

					<div class="form-row">
						<div class="form-group">
							<label for="category">Categoría *</label>
							<select id="category" bind:value={formData.category}>
								{#each articleCategories as category}
									<option value={category}
										>{articleCategoryLabels[category]}</option
									>
								{/each}
							</select>
						</div>

						<div class="form-group">
							<label for="publishedAt">Fecha de Publicación</label>
							<input
								id="publishedAt"
								type="datetime-local"
								value={formData.publishedAt
									? new Date(formData.publishedAt).toISOString().slice(0, 16)
									: ''}
								on:change={handlePublishedAtChange}
							/>
						</div>
					</div>

					<div class="form-group">
						<label for="excerpt">Extracto *</label>
						<textarea
							id="excerpt"
							bind:value={formData.excerpt}
							placeholder="Breve descripción del artículo"
							rows="3"
							class:error={errors.excerpt}
						/>
						{#if errors.excerpt}
							<span class="error-text">{errors.excerpt}</span>
						{/if}
					</div>
				</div>

				<!-- Article Content -->
				<div class="form-section">
					<h3>Contenido del Artículo</h3>

					<div class="form-group">
						<label for="body">Contenido *</label>
						<textarea
							id="body"
							bind:value={formData.body}
							placeholder="Contenido completo del artículo"
							rows="15"
							class:error={errors.body}
						/>
						{#if errors.body}
							<span class="error-text">{errors.body}</span>
						{/if}
						<p class="help-text">
							Puedes usar HTML básico para formatear el texto (ej: &lt;strong&gt;,
							&lt;em&gt;, &lt;br&gt;)
						</p>
					</div>
				</div>

				<!-- Tags -->
				<div class="form-section">
					<h3>Etiquetas</h3>

					<div class="form-group">
						<label>Etiquetas</label>
						<input
							type="text"
							placeholder="Presiona Enter para agregar una etiqueta"
							on:keydown={addTag}
						/>
						<p class="help-text">
							Agrega etiquetas para facilitar la búsqueda del artículo
						</p>

						{#if formData.tags && formData.tags.length > 0}
							<div class="tags-container">
								{#each formData.tags as tag}
									<span class="tag">
										{tag}
										<button
											type="button"
											on:click={() => removeTag(tag)}
											class="remove-tag">×</button
										>
									</span>
								{/each}
							</div>
						{/if}
					</div>
				</div>

				<!-- Hero Image -->
				<div class="form-section">
					<h3>Imagen Principal</h3>

					<div class="form-group">
						<label for="heroImage">Imagen Principal</label>
						<input
							id="heroImage"
							type="file"
							accept="image/*"
							on:change={handleImageUpload}
						/>
						<p class="help-text">
							Formatos soportados: JPG, PNG, WebP. Tamaño máximo: 5MB. Recomendado:
							1200x630px
						</p>
					</div>

					{#if imagePreview}
						<div class="image-preview">
							<img src={imagePreview} alt="Vista previa" />
							<button type="button" on:click={removeImage} class="remove-image"
								>Eliminar Imagen</button
							>
						</div>
					{/if}
				</div>
			</div>

			<div class="form-actions">
				<button
					type="button"
					on:click={handleCancel}
					class="btn btn-secondary"
					disabled={saving}
				>
					Cancelar
				</button>
				<button
					type="button"
					on:click={handleDelete}
					class="btn btn-danger"
					disabled={saving}
				>
					Eliminar
				</button>
				<button type="submit" class="btn btn-primary" disabled={saving}>
					{saving ? 'Guardando...' : 'Guardar Cambios'}
				</button>
			</div>
		</form>
	{/if}
</div>

<style>
	.edit-article-container {
		max-width: 1000px;
		margin: 0 auto;
		padding: 2rem;
	}

	.page-header {
		margin-bottom: 2rem;
		text-align: center;
	}

	.page-header h1 {
		font-size: 2.5rem;
		font-weight: 700;
		color: var(--color-primary);
		margin-bottom: 0.5rem;
	}

	.page-header p {
		font-size: 1.1rem;
		color: var(--color-text-secondary);
	}

	.error-message {
		background-color: var(--color-error-light);
		color: var(--color-error);
		padding: 1rem;
		border-radius: var(--border-radius);
		margin-bottom: 1.5rem;
		border: 1px solid var(--color-error);
	}

	.success-message {
		background-color: var(--color-success-light);
		color: var(--color-success);
		padding: 1rem;
		border-radius: var(--border-radius);
		margin-bottom: 1.5rem;
		border: 1px solid var(--color-success);
	}

	.loading-state {
		text-align: center;
		padding: 3rem;
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 4px solid var(--color-border);
		border-top: 4px solid var(--color-primary);
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin: 0 auto 1rem;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	.article-form {
		background: white;
		border-radius: var(--border-radius);
		box-shadow: var(--shadow-card);
		overflow: hidden;
	}

	.form-sections {
		padding: 2rem;
	}

	.form-section {
		margin-bottom: 2.5rem;
		padding-bottom: 2rem;
		border-bottom: 1px solid var(--color-border);
	}

	.form-section:last-child {
		border-bottom: none;
		margin-bottom: 0;
		padding-bottom: 0;
	}

	.form-section h3 {
		font-size: 1.3rem;
		font-weight: 600;
		color: var(--color-primary);
		margin-bottom: 1.5rem;
		padding-bottom: 0.5rem;
		border-bottom: 2px solid var(--color-primary-light);
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
		margin-bottom: 1.5rem;
	}

	.form-group {
		margin-bottom: 1.5rem;
	}

	.form-group label {
		display: block;
		font-weight: 600;
		color: var(--color-text-primary);
		margin-bottom: 0.5rem;
	}

	.form-group input,
	.form-group select,
	.form-group textarea {
		width: 100%;
		padding: 0.75rem;
		border: 2px solid var(--color-border);
		border-radius: var(--border-radius);
		font-size: 1rem;
		transition: border-color 0.2s ease;
	}

	.form-group select {
		background-color: white;
		cursor: pointer;
		appearance: none;
		background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e");
		background-repeat: no-repeat;
		background-position: right 0.75rem center;
		background-size: 1rem;
		padding-right: 2.5rem;
	}

	.form-group select:hover {
		border-color: var(--color-primary-light);
	}

	.form-group input:focus,
	.form-group select:focus,
	.form-group textarea:focus {
		outline: none;
		border-color: var(--color-primary);
	}

	.form-group input.error,
	.form-group select.error,
	.form-group textarea.error {
		border-color: var(--color-error);
	}

	.error-text {
		color: var(--color-error);
		font-size: 0.875rem;
		margin-top: 0.25rem;
		display: block;
	}

	.help-text {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		margin-top: 0.25rem;
	}

	.tags-container {
		margin-top: 1rem;
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.tag {
		background-color: var(--color-primary-light);
		color: var(--color-primary);
		padding: 0.25rem 0.75rem;
		border-radius: 20px;
		font-size: 0.875rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.remove-tag {
		background: none;
		border: none;
		color: var(--color-primary);
		cursor: pointer;
		font-size: 1.2rem;
		padding: 0;
		line-height: 1;
	}

	.remove-tag:hover {
		color: var(--color-error);
	}

	.image-preview {
		margin-top: 1rem;
		text-align: center;
		display: grid;
		justify-items: center;
	}

	.image-preview img {
		max-width: 100%;
		max-height: 300px;
		border-radius: var(--border-radius);
		margin-bottom: 1rem;
	}

	.remove-image {
		background-color: var(--color-error);
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: var(--border-radius);
		cursor: pointer;
		font-size: 0.875rem;
	}

	.remove-image:hover {
		background-color: var(--color-error-dark);
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: 1rem;
		padding: 2rem;
		background-color: var(--color-background-light);
		border-top: 1px solid var(--color-border);
	}

	.btn {
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: var(--border-radius);
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
		min-width: 120px;
	}

	.btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-primary {
		background-color: var(--color-primary);
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background-color: var(--color-primary-dark);
	}

	.btn-secondary {
		background-color: var(--color-secondary);
		color: white;
	}

	.btn-secondary:hover:not(:disabled) {
		background-color: var(--color-secondary-dark);
	}

	.btn-danger {
		background-color: var(--color-error);
		color: white;
	}

	.btn-danger:hover:not(:disabled) {
		background-color: var(--color-error-dark);
	}

	@media (max-width: 768px) {
		.edit-article-container {
			padding: 1rem;
		}

		.form-sections {
			padding: 1.5rem;
		}

		.form-row {
			grid-template-columns: 1fr;
			gap: 1rem;
		}

		.form-actions {
			flex-direction: column;
			padding: 1.5rem;
		}

		.btn {
			width: 100%;
		}
	}
</style>
