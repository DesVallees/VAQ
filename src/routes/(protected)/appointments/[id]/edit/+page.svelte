<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import type {
		Appointment,
		AppointmentType,
		AppointmentStatus,
		User,
		Pediatrician,
		Location,
		Product,
	} from '../../../../types';
	import { db } from '$lib/firebase/vaqmas';
	import {
		doc,
		getDoc,
		updateDoc,
		serverTimestamp,
		getDocs,
		collection,
	} from 'firebase/firestore';
	import { onMount } from 'svelte';

	let loading = true;
	let saving = false;
	let appointment: Appointment | null = null;
	let errorMessage = '';
	let successMessage = '';

	// Data for dropdowns
	let patients: User[] = [];
	let pediatricians: Pediatrician[] = [];
	let locations: Location[] = [];
	let products: Product[] = [];

	// Form data
	let formData: Partial<Appointment> = {};

	// Available options
	const appointmentTypes: AppointmentType[] = [
		'vaccination',
		'consultation',
		'packageApplication',
		'checkup',
		'followUp',
	];

	// Spanish translations for appointment types
	const appointmentTypeLabels: Record<string, string> = {
		vaccination: 'Vacunación',
		consultation: 'Consulta',
		packageApplication: 'Aplicación de Paquete',
		checkup: 'Revisión',
		followUp: 'Seguimiento',
	};
	const appointmentStatuses: AppointmentStatus[] = [
		'scheduled',
		'pending',
		'completed',
		'cancelledByUser',
		'cancelledByClinic',
		'noShow',
		'rescheduled',
	];

	// Spanish translations for appointment statuses
	const appointmentStatusLabels: Record<string, string> = {
		scheduled: 'Programada',
		pending: 'Pendiente',
		completed: 'Completada',
		cancelledByClinic: 'Cancelada por Clínica',
		cancelledByUser: 'Cancelada por Usuario',
		noShow: 'No asistió',
		rescheduled: 'Reprogramada',
	};
	const durationOptions = [15, 30, 45, 60, 90, 120];

	// Validation
	let errors: Record<string, string> = {};

	onMount(async () => {
		await loadFormData();
		await loadAppointment();
	});

	const loadFormData = async () => {
		try {
			// Load patients (normal users) - simplified query to avoid index issues
			const patientsSnapshot = await getDocs(collection(db, 'users'));
			patients = patientsSnapshot.docs
				.filter((doc) => doc.data().userType === 'normal')
				.sort((a, b) => {
					const nameA = a.data().displayName || '';
					const nameB = b.data().displayName || '';
					return nameA.localeCompare(nameB);
				})
				.map((doc) => ({
					id: doc.id,
					...doc.data(),
					createdAt: doc.data().createdAt?.toDate() || new Date(),
					lastLoginAt: doc.data().lastLoginAt?.toDate() || null,
				})) as User[];

			// Load pediatricians - simplified query to avoid index issues
			const pediatriciansSnapshot = await getDocs(collection(db, 'pediatricians'));
			pediatricians = pediatriciansSnapshot.docs
				.sort((a, b) => {
					const nameA = a.data().displayName || '';
					const nameB = b.data().displayName || '';
					return nameA.localeCompare(nameB);
				})
				.map((doc) => {
					const data = doc.data();
					return {
						id: doc.id,
						...data,
						createdAt: data.createdAt?.toDate() || new Date(),
						lastLoginAt: data.lastLoginAt?.toDate() || new Date(),
					} as Pediatrician;
				});

			// Load locations - simplified query to avoid index issues
			const locationsSnapshot = await getDocs(collection(db, 'locations'));
			locations = locationsSnapshot.docs
				.sort((a, b) => {
					const nameA = a.data().name || '';
					const nameB = b.data().name || '';
					return nameA.localeCompare(nameB);
				})
				.map((doc) => {
					const data = doc.data();
					return {
						id: doc.id,
						...data,
						createdAt: data.createdAt?.toDate() || new Date(),
					} as Location;
				});

			// Load products - simplified query to avoid index issues
			const productsSnapshot = await getDocs(collection(db, 'products'));
			products = productsSnapshot.docs
				.sort((a, b) => {
					const nameA = a.data().name || '';
					const nameB = b.data().name || '';
					return nameA.localeCompare(nameB);
				})
				.map((doc) => {
					const data = doc.data();
					return {
						id: doc.id,
						type: data.type || 'vaccine',
						name: data.name || '',
						commonName: data.commonName || '',
						description: data.description || '',
						price: data.price || null,
						priceAvacunar: data.priceAvacunar || null,
						priceVita: data.priceVita || null,
						priceColsanitas: data.priceColsanitas || null,
						imageUrl: data.imageUrl || '',
						applicableDoctors: data.applicableDoctors || [],
						minAge: data.minAge || 0,
						maxAge: data.maxAge || 18,
						specialIndications: data.specialIndications || null,
						manufacturer: data.manufacturer || null,
						dosageInfo: data.dosageInfo || null,
						targetDiseases: data.targetDiseases || null,
						dosesAndBoosters: data.dosesAndBoosters || null,
						includedProductIds: data.includedProductIds || null,
						includedDoseBundles: data.includedDoseBundles || null,
						targetMilestone: data.targetMilestone || null,
						createdAt: data.createdAt?.toDate() || new Date(),
						updatedAt: data.updatedAt?.toDate() || new Date(),
					} as Product;
				});
		} catch (error) {
			console.error('Error loading form data:', error);
			errorMessage = 'Error al cargar los datos del formulario';
		}
	};

	const loadAppointment = async () => {
		const appointmentId = $page.params.id;
		if (!appointmentId) {
			errorMessage = 'ID de cita no válido';
			loading = false;
			return;
		}

		try {
			const appointmentDoc = await getDoc(doc(db, 'appointments', appointmentId));
			if (appointmentDoc.exists()) {
				const data = appointmentDoc.data();

				// Handle dateTime field - could be Firestore Timestamp, Date, or string
				let dateTime: Date;
				if (data.dateTime) {
					if (typeof data.dateTime === 'object' && data.dateTime.toDate) {
						// Firestore Timestamp
						dateTime = data.dateTime.toDate();
					} else if (data.dateTime instanceof Date) {
						// Already a Date object
						dateTime = data.dateTime;
					} else if (typeof data.dateTime === 'string') {
						// String date - try to parse it
						dateTime = new Date(data.dateTime);
					} else if (typeof data.dateTime === 'number') {
						// Unix timestamp
						dateTime = new Date(data.dateTime);
					} else {
						// Fallback to current date
						console.warn(
							'Invalid dateTime format for appointment:',
							appointmentId,
							data.dateTime,
						);
						dateTime = new Date();
					}
				} else {
					dateTime = new Date();
				}

				// Handle other date fields similarly
				let createdAt: Date;
				if (data.createdAt) {
					if (typeof data.createdAt === 'object' && data.createdAt.toDate) {
						createdAt = data.createdAt.toDate();
					} else if (data.createdAt instanceof Date) {
						createdAt = data.createdAt;
					} else if (typeof data.createdAt === 'string') {
						createdAt = new Date(data.createdAt);
					} else if (typeof data.createdAt === 'number') {
						createdAt = new Date(data.createdAt);
					} else {
						createdAt = new Date();
					}
				} else {
					createdAt = new Date();
				}

				let updatedAt: Date;
				if (data.updatedAt) {
					if (typeof data.updatedAt === 'object' && data.updatedAt.toDate) {
						updatedAt = data.updatedAt.toDate();
					} else if (data.updatedAt instanceof Date) {
						updatedAt = data.updatedAt;
					} else if (typeof data.updatedAt === 'string') {
						updatedAt = new Date(data.updatedAt);
					} else if (typeof data.updatedAt === 'number') {
						updatedAt = new Date(data.updatedAt);
					} else {
						updatedAt = new Date();
					}
				} else {
					updatedAt = new Date();
				}

				let lastUpdatedAt: Date;
				if (data.lastUpdatedAt) {
					if (typeof data.lastUpdatedAt === 'object' && data.lastUpdatedAt.toDate) {
						lastUpdatedAt = data.lastUpdatedAt.toDate();
					} else if (data.lastUpdatedAt instanceof Date) {
						lastUpdatedAt = data.lastUpdatedAt;
					} else if (typeof data.lastUpdatedAt === 'string') {
						lastUpdatedAt = new Date(data.lastUpdatedAt);
					} else if (typeof data.lastUpdatedAt === 'number') {
						lastUpdatedAt = new Date(data.lastUpdatedAt);
					} else {
						lastUpdatedAt = new Date();
					}
				} else {
					lastUpdatedAt = new Date();
				}

				appointment = {
					id: appointmentDoc.id,
					patientId: data.patientId || '',
					patientName: data.patientName || '',
					doctorId: data.doctorId || '',
					doctorName: data.doctorName || '',
					doctorSpecialty: data.doctorSpecialty || '',
					dateTime,
					durationMinutes: data.durationMinutes || 30,
					locationId: data.locationId || '',
					locationName: data.locationName || '',
					locationAddress: data.locationAddress || '',
					type: data.type || 'consultation',
					productIds: data.productIds || [],
					status: data.status || 'scheduled',
					notes: data.notes || '',
					createdAt,
					updatedAt,
					lastUpdatedAt,
					createdByUserId: data.createdByUserId || '',
				} as Appointment;

				// Initialize form data
				formData = { ...appointment };
			} else {
				errorMessage = 'Cita no encontrada';
			}
		} catch (error) {
			console.error('Error loading appointment:', error);
			errorMessage = 'Error al cargar la cita';
		} finally {
			loading = false;
		}
	};

	const validateForm = (): boolean => {
		errors = {};

		if (!formData.patientId) {
			errors.patientId = 'Debe seleccionar un paciente';
		}

		if (!formData.doctorId) {
			errors.doctorId = 'Debe seleccionar un doctor';
		}

		if (!formData.locationId) {
			errors.locationId = 'Debe seleccionar una ubicación';
		}

		if (!formData.dateTime) {
			errors.dateTime = 'Debe seleccionar fecha y hora';
		} else {
			const selectedDate = new Date(formData.dateTime);
			const now = new Date();
			if (selectedDate <= now) {
				errors.dateTime = 'La fecha y hora debe ser futura';
			}
		}

		if (!formData.type) {
			errors.type = 'Debe seleccionar el tipo de cita';
		}

		if ((formData.durationMinutes || 0) <= 0) {
			errors.durationMinutes = 'La duración debe ser mayor a 0';
		}

		return Object.keys(errors).length === 0;
	};

	const handlePatientChange = () => {
		const selectedPatient = patients.find((p) => p.id === formData.patientId);
		if (selectedPatient) {
			formData.patientName = selectedPatient.displayName || selectedPatient.email;
		}
	};

	const handleDoctorChange = () => {
		const selectedDoctor = pediatricians.find((d) => d.id === formData.doctorId);
		if (selectedDoctor) {
			formData.doctorName = selectedDoctor.displayName || selectedDoctor.email;
			formData.doctorSpecialty = selectedDoctor.specialty;
		}
	};

	const handleLocationChange = () => {
		const selectedLocation = locations.find((l) => l.id === formData.locationId);
		if (selectedLocation) {
			formData.locationName = selectedLocation.name;
			formData.locationAddress = selectedLocation.address;
		}
	};

	const handleDateTimeChange = (e: Event) => {
		const target = e.target as HTMLInputElement;
		if (target.value) {
			formData.dateTime = new Date(target.value);
		}
	};

	const handleProductChange = (e: Event) => {
		const target = e.target as HTMLSelectElement;
		if (target.value) {
			addProduct(target.value);
		}
	};

	const addProduct = (productId: string) => {
		if (!formData.productIds?.includes(productId)) {
			formData.productIds = [...(formData.productIds || []), productId];
		}
	};

	const removeProduct = (productIdToRemove: string) => {
		formData.productIds =
			formData.productIds?.filter((id: string) => id !== productIdToRemove) || [];
	};

	const getProductName = (productId: string) => {
		const product = products.find((p) => p.id === productId);
		return product ? product.name : 'Producto no encontrado';
	};

	const handleSubmit = async () => {
		if (!validateForm() || !appointment) {
			return;
		}

		saving = true;
		errorMessage = '';
		successMessage = '';

		try {
			// Prepare data for Firestore
			const updateData = {
				patientId: formData.patientId,
				patientName: formData.patientName,
				doctorId: formData.doctorId,
				doctorName: formData.doctorName,
				doctorSpecialty: formData.doctorSpecialty,
				dateTime: new Date(formData.dateTime!),
				durationMinutes: formData.durationMinutes,
				locationId: formData.locationId,
				locationName: formData.locationName,
				locationAddress: formData.locationAddress,
				type: formData.type,
				productIds: formData.productIds,
				status: formData.status,
				notes: formData.notes,
				updatedAt: serverTimestamp(),
				lastUpdatedAt: serverTimestamp(),
			};

			await updateDoc(doc(db, 'appointments', appointment.id), updateData);

			successMessage = 'Cita actualizada exitosamente';
			setTimeout(() => {
				goto('/appointments');
			}, 1500);
		} catch (error) {
			console.error('Error updating appointment:', error);
			errorMessage = 'Error al actualizar la cita. Por favor, inténtalo de nuevo.';
		} finally {
			saving = false;
		}
	};

	const handleCancel = () => {
		goto('/appointments');
	};

	const handleDelete = async () => {
		if (
			!appointment ||
			!confirm(
				'¿Estás seguro de que quieres eliminar esta cita? Esta acción no se puede deshacer.',
			)
		) {
			return;
		}

		try {
			await updateDoc(doc(db, 'appointments', appointment.id), {
				deletedAt: serverTimestamp(),
			});

			successMessage = 'Cita eliminada exitosamente';
			setTimeout(() => {
				goto('/appointments');
			}, 1500);
		} catch (error) {
			console.error('Error deleting appointment:', error);
			errorMessage = 'Error al eliminar la cita';
		}
	};
