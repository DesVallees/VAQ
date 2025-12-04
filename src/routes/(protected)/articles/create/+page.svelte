<script lang="ts">
	import { goto } from '$app/navigation';
	import type { Article, ArticleCategory } from '../../../types';
	import { db, storage } from '$lib/firebase/vaqmas';
	import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
	import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
	import { toastStore } from '../../../stores/toast';

	let loading = false;
	let imageFile: File | null = null;
	let imagePreview: string | null = null;
	let errorMessage = '';
	let successMessage = '';

	// Form data
	let formData: Partial<Article> = {
		title: '',
		excerpt: '',
		body: '',
		heroImageUrl: '',
		publishedAt: undefined,
		category: 'education',
		tags: [],
		author: '',
	};

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

	const handleSubmit = async () => {
		if (!validateForm()) {
			const errorCount = Object.keys(errors).length;
			const errorMessage = errorCount === 1 
				? 'Por favor, corrige el campo requerido antes de continuar'
				: `Por favor, corrige los ${errorCount} campos requeridos antes de continuar`;
			toastStore.error(errorMessage);
			// Scroll to first error
			const firstErrorField = Object.keys(errors)[0];
			const errorElement = document.getElementById(firstErrorField);
			if (errorElement) {
				errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
				errorElement.focus();
			}
			return;
		}

		loading = true;
		errorMessage = '';
		successMessage = '';

		try {
			// Upload image if selected
			if (imageFile) {
				const imageName = `${Date.now()}_${imageFile.name}`;
				const imageRef = ref(storage, `articles/${imageName}`);
				await uploadBytes(imageRef, imageFile);
				formData.heroImageUrl = `${imageName}`;
			}

			// Prepare data for Firestore
			const articleData = {
				...formData,
				createdAt: serverTimestamp(),
				updatedAt: serverTimestamp(),
				publishedAt: formData.publishedAt ? new Date(formData.publishedAt) : null,
			};

			// Remove undefined values
			Object.keys(articleData).forEach((key) => {
				if (articleData[key as keyof typeof articleData] === undefined) {
					delete articleData[key as keyof typeof articleData];
				}
			});

			await addDoc(collection(db, 'articles'), articleData);

			successMessage = 'Artículo creado exitosamente';
			setTimeout(() => {
				goto('/articles');
			}, 1500);
		} catch (error) {
			console.error('Error creating article:', error);
			errorMessage = 'Error al crear el artículo. Por favor, inténtalo de nuevo.';
		} finally {
			loading = false;
		}
	};

	const handleCancel = () => {
		goto('/articles');
	};
</script>

<svelte:head>
	<title>Crear Artículo - VAQ+ Admin</title>
</svelte:head>

<div class="create-article-container">
	<div class="page-header">
		<h1>Crear Nuevo Artículo</h1>
		<p>Agregar un nuevo artículo educativo o informativo</p>
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

	<form on:submit|preventDefault={handleSubmit} class="article-form">
		<div class="form-sections">
			<!-- Basic Information -->
			<div class="form-section">
				<h3>Información Básica</h3>

				<div class="form-group">
					<label for="title">Título del Artículo *</label>
					<input
						id="title"
						type="text"
						bind:value={formData.title}
						placeholder="Ej: Guía Completa de Vacunación Infantil"
						class:error={errors.title}
					/>
					{#if errors.title}
						<span class="error-text">{errors.title}</span>
					{/if}
				</div>

				<div class="form-row">
					<div class="form-group">
						<label for="category">Categoría *</label>
						<select id="category" bind:value={formData.category}>
							{#each articleCategories as category}
								<option value={category}>{articleCategoryLabels[category]}</option>
							{/each}
						</select>
					</div>

					<div class="form-group">
						<label for="author">Autor *</label>
						<input
							id="author"
							type="text"
							bind:value={formData.author}
							placeholder="Ej: Dr. María González"
							class:error={errors.author}
						/>
						{#if errors.author}
							<span class="error-text">{errors.author}</span>
						{/if}
					</div>
				</div>

				<div class="form-group">
					<label for="excerpt">Extracto *</label>
					<textarea
						id="excerpt"
						bind:value={formData.excerpt}
						placeholder="Breve descripción del artículo que aparecerá en la vista previa"
						rows="3"
						class:error={errors.excerpt}
					/>
					{#if errors.excerpt}
						<span class="error-text">{errors.excerpt}</span>
					{/if}
				</div>

				<div class="form-group">
					<label for="publishedAt">Fecha de Publicación</label>
					<input
						id="publishedAt"
						type="datetime-local"
						bind:value={formData.publishedAt}
					/>
					<p class="help-text">Deja vacío para publicar inmediatamente</p>
				</div>
			</div>

			<!-- Content -->
			<div class="form-section">
				<h3>Contenido del Artículo</h3>

				<div class="form-group">
					<label for="body">Contenido *</label>
					<textarea
						id="body"
						bind:value={formData.body}
						placeholder="Escribe el contenido completo del artículo aquí..."
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
						placeholder="Presiona Enter para agregar etiquetas"
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
				disabled={loading}
			>
				Cancelar
			</button>
			<button type="submit" class="btn btn-primary" disabled={loading}>
				{loading ? 'Creando...' : 'Crear Artículo'}
			</button>
		</div>
	</form>
</div>

<style>
	.create-article-container {
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
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 0.5rem;
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
	}

	.image-preview img {
		max-width: 300px;
		max-height: 200px;
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

	@media (max-width: 768px) {
		.create-article-container {
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
