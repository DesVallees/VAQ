<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import type { Product, ProductType } from '../../../../types';
	import { db, storage } from '$lib/firebase/vaqmas';
	import {
		doc,
		getDoc,
		updateDoc,
		deleteDoc,
		serverTimestamp,
		getDocs,
		collection,
		query,
		where,
	} from 'firebase/firestore';
	import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
	import { onMount } from 'svelte';
	import { getImageUrl } from '../../../../lib/utils/imageUtils';
	import AutocompleteInput from '../../../../components/AutocompleteInput.svelte';
	import { toastStore } from '../../../../stores/toast';

	let loading = true;
	let saving = false;
	let product: Product | null = null;
	let imageFile: File | null = null;
	let imagePreview: string | null = null;
	let errorMessage = '';
	let successMessage = '';

	// Available options for autocomplete
	let availableDoctors: Array<{ id: string; label: string; description?: string }> = [];
	let availableProducts: Array<{ id: string; label: string; description?: string }> = [];
	let availableBundles: Array<{ id: string; label: string; description?: string }> = [];

	// Form data - using a single object with all possible fields
	let formData = {
		name: '',
		commonName: '',
		description: '',
		type: 'vaccine' as ProductType,
		price: null as number | null,
		imageUrl: '',
		applicableDoctors: [] as string[],
		minAge: 0,
		maxAge: 18,
		ageUnit: 'months' as 'months' | 'years',
		specialIndications: null as string | null,
		// Vaccine-specific fields
		manufacturer: '',
		dosageInfo: '',
		targetDiseases: '',
		dosesAndBoosters: '',
		contraindications: null as string | null,
		precautions: null as string | null,
		// Bundle-specific fields
		includedProductIds: [] as string[],
		targetMilestone: null as string | null,
		// Package-specific fields
		includedDoseBundles: [] as string[],
	};

	// Available options
	const productTypes: ProductType[] = ['vaccine', 'bundle', 'package'];

	// Spanish translations for product types
	const productTypeLabels = {
		vaccine: 'Vacuna',
		bundle: 'Paquete',
		package: 'Programa',
	};

	// Validation
	let errors: Record<string, string> = {};

	// Helper function to resolve storage folder based on product type
	const resolveFolder = (type: ProductType): string => {
		const t = type.toLowerCase().trim();
		if (t === 'vaccine' || t === 'vaccines') return 'products';
		if (t === 'bundle' || t === 'bundles') return 'bundles';
		if (t === 'package' || t === 'packages') return 'packages';
		return t || 'general';
	};

	onMount(async () => {
		await Promise.all([loadProduct(), loadDoctors(), loadProducts(), loadBundles()]);
	});

	// Load available doctors from users collection
	const loadDoctors = async () => {
		try {
			const usersSnapshot = await getDocs(collection(db, 'users'));
			availableDoctors = usersSnapshot.docs
				.filter((doc) => doc.data().role === 'doctor')
				.map((doc) => ({
					id: doc.id,
					label: doc.data().name || 'Sin nombre',
					description: doc.data().specialty || 'Sin especialidad',
				}));
		} catch (error) {
			console.error('Error loading doctors:', error);
		}
	};

	// Load available products from products collection (only vaccines for bundles)
	const loadProducts = async () => {
		try {
			const productsSnapshot = await getDocs(collection(db, 'products'));
			availableProducts = productsSnapshot.docs
				.filter((doc) => doc.data().type === 'vaccine') // Only include vaccines
				.map((doc) => ({
					id: doc.id,
					label: doc.data().name || 'Sin nombre',
					description: doc.data().commonName || 'Sin nombre común',
				}));
		} catch (error) {
			console.error('Error loading products:', error);
		}
	};

	// Load available bundles from products collection
	const loadBundles = async () => {
		try {
			const bundlesSnapshot = await getDocs(
				query(collection(db, 'products'), where('type', '==', 'bundle')),
			);
			availableBundles = bundlesSnapshot.docs.map((doc) => ({
				id: doc.id,
				label: doc.data().name || 'Sin nombre',
				description: doc.data().commonName || 'Sin nombre común',
			}));
		} catch (error) {
			console.error('Error loading bundles:', error);
		}
	};

	// Handle doctor selection
	const handleDoctorSelect = (event: CustomEvent) => {
		const { option } = event.detail;
		if (!formData.applicableDoctors?.includes(option.id)) {
			formData.applicableDoctors = [...formData.applicableDoctors, option.id];
		}
	};

	// Handle product selection
	const handleProductSelect = (event: CustomEvent) => {
		const { option } = event.detail;
		if (!formData.includedProductIds.includes(option.id)) {
			formData.includedProductIds = [...formData.includedProductIds, option.id];
		}
	};

	// Handle bundle selection
	const handleBundleSelect = (event: CustomEvent) => {
		const { option } = event.detail;
		if (!formData.includedDoseBundles.includes(option.id)) {
			formData.includedDoseBundles = [...formData.includedDoseBundles, option.id];
		}
	};

	const loadProduct = async () => {
		const productId = $page.params.id;
		if (!productId) {
			errorMessage = 'ID de producto no válido';
			loading = false;
			return;
		}

		try {
			const productDoc = await getDoc(doc(db, 'products', productId));
			if (productDoc.exists()) {
				const data = productDoc.data();
				product = {
					id: productDoc.id,
					type: data.type || 'vaccine',
					name: data.name || '',
					commonName: data.commonName || '',
					description: data.description || '',
					price: data.price || null,
					imageUrl: data.imageUrl || '',
					applicableDoctors: data.applicableDoctors || [],
					minAge: data.minAge || 0,
					maxAge: data.maxAge || 18,
					ageUnit: data.ageUnit || 'months', // Default to 'months' for backwards compatibility
					specialIndications: data.specialIndications || null,
					manufacturer: data.manufacturer || '',
					dosageInfo: data.dosageInfo || '',
					targetDiseases: data.targetDiseases || '',
					dosesAndBoosters: data.dosesAndBoosters || '',
					contraindications: data.contraindications || null,
					precautions: data.precautions || null,
					includedProductIds: data.includedProductIds || [],
					includedDoseBundles: data.includedDoseBundles || [],
					targetMilestone: data.targetMilestone || null,
					createdAt: data.createdAt?.toDate() || new Date(),
					updatedAt: data.updatedAt?.toDate() || new Date(),
				} as Product;

				// Initialize form data
				formData = {
					name: product.name,
					commonName: product.commonName,
					description: product.description,
					type: product.type,
					price: product.price,
					imageUrl: product.imageUrl,
					applicableDoctors: product.applicableDoctors,
					minAge: product.minAge,
					maxAge: product.maxAge,
					ageUnit: (product as any).ageUnit || 'months', // Default to 'months' for backwards compatibility
					specialIndications: product.specialIndications,
					manufacturer: (product as any).manufacturer || '',
					dosageInfo: (product as any).dosageInfo || '',
					targetDiseases: (product as any).targetDiseases || '',
					dosesAndBoosters: (product as any).dosesAndBoosters || '',
					contraindications: (product as any).contraindications || null,
					precautions: (product as any).precautions || null,
					includedProductIds: (product as any).includedProductIds || [],
					includedDoseBundles: (product as any).includedDoseBundles || [],
					targetMilestone: (product as any).targetMilestone || null,
				};

				// Resolve the image URL for preview
				if (product.imageUrl) {
					imagePreview = await getImageUrl(product.imageUrl, product.type);
				} else {
					imagePreview = null;
				}
			} else {
				errorMessage = 'Producto no encontrado';
			}
		} catch (error) {
			console.error('Error loading product:', error);
			errorMessage = 'Error al cargar el producto';
		} finally {
			loading = false;
		}
	};

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

		// Type-specific validation
		if (formData.type === 'vaccine') {
			if (!formData.manufacturer?.trim()) {
				errors.manufacturer = 'El fabricante es requerido para vacunas';
			}
			if (!formData.dosageInfo?.trim()) {
				errors.dosageInfo = 'La información de dosis es requerida para vacunas';
			}
			if (!formData.targetDiseases?.trim()) {
				errors.targetDiseases = 'Las enfermedades objetivo son requeridas para vacunas';
			}
			if (!formData.dosesAndBoosters?.trim()) {
				errors.dosesAndBoosters =
					'La información de dosis y refuerzos es requerida para vacunas';
			}
		}

		if (formData.type === 'bundle') {
			if (!formData.includedProductIds || formData.includedProductIds.length === 0) {
				errors.includedProductIds = 'Debe incluir al menos un producto para el paquete';
			}
		}

		if (formData.type === 'package') {
			if (!formData.includedDoseBundles || formData.includedDoseBundles.length === 0) {
				errors.includedDoseBundles =
					'Debe incluir al menos un paquete de dosis para el programa';
			}
		}

		// Price validation only applies to non-package products
		if (formData.type !== 'package' && formData.price !== null && formData.price !== undefined && formData.price < 0) {
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
				formData.applicableDoctors = [...formData.applicableDoctors, target.value.trim()];
			}
			target.value = '';
		}
	};

	const removeApplicableDoctor = (doctorToRemove: string) => {
		formData.applicableDoctors = formData.applicableDoctors.filter(
			(doctor) => doctor !== doctorToRemove,
		);
	};

	const addIncludedProduct = (event: KeyboardEvent) => {
		const target = event.target as HTMLInputElement;
		if (event.key === 'Enter' && target.value.trim()) {
			event.preventDefault();
			if (!formData.includedProductIds.includes(target.value.trim())) {
				formData.includedProductIds = [...formData.includedProductIds, target.value.trim()];
			}
			target.value = '';
		}
	};

	const removeIncludedProduct = (productToRemove: string) => {
		formData.includedProductIds = formData.includedProductIds.filter(
			(product) => product !== productToRemove,
		);
	};

	const addIncludedDoseBundle = (event: KeyboardEvent) => {
		const target = event.target as HTMLInputElement;
		if (event.key === 'Enter' && target.value.trim()) {
			event.preventDefault();
			if (!formData.includedDoseBundles.includes(target.value.trim())) {
				formData.includedDoseBundles = [
					...formData.includedDoseBundles,
					target.value.trim(),
				];
			}
			target.value = '';
		}
	};

	const removeIncludedDoseBundle = (bundleToRemove: string) => {
		formData.includedDoseBundles = formData.includedDoseBundles.filter(
			(bundle) => bundle !== bundleToRemove,
		);
	};

	const handleSubmit = async () => {
		if (!product) {
			return;
		}
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

		saving = true;
		errorMessage = '';
		successMessage = '';

		try {
			// Upload new image if selected
			if (imageFile) {
				// Delete old image if it exists
				if (product.imageUrl && !product.imageUrl.startsWith('data:')) {
					try {
						const oldFolder = resolveFolder(product.type);
						const oldImageRef = ref(storage, `${oldFolder}/${product.imageUrl}`);
						await deleteObject(oldImageRef);
					} catch (error) {
						console.warn('Could not delete old image:', error);
					}
				}

				// Upload new image - store only the filename
				const folder = resolveFolder(formData.type);
				const imageName = `${Date.now()}_${imageFile.name}`;
				const imageRef = ref(storage, `${folder}/${imageName}`);
				await uploadBytes(imageRef, imageFile);
				formData.imageUrl = `${imageName}`;
			}

			// Prepare data for Firestore
			const updateData = {
				...formData,
				updatedAt: serverTimestamp(),
				// Programs don't have prices
				price: formData.type === 'package' ? null : (formData.price !== undefined ? Number(formData.price) : null),
				minAge: Number(formData.minAge || 0),
				maxAge: Number(formData.maxAge || 18),
				ageUnit: formData.ageUnit || 'months', // Ensure ageUnit is always set
			};

			// Remove undefined values
			Object.keys(updateData).forEach((key) => {
				if (updateData[key as keyof typeof updateData] === undefined) {
					delete updateData[key as keyof typeof updateData];
				}
			});

			await updateDoc(doc(db, 'products', product.id), updateData);

			successMessage = 'Producto actualizado exitosamente';
			setTimeout(() => {
				goto('/products');
			}, 1500);
		} catch (error) {
			console.error('Error updating product:', error);
			errorMessage = 'Error al actualizar el producto. Por favor, inténtalo de nuevo.';
		} finally {
			saving = false;
		}
	};

	const handleCancel = () => {
		goto('/products');
	};

	const handleDelete = async () => {
		if (
			!product ||
			!confirm(
				'¿Estás seguro de que quieres eliminar este producto? Esta acción no se puede deshacer.',
			)
		) {
			return;
		}

		try {
			// Delete image from storage if it exists
			if (product.imageUrl && !product.imageUrl.startsWith('data:')) {
				try {
					const folder = resolveFolder(product.type);
					const imageRef = ref(storage, `${folder}/${product.imageUrl}`);
					await deleteObject(imageRef);
				} catch (error) {
					console.warn('Could not delete image:', error);
				}
			}

			// Delete document
			await deleteDoc(doc(db, 'products', product.id));

			successMessage = 'Producto eliminado exitosamente';
			setTimeout(() => {
				goto('/products');
			}, 1500);
		} catch (error) {
			console.error('Error deleting product:', error);
			errorMessage = 'Error al eliminar el producto';
		}
	};
