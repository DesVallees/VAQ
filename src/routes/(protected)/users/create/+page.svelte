<script lang="ts">
	import { goto } from '$app/navigation';
	import type { User, UserType } from '../../../types';
	import { db } from '$lib/firebase/vaqmas';
	import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

	let loading = false;
	let errorMessage = '';
	let successMessage = '';

	// Form data
	let formData = {
		email: '',
		displayName: '',
		photoUrl: '',
		phoneNumber: '',
		isAdmin: false,
		userType: 'normal' as UserType,
		patientProfileIds: [] as string[],
		preferredLocationId: '',
	};

	// Available options
	const userTypes: UserType[] = ['normal', 'pediatrician'];

	// Validation
	let errors: Record<string, string> = {};

	const validateForm = (): boolean => {
		errors = {};

		if (!formData.email?.trim()) {
			errors.email = 'El email es requerido';
		} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
			errors.email = 'El email no es válido';
		}

		if (!formData.displayName?.trim()) {
			errors.displayName = 'El nombre es requerido';
		}

		if (formData.phoneNumber && !/^\+?[\d\s\-\(\)]+$/.test(formData.phoneNumber)) {
			errors.phoneNumber = 'El número de teléfono no es válido';
		}

		return Object.keys(errors).length === 0;
	};

	const handleSubmit = async () => {
		if (!validateForm()) {
			return;
		}

		loading = true;
		errorMessage = '';
		successMessage = '';

		try {
			// Prepare data for Firestore
			const userData = {
				email: formData.email.trim(),
				displayName: formData.displayName.trim(),
				photoUrl: formData.photoUrl || null,
				phoneNumber: formData.phoneNumber || null,
				isAdmin: formData.isAdmin,
				userType: formData.userType,
				patientProfileIds: formData.patientProfileIds,
				preferredLocationId: formData.preferredLocationId || null,
				createdAt: serverTimestamp(),
				lastLoginAt: null,
			};

			await addDoc(collection(db, 'users'), userData);

			successMessage = 'Usuario creado exitosamente';
			setTimeout(() => {
				goto('/users');
			}, 1500);
		} catch (error) {
			console.error('Error creating user:', error);
			errorMessage = 'Error al crear el usuario. Por favor, inténtalo de nuevo.';
		} finally {
			loading = false;
		}
	};

	const handleCancel = () => {
		goto('/users');
	};
</script>

<svelte:head>
	<title>Crear Usuario - VAQ+ Admin</title>
</svelte:head>

<div class="create-user-container">
	<div class="page-header">
		<h1>Crear Nuevo Usuario</h1>
		<p>Registrar una nueva cuenta de usuario</p>
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

	<form on:submit|preventDefault={handleSubmit} class="user-form">
		<div class="form-sections">
			<!-- Basic Information -->
			<div class="form-section">
				<h3>Información Básica</h3>

				<div class="form-row">
					<div class="form-group">
						<label for="email">Email *</label>
						<input
							id="email"
							type="email"
							bind:value={formData.email}
							placeholder="usuario@ejemplo.com"
							class:error={errors.email}
						/>
						{#if errors.email}
							<span class="error-text">{errors.email}</span>
						{/if}
					</div>

					<div class="form-group">
						<label for="displayName">Nombre Completo *</label>
						<input
							id="displayName"
							type="text"
							bind:value={formData.displayName}
							placeholder="Juan Pérez"
							class:error={errors.displayName}
						/>
						{#if errors.displayName}
							<span class="error-text">{errors.displayName}</span>
						{/if}
					</div>
				</div>

				<div class="form-row">
					<div class="form-group">
						<label for="phoneNumber">Número de Teléfono</label>
						<input
							id="phoneNumber"
							type="tel"
							bind:value={formData.phoneNumber}
							placeholder="+57 300 123 4567"
							class:error={errors.phoneNumber}
						/>
						{#if errors.phoneNumber}
							<span class="error-text">{errors.phoneNumber}</span>
						{/if}
					</div>

					<div class="form-group">
						<label for="photoUrl">URL de Foto</label>
						<input
							id="photoUrl"
							type="url"
							bind:value={formData.photoUrl}
							placeholder="https://ejemplo.com/foto.jpg"
						/>
					</div>
				</div>
			</div>

			<!-- User Type and Permissions -->
			<div class="form-section">
				<h3>Tipo de Usuario y Permisos</h3>

				<div class="form-row">
					<div class="form-group">
						<label for="userType">Tipo de Usuario *</label>
						<select id="userType" bind:value={formData.userType}>
							{#each userTypes as type}
								<option value={type}>
									{type === 'normal' ? 'Paciente' : 'Pediatra'}
								</option>
							{/each}
						</select>
					</div>

					<div class="form-group">
						<label for="isAdmin">Permisos de Administrador</label>
						<div class="checkbox-group">
							<label class="checkbox-label">
								<input type="checkbox" bind:checked={formData.isAdmin} />
								¿Es administrador?
							</label>
							<p class="help-text">
								Los administradores tienen acceso completo al sistema
							</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Additional Information -->
			<div class="form-section">
				<h3>Información Adicional</h3>

				<div class="form-group">
					<label for="preferredLocationId">Ubicación Preferida</label>
					<input
						id="preferredLocationId"
						type="text"
						bind:value={formData.preferredLocationId}
						placeholder="ID de la ubicación preferida"
					/>
					<p class="help-text">ID de la clínica o ubicación preferida del usuario</p>
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
				{loading ? 'Creando...' : 'Crear Usuario'}
			</button>
		</div>
	</form>
</div>

<style>
	.create-user-container {
		max-width: 800px;
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

	.user-form {
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
	.form-group select {
		width: 100%;
		padding: 0.75rem;
		border: 2px solid var(--color-border);
		border-radius: var(--border-radius);
		font-size: 1rem;
		transition: border-color 0.2s ease;
	}

	.form-group input:focus,
	.form-group select:focus {
		outline: none;
		border-color: var(--color-primary);
	}

	.form-group input.error {
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

	.checkbox-group {
		margin-top: 0.5rem;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 500;
		cursor: pointer;
	}

	.checkbox-label input[type='checkbox'] {
		width: auto;
		margin: 0;
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
		.create-user-container {
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
