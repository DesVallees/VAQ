<script lang="ts">
	import { goto } from '$app/navigation';
	import type { Product, ProductType } from '../../../types';
	import { db, storage } from '$lib/firebase/vaqmas';
	import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
	import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

	let loading = false;
	let imageFile: File | null = null;
	let imagePreview: string | null = null;
	let errorMessage = '';
	let successMessage = '';

	// Form data
	let formData: Partial<Product> = {
		name: '',
		commonName: '',
		description: '',
		type: 'vaccine',
		price: null,
		priceAvacunar: null,
		priceVita: null,
		priceColsanitas: null,
		imageUrl: '',
		applicableDoctors: [],
		minAge: 0,
		maxAge: 18,
		specialIndications: null,
		manufacturer: null,
		dosageInfo: null,
		targetDiseases: null,
		dosesAndBoosters: null,
		includedProductIds: null,
		includedDoseBundles: null,
		targetMilestone: null,
	};

	// Available options
	const productTypes: ProductType[] = ['vaccine', 'bundle', 'package'];

	// Validation
	let errors: Record<string, string> = {};

	const validateForm = (): boolean => {
		errors = {};

		if (!formData.name?.trim()) {
			errors.name = 'El nombre del producto es requerido';
		}

		if (!formData.commonName?.trim()) {
			errors.commonName = 'El nombre común es requerido';
		}

		if (!formData.description?.trim()) {
			errors.description = 'La descripción es requerida';
		}

		if (formData.price !== null && formData.price !== undefined && formData.price < 0) {
			errors.price = 'El precio debe ser un número válido';
		}

		if (
			(formData.minAge !== undefined && formData.minAge < 0) ||
			(formData.maxAge !== undefined && formData.maxAge < (formData.minAge || 0))
		) {
			errors.ageRange = 'El rango de edad no es válido';
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
		formData.imageUrl = '';
	};

	const addApplicableDoctor = (event: KeyboardEvent) => {
		const target = event.target as HTMLInputElement;
		if (event.key === 'Enter' && target.value.trim()) {
			event.preventDefault();
			if (!formData.applicableDoctors?.includes(target.value.trim())) {
				formData.applicableDoctors = [
					...(formData.applicableDoctors || []),
					target.value.trim(),
				];
			}
			target.value = '';
		}
	};

	const removeApplicableDoctor = (doctorToRemove: string) => {
		formData.applicableDoctors =
			formData.applicableDoctors?.filter((doctor) => doctor !== doctorToRemove) || [];
	};

	const handleSubmit = async () => {
		if (!validateForm()) {
			return;
		}

		loading = true;
		errorMessage = '';
		successMessage = '';

		try {
			// Upload image if selected
			if (imageFile) {
				const imageRef = ref(storage, `products/${Date.now()}_${imageFile.name}`);
				const uploadResult = await uploadBytes(imageRef, imageFile);
				formData.imageUrl = await getDownloadURL(uploadResult.ref);
			}

			// Prepare data for Firestore
			const productData = {
				...formData,
				createdAt: serverTimestamp(),
				updatedAt: serverTimestamp(),
				price: formData.price !== undefined ? Number(formData.price) : null,
				minAge: Number(formData.minAge || 0),
				maxAge: Number(formData.maxAge || 18),
			};

			// Remove undefined values
			Object.keys(productData).forEach((key) => {
				if (productData[key as keyof typeof productData] === undefined) {
					delete productData[key as keyof typeof productData];
				}
			});

			await addDoc(collection(db, 'products'), productData);

			successMessage = 'Producto creado exitosamente';
			setTimeout(() => {
				goto('/products');
			}, 1500);
		} catch (error) {
			console.error('Error creating product:', error);
			errorMessage = 'Error al crear el producto. Por favor, inténtalo de nuevo.';
		} finally {
			loading = false;
		}
	};

	const handleCancel = () => {
		goto('/products');
	};
</script>

<svelte:head>
	<title>Crear Producto - VAQ+ Admin</title>
</svelte:head>

<div class="create-product-container">
	<div class="page-header">
		<h1>Crear Nuevo Producto</h1>
		<p>Agregar un nuevo producto médico al catálogo</p>
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

	<form on:submit|preventDefault={handleSubmit} class="product-form">
		<div class="form-sections">
			<!-- Basic Information -->
			<div class="form-section">
				<h3>Información Básica</h3>

				<div class="form-row">
					<div class="form-group">
						<label for="name">Nombre del Producto *</label>
						<input
							id="name"
							type="text"
							bind:value={formData.name}
							placeholder="Ej: Vacuna Triple Viral"
							class:error={errors.name}
						/>
						{#if errors.name}
							<span class="error-text">{errors.name}</span>
						{/if}
					</div>

					<div class="form-group">
						<label for="type">Tipo de Producto *</label>
						<select id="type" bind:value={formData.type}>
							{#each productTypes as type}
								<option value={type}
									>{type.charAt(0).toUpperCase() + type.slice(1)}</option
								>
							{/each}
						</select>
					</div>
				</div>

				<div class="form-group">
					<label for="commonName">Nombre Común *</label>
					<input
						id="commonName"
						type="text"
						bind:value={formData.commonName}
						placeholder="Ej: Triple Viral"
						class:error={errors.commonName}
					/>
					{#if errors.commonName}
						<span class="error-text">{errors.commonName}</span>
					{/if}
				</div>

				<div class="form-group">
					<label for="description">Descripción *</label>
					<textarea
						id="description"
						bind:value={formData.description}
						placeholder="Descripción detallada del producto"
						rows="3"
						class:error={errors.description}
					/>
					{#if errors.description}
						<span class="error-text">{errors.description}</span>
					{/if}
				</div>

				<div class="form-row">
					<div class="form-group">
						<label for="manufacturer">Fabricante</label>
						<input
							id="manufacturer"
							type="text"
							bind:value={formData.manufacturer}
							placeholder="Ej: Pfizer"
						/>
					</div>

					<div class="form-group">
						<label for="targetMilestone">Hito Objetivo</label>
						<input
							id="targetMilestone"
							type="text"
							bind:value={formData.targetMilestone}
							placeholder="Ej: 2 meses"
						/>
					</div>
				</div>
			</div>

			<!-- Pricing -->
			<div class="form-section">
				<h3>Precios</h3>

				<div class="form-row">
					<div class="form-group">
						<label for="price">Precio General</label>
						<input
							id="price"
							type="number"
							bind:value={formData.price}
							min="0"
							step="0.01"
							placeholder="0.00"
							class:error={errors.price}
						/>
						{#if errors.price}
							<span class="error-text">{errors.price}</span>
						{/if}
					</div>

					<div class="form-group">
						<label for="priceAvacunar">Precio Avacunar</label>
						<input
							id="priceAvacunar"
							type="number"
							bind:value={formData.priceAvacunar}
							min="0"
							step="0.01"
							placeholder="0.00"
						/>
					</div>
				</div>

				<div class="form-row">
					<div class="form-group">
						<label for="priceVita">Precio Vita</label>
						<input
							id="priceVita"
							type="number"
							bind:value={formData.priceVita}
							min="0"
							step="0.01"
							placeholder="0.00"
						/>
					</div>

					<div class="form-group">
						<label for="priceColsanitas">Precio Colsanitas</label>
						<input
							id="priceColsanitas"
							type="number"
							bind:value={formData.priceColsanitas}
							min="0"
							step="0.01"
							placeholder="0.00"
						/>
					</div>
				</div>
			</div>

			<!-- Age Range -->
			<div class="form-section">
				<h3>Rango de Edad</h3>

				<div class="form-row">
					<div class="form-group">
						<label for="minAge">Edad Mínima (meses)</label>
						<input
							id="minAge"
							type="number"
							bind:value={formData.minAge}
							min="0"
							class:error={errors.ageRange}
						/>
					</div>

					<div class="form-group">
						<label for="maxAge">Edad Máxima (meses)</label>
						<input
							id="maxAge"
							type="number"
							bind:value={formData.maxAge}
							min="0"
							class:error={errors.ageRange}
						/>
					</div>
				</div>
				{#if errors.ageRange}
					<span class="error-text">{errors.ageRange}</span>
				{/if}
			</div>

			<!-- Medical Information -->
			<div class="form-section">
				<h3>Información Médica</h3>

				<div class="form-group">
					<label for="dosageInfo">Información de Dosis</label>
					<textarea
						id="dosageInfo"
						bind:value={formData.dosageInfo}
						placeholder="Ej: 0.5ml por vía intramuscular"
						rows="2"
					/>
				</div>

				<div class="form-group">
					<label for="targetDiseases">Enfermedades Objetivo</label>
					<textarea
						id="targetDiseases"
						bind:value={formData.targetDiseases}
						placeholder="Ej: Sarampión, Paperas, Rubéola"
						rows="2"
					/>
				</div>

				<div class="form-group">
					<label for="dosesAndBoosters">Dosis y Refuerzos</label>
					<textarea
						id="dosesAndBoosters"
						bind:value={formData.dosesAndBoosters}
						placeholder="Ej: 2 dosis con refuerzo a los 4 años"
						rows="2"
					/>
				</div>

				<div class="form-group">
					<label for="specialIndications">Indicaciones Especiales</label>
					<textarea
						id="specialIndications"
						bind:value={formData.specialIndications}
						placeholder="Ej: Contraindicado en pacientes inmunocomprometidos"
						rows="2"
					/>
				</div>
			</div>

			<!-- Applicable Doctors -->
			<div class="form-section">
				<h3>Doctores Aplicables</h3>

				<div class="form-group">
					<label>Doctores que pueden aplicar este producto</label>
					<input
						type="text"
						placeholder="Presiona Enter para agregar doctor"
						on:keydown={addApplicableDoctor}
					/>
					<p class="help-text">
						Agrega los nombres de los doctores que pueden aplicar este producto
					</p>
					{#if formData.applicableDoctors && formData.applicableDoctors.length > 0}
						<div class="tags-container">
							{#each formData.applicableDoctors as doctor}
								<span class="tag">
									{doctor}
									<button
										type="button"
										on:click={() => removeApplicableDoctor(doctor)}
										class="remove-tag">×</button
									>
								</span>
							{/each}
						</div>
					{/if}
				</div>
			</div>

			<!-- Image Upload -->
			<div class="form-section">
				<h3>Imagen del Producto</h3>

				<div class="form-group">
					<label for="image">Imagen</label>
					<input id="image" type="file" accept="image/*" on:change={handleImageUpload} />
					<p class="help-text">Formatos soportados: JPG, PNG, WebP. Tamaño máximo: 5MB</p>
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
				{loading ? 'Creando...' : 'Crear Producto'}
			</button>
		</div>
	</form>
</div>

<style>
	.create-product-container {
		max-width: 1200px;
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

	.product-form {
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
		max-width: 200px;
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
		.create-product-container {
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