</script>

<svelte:head>
	<title>Editar Cita - VAQ+ Admin</title>
</svelte:head>

<div class="edit-appointment-container">
	<div class="page-header">
		<h1>Editar Cita</h1>
		<p>Modificar cita existente</p>
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
			<p>Cargando cita...</p>
		</div>
	{:else if appointment}
		<form on:submit|preventDefault={handleSubmit} class="appointment-form">
			<div class="form-sections">
				<!-- Patient and Doctor Selection -->
				<div class="form-section">
					<h3>Paciente y Doctor</h3>

					<div class="form-row">
						<div class="form-group">
							<label for="patientId">Paciente *</label>
							<select
								id="patientId"
								bind:value={formData.patientId}
								on:change={handlePatientChange}
								class:error={errors.patientId}
							>
								<option value="">Seleccionar paciente</option>
								{#each patients as patient}
									<option value={patient.id}>
										{patient.displayName || patient.email}
									</option>
								{/each}
							</select>
							{#if errors.patientId}
								<span class="error-text">{errors.patientId}</span>
							{/if}
						</div>

						<div class="form-group">
							<label for="doctorId">Doctor *</label>
							<select
								id="doctorId"
								bind:value={formData.doctorId}
								on:change={handleDoctorChange}
								class:error={errors.doctorId}
							>
								<option value="">Seleccionar doctor</option>
								{#each pediatricians as doctor}
									<option value={doctor.id}>
										{doctor.displayName || doctor.email} - {doctor.specialty}
									</option>
								{/each}
							</select>
							{#if errors.doctorId}
								<span class="error-text">{errors.doctorId}</span>
							{/if}
						</div>
					</div>

					<div class="form-group">
						<label for="locationId">Ubicación *</label>
						<select
							id="locationId"
							bind:value={formData.locationId}
							on:change={handleLocationChange}
							class:error={errors.locationId}
						>
							<option value="">Seleccionar ubicación</option>
							{#each locations as location}
								<option value={location.id}>
									{location.name} - {location.address}
								</option>
							{/each}
						</select>
						{#if errors.locationId}
							<span class="error-text">{errors.locationId}</span>
						{/if}
					</div>
				</div>

				<!-- Appointment Details -->
				<div class="form-section">
					<h3>Detalles de la Cita</h3>

					<div class="form-row">
						<div class="form-group">
							<label for="type">Tipo de Cita *</label>
							<select id="type" bind:value={formData.type}>
								{#each appointmentTypes as type}
									<option value={type}>{appointmentTypeLabels[type]}</option>
								{/each}
							</select>
						</div>

						<div class="form-group">
							<label for="status">Estado</label>
							<select id="status" bind:value={formData.status}>
								{#each appointmentStatuses as status}
									<option value={status}>{appointmentStatusLabels[status]}</option
									>
								{/each}
							</select>
						</div>
					</div>

					<div class="form-row">
						<div class="form-group">
							<label for="dateTime">Fecha y Hora *</label>
							<input
								id="dateTime"
								type="datetime-local"
								value={formData.dateTime
									? new Date(formData.dateTime).toISOString().slice(0, 16)
									: ''}
								on:change={handleDateTimeChange}
								class:error={errors.dateTime}
							/>
							{#if errors.dateTime}
								<span class="error-text">{errors.dateTime}</span>
							{/if}
						</div>

						<div class="form-group">
							<label for="durationMinutes">Duración (minutos) *</label>
							<select id="durationMinutes" bind:value={formData.durationMinutes}>
								{#each durationOptions as duration}
									<option value={duration}>{duration} min</option>
								{/each}
							</select>
						</div>
					</div>
				</div>

				<!-- Products/Services -->
				<div class="form-section">
					<h3>Productos y Servicios</h3>

					<div class="form-group">
						<label>Productos Relacionados</label>
						<select on:change={handleProductChange}>
							<option value="">Seleccionar producto</option>
							{#each products as product}
								<option value={product.id}>
									{product.name} - {product.type}
								</option>
							{/each}
						</select>
						<p class="help-text">
							Selecciona productos relacionados con esta cita (vacunas, medicamentos,
							etc.)
						</p>

						{#if formData.productIds && formData.productIds.length > 0}
							<div class="selected-products">
								<h4>Productos Seleccionados:</h4>
								<div class="product-tags">
									{#each formData.productIds as productId}
										<span class="product-tag">
											{getProductName(productId)}
											<button
												type="button"
												on:click={() => removeProduct(productId)}
												class="remove-product">×</button
											>
										</span>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				</div>

				<!-- Notes -->
				<div class="form-section">
					<h3>Notas Adicionales</h3>

					<div class="form-group">
						<label for="notes">Notas</label>
						<textarea
							id="notes"
							bind:value={formData.notes}
							placeholder="Información adicional sobre la cita, instrucciones especiales, etc."
							rows="4"
						/>
						<p class="help-text">
							Agrega cualquier información adicional relevante para la cita
						</p>
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
	.edit-appointment-container {
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

	.appointment-form {
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

	.selected-products {
		margin-top: 1rem;
		padding: 1rem;
		background-color: var(--color-background-light);
		border-radius: var(--border-radius);
	}

	.selected-products h4 {
		margin: 0 0 0.5rem 0;
		font-size: 1rem;
		color: var(--color-text-primary);
	}

	.product-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.product-tag {
		background-color: var(--color-primary-light);
		color: var(--color-primary);
		padding: 0.25rem 0.75rem;
		border-radius: 20px;
		font-size: 0.875rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.remove-product {
		background: none;
		border: none;
		color: var(--color-primary);
		cursor: pointer;
		font-size: 1.2rem;
		padding: 0;
		line-height: 1;
	}

	.remove-product:hover {
		color: var(--color-error);
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
		.edit-appointment-container {
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
