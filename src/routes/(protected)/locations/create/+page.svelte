<script lang="ts">
	import { goto } from '$app/navigation';
	import type { Location } from '../../../types';
	import { db } from '$lib/firebase/vaqmas';
	import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
	import { fly } from 'svelte/transition';
	import { toastStore } from '../../../stores/toast';

	let loading = false;
	let errorMessage = '';
	let successMessage = '';

	// Form data
	let formData = {
		name: '',
		address: '',
	};

	// Validation
	let errors: Record<string, string> = {};

	const validateForm = (): boolean => {
		errors = {};

		if (!formData.name?.trim()) {
			errors.name = 'El nombre de la ubicación es requerido';
		}

		if (!formData.address?.trim()) {
			errors.address = 'La dirección es requerida';
		}

		return Object.keys(errors).length === 0;
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
			// Prepare data for Firestore
			const locationData = {
				name: formData.name.trim(),
				address: formData.address.trim(),
				createdAt: serverTimestamp(),
			};

			await addDoc(collection(db, 'locations'), locationData);

			successMessage = 'Ubicación creada exitosamente';
			setTimeout(() => {
				goto('/locations');
			}, 1500);
		} catch (error) {
			console.error('Error creating location:', error);
			errorMessage = 'Error al crear la ubicación. Por favor, inténtalo de nuevo.';
		} finally {
			loading = false;
		}
	};

	const handleCancel = () => {
		goto('/locations');
	};
</script>

<svelte:head>
	<title>Crear Ubicación - VAQ+ Admin</title>
</svelte:head>

<div class="create-location-container" in:fly={{ y: 20, duration: 300, opacity: 0 }}>
	<div class="page-header">
		<h1>Crear Nueva Ubicación</h1>
		<p>Agregar una nueva clínica o ubicación</p>
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

	<form on:submit|preventDefault={handleSubmit} class="location-form">
		<div class="form-sections">
			<!-- Location Information -->
			<div class="form-section">
				<h3>Información de la Ubicación</h3>

				<div class="form-group">
					<label for="name">Nombre de la Clínica *</label>
					<input
						id="name"
						type="text"
						bind:value={formData.name}
						placeholder="Ej: Clínica Pediátrica Central"
						class:error={errors.name}
					/>
					{#if errors.name}
						<span class="error-text">{errors.name}</span>
					{/if}
				</div>

				<div class="form-group">
					<label for="address">Dirección *</label>
					<textarea
						id="address"
						bind:value={formData.address}
						placeholder="Dirección completa de la clínica"
						rows="3"
						class:error={errors.address}
					/>
					{#if errors.address}
						<span class="error-text">{errors.address}</span>
					{/if}
				</div>
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
				{loading ? 'Creando...' : 'Crear Ubicación'}
			</button>
		</div>
	</form>
</div>

<style>
	.create-location-container {
		max-width: 600px;
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

	.location-form {
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
	.form-group textarea {
		width: 100%;
		padding: 0.75rem;
		border: 2px solid var(--color-border);
		border-radius: var(--border-radius);
		font-size: 1rem;
		transition: border-color 0.2s ease;
	}

	.form-group input:focus,
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
		.create-location-container {
			padding: 1rem;
		}

		.form-sections {
			padding: 1.5rem;
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
