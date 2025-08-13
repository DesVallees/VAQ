<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import type { Location } from '../../../../types';
	import { db } from '$lib/firebase/vaqmas';
	import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
	import { onMount } from 'svelte';

	let loading = true;
	let saving = false;
	let location: Location | null = null;
	let errorMessage = '';
	let successMessage = '';

	// Form data
	let formData: Partial<Location> = {};

	// Validation
	let errors: Record<string, string> = {};

	onMount(async () => {
		await loadLocation();
	});

	const loadLocation = async () => {
		const locationId = $page.params.id;
		if (!locationId) {
			errorMessage = 'ID de ubicación no válido';
			loading = false;
			return;
		}

		try {
			const locationDoc = await getDoc(doc(db, 'locations', locationId));
			if (locationDoc.exists()) {
				const data = locationDoc.data();
				location = {
					id: locationDoc.id,
					name: data.name || '',
					address: data.address || '',
					createdAt: data.createdAt?.toDate() || new Date(),
				} as Location;

				// Initialize form data
				formData = { ...location };
			} else {
				errorMessage = 'Ubicación no encontrada';
			}
		} catch (error) {
			console.error('Error loading location:', error);
			errorMessage = 'Error al cargar la ubicación';
		} finally {
			loading = false;
		}
	};

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
		if (!validateForm() || !location) {
			return;
		}

		saving = true;
		errorMessage = '';
		successMessage = '';

		try {
			// Prepare data for Firestore
			const updateData = {
				name: formData.name?.trim(),
				address: formData.address?.trim(),
				updatedAt: serverTimestamp(),
			};

			await updateDoc(doc(db, 'locations', location.id), updateData);

			successMessage = 'Ubicación actualizada exitosamente';
			setTimeout(() => {
				goto('/locations');
			}, 1500);
		} catch (error) {
			console.error('Error updating location:', error);
			errorMessage = 'Error al actualizar la ubicación. Por favor, inténtalo de nuevo.';
		} finally {
			saving = false;
		}
	};

	const handleCancel = () => {
		goto('/locations');
	};

	const handleDelete = async () => {
		if (
			!location ||
			!confirm(
				'¿Estás seguro de que quieres eliminar esta ubicación? Esta acción no se puede deshacer.',
			)
		) {
			return;
		}

		try {
			await updateDoc(doc(db, 'locations', location.id), {
				deletedAt: serverTimestamp(),
			});

			successMessage = 'Ubicación eliminada exitosamente';
			setTimeout(() => {
				goto('/locations');
			}, 1500);
		} catch (error) {
			console.error('Error deleting location:', error);
			errorMessage = 'Error al eliminar la ubicación';
		}
	};
</script>

<svelte:head>
	<title>Editar Ubicación - VAQ+ Admin</title>
</svelte:head>

<div class="edit-location-container">
	<div class="page-header">
		<h1>Editar Ubicación</h1>
		<p>Modificar clínica o ubicación existente</p>
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
			<p>Cargando ubicación...</p>
		</div>
	{:else if location}
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
	.edit-location-container {
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

	.btn-danger {
		background-color: var(--color-error);
		color: white;
	}

	.btn-danger:hover:not(:disabled) {
		background-color: var(--color-error-dark);
	}

	@media (max-width: 768px) {
		.edit-location-container {
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