</script>

<svelte:head>
	<title>Editar Producto - VAQ+ Admin</title>
</svelte:head>

<div class="edit-product-container">
	<div class="page-header">
		<h1>Editar Producto</h1>
		<p>Modificar información del producto médico</p>
	</div>

	{#if loading}
		<div class="loading-state">
			<div class="spinner" />
			<p>Cargando producto...</p>
		</div>
	{:else if !product}
		<div class="error-message">
			{errorMessage || 'Producto no encontrado'}
		</div>
	{:else}
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
									<option value={type}>{productTypeLabels[type]}</option>
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
				</div>

				<!-- Pricing -->
				{#if formData.type !== 'package'}
					<div class="form-section">
						<h3>Precios</h3>

						<div class="form-group">
							<label for="price">Precio por Dosis</label>
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
					</div>
				{/if}

				<!-- Age Range -->
				<div class="form-section">
					<h3>Rango de Edad</h3>

					<div class="form-group">
						<label for="ageUnit">Unidad de Edad</label>
						<select id="ageUnit" bind:value={formData.ageUnit}>
							<option value="months">Meses</option>
							<option value="years">Años</option>
						</select>
					</div>

					<div class="form-row">
						<div class="form-group">
							<label for="minAge">Edad Mínima ({formData.ageUnit === 'months' ? 'meses' : 'años'})</label>
							<input
								id="minAge"
								type="number"
								bind:value={formData.minAge}
								min="0"
								class:error={errors.ageRange}
							/>
						</div>

						<div class="form-group">
							<label for="maxAge">Edad Máxima ({formData.ageUnit === 'months' ? 'meses' : 'años'})</label>
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

				<!-- Vaccine-specific fields -->
				{#if formData.type === 'vaccine'}
					<div class="form-section">
						<h3>Información de Vacuna</h3>

						<div class="form-group">
							<label for="manufacturer">Fabricante *</label>
							<input
								id="manufacturer"
								type="text"
								bind:value={formData.manufacturer}
								placeholder="Ej: Pfizer"
								class:error={errors.manufacturer}
							/>
							{#if errors.manufacturer}
								<span class="error-text">{errors.manufacturer}</span>
							{/if}
						</div>

						<div class="form-group">
							<label for="dosageInfo">Vía de Administración *</label>
							<textarea
								id="dosageInfo"
								bind:value={formData.dosageInfo}
								placeholder="Ej: 0.5ml por vía intramuscular"
								rows="2"
								class:error={errors.dosageInfo}
							/>
							{#if errors.dosageInfo}
								<span class="error-text">{errors.dosageInfo}</span>
							{/if}
						</div>

						<div class="form-group">
							<label for="targetDiseases">Enfermedades Objetivo *</label>
							<textarea
								id="targetDiseases"
								bind:value={formData.targetDiseases}
								placeholder="Ej: Sarampión, Paperas, Rubéola"
								rows="2"
								class:error={errors.targetDiseases}
							/>
							{#if errors.targetDiseases}
								<span class="error-text">{errors.targetDiseases}</span>
							{/if}
						</div>

						<div class="form-group">
							<label for="dosesAndBoosters">Dosis y Refuerzos *</label>
							<textarea
								id="dosesAndBoosters"
								bind:value={formData.dosesAndBoosters}
								placeholder="Ej: 2 dosis con refuerzo a los 4 años"
								rows="2"
								class:error={errors.dosesAndBoosters}
							/>
							{#if errors.dosesAndBoosters}
								<span class="error-text">{errors.dosesAndBoosters}</span>
							{/if}
						</div>

						<div class="form-group">
							<label for="contraindications">Contraindicaciones</label>
							<textarea
								id="contraindications"
								bind:value={formData.contraindications}
								placeholder="Ej: Contraindicado en pacientes inmunocomprometidos"
								rows="2"
							/>
						</div>

						<div class="form-group">
							<label for="precautions">Efectos Secundarios</label>
							<textarea
								id="precautions"
								bind:value={formData.precautions}
								placeholder="Ej: Fiebre leve, dolor en el sitio de inyección, malestar general"
								rows="2"
							/>
						</div>
					</div>
				{/if}

				<!-- Bundle-specific fields -->
				{#if formData.type === 'bundle'}
					<div class="form-section">
						<h3>Información de Paquete</h3>

						<div class="form-group">
							<label for="targetMilestone">Hito Objetivo</label>
							<input
								id="targetMilestone"
								type="text"
								bind:value={formData.targetMilestone}
								placeholder="Ej: 2 meses"
							/>
						</div>

						<div class="form-group">
							<label>Vacunas Incluidas *</label>
							<AutocompleteInput
								placeholder="Busca y selecciona vacunas para incluir en este paquete"
								options={availableProducts}
								selectedOptions={formData.includedProductIds}
								removeOption={removeIncludedProduct}
								on:select={handleProductSelect}
							/>
							<p class="help-text">
								Busca vacunas por nombre o ID y selecciónalos para incluirlos en
								este paquete (solo se muestran vacunas)
							</p>
							{#if errors.includedProductIds}
								<span class="error-text">{errors.includedProductIds}</span>
							{/if}
						</div>
					</div>
				{/if}

				<!-- Package-specific fields -->
				{#if formData.type === 'package'}
					<div class="form-section">
						<h3>Información de Programa</h3>

						<div class="form-group">
							<label>Paquetes de Dosis Incluidos *</label>
							<AutocompleteInput
								placeholder="Busca y selecciona paquetes de dosis para incluir en este programa"
								options={availableBundles}
								selectedOptions={formData.includedDoseBundles}
								removeOption={removeIncludedDoseBundle}
								on:select={handleBundleSelect}
							/>
							<p class="help-text">
								Busca paquetes de dosis por nombre o ID y selecciónalos para
								incluirlos en este programa
							</p>
							{#if errors.includedDoseBundles}
								<span class="error-text">{errors.includedDoseBundles}</span>
							{/if}
						</div>
					</div>
				{/if}

				<!-- General Medical Information -->
				<div class="form-section">
					<h3>Información Médica General</h3>

					<div class="form-group">
						<label for="specialIndications">Indicaciones Especiales</label>
						<textarea
							id="specialIndications"
							bind:value={formData.specialIndications}
							placeholder="Ej: Requiere evaluación médica previa"
							rows="2"
						/>
					</div>
				</div>

				<!-- Applicable Doctors -->
				<div class="form-section">
					<h3>Doctores Aplicables</h3>

					<div class="form-group">
						<label>Doctores que pueden aplicar este producto</label>
						<AutocompleteInput
							placeholder="Busca y selecciona doctores que pueden aplicar este producto"
							options={availableDoctors}
							selectedOptions={formData.applicableDoctors}
							removeOption={removeApplicableDoctor}
							on:select={handleDoctorSelect}
						/>
						<p class="help-text">
							Busca doctores por nombre o especialidad y selecciónalos para este
							producto
						</p>
					</div>
				</div>

				<!-- Image Upload -->
				<div class="form-section">
					<h3>Imagen del Producto</h3>

					<div class="form-group">
						<label for="image">Imagen</label>
						<input
							id="image"
							type="file"
							accept="image/*"
							on:change={handleImageUpload}
						/>
						<p class="help-text">
							Formatos soportados: JPG, PNG, WebP. Tamaño máximo: 5MB
						</p>
					</div>

					{#if imagePreview}
						<div class="image-preview">
							<img
								src={imagePreview}
								alt="Vista previa"
								data-testid={product.imageUrl}
								data-product-type={product.type}
							/>
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
	.edit-product-container {
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
	.form-group textarea.error,
	.form-group select.error {
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
		display: grid;
		justify-items: center;
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
		justify-content: space-between;
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
		.edit-product-container {
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
