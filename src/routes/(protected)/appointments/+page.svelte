<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import type { Appointment, AppointmentStatus, AppointmentType, Product } from '../../types';
	import { db } from '$lib/firebase/vaqmas';
	import { getDocs, query, collection, orderBy, deleteDoc, doc } from 'firebase/firestore';

	let appointments: Appointment[] = [];
	let products: Product[] = [];
	let loading = true;
	let searchTerm = '';
	let statusFilter: AppointmentStatus | 'all' = 'all';
	let dateFilter = 'all'; // all, today, week, month
	let selectedAppointment: Appointment | null = null;
	let showDetails = false;

	const STORAGE_KEY = 'appointments-filters';

	// Save to sessionStorage
	function saveToStorage() {
		if (typeof window !== 'undefined') {
			sessionStorage.setItem(
				STORAGE_KEY,
				JSON.stringify({
					searchTerm,
					statusFilter,
					dateFilter,
				}),
			);
		}
	}

	// Load from sessionStorage
	function loadFromStorage() {
		if (typeof window !== 'undefined') {
			const stored = sessionStorage.getItem(STORAGE_KEY);
			if (stored) {
				try {
					const parsed = JSON.parse(stored);
					searchTerm = parsed.searchTerm || '';
					statusFilter = parsed.statusFilter || 'all';
					dateFilter = parsed.dateFilter || 'all';
				} catch (e) {
					console.error('Error loading from sessionStorage:', e);
				}
			}
		}
	}

	// Update URL and sessionStorage when filters change
	function updateURL() {
		const params = new URLSearchParams();
		if (searchTerm) params.set('search', searchTerm);
		if (statusFilter !== 'all') params.set('status', statusFilter);
		if (dateFilter !== 'all') params.set('date', dateFilter);

		const queryString = params.toString();
		const newUrl = queryString ? `${$page.url.pathname}?${queryString}` : $page.url.pathname;
		goto(newUrl, { replaceState: true, noScroll: true });
		saveToStorage();
	}

	// Initialize from URL params (priority) or sessionStorage
	function initializeFromURL() {
		const params = $page.url.searchParams;

		// URL params take priority if they exist
		if (params.has('search') || params.has('status') || params.has('date')) {
			searchTerm = params.get('search') || '';
			statusFilter = (params.get('status') as AppointmentStatus | 'all') || 'all';
			dateFilter = params.get('date') || 'all';
			// Save URL params to storage
			saveToStorage();
		} else {
			// Otherwise load from sessionStorage
			loadFromStorage();
		}
	}

	onMount(async () => {
		initializeFromURL();
		await Promise.all([loadAppointments(), loadProducts()]);
	});

	const loadProducts = async () => {
		try {
			const productsSnapshot = await getDocs(collection(db, 'products'));
			products = productsSnapshot.docs.map((doc) => {
				const data = doc.data();
				return {
					id: doc.id,
					type: data.type || 'vaccine',
					name: data.name || '',
					commonName: data.commonName || '',
					description: data.description || '',
					price: data.price || null,
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
			console.error('Error loading products:', error);
		}
	};

	const loadAppointments = async () => {
		loading = true;
		try {
			const appointmentsSnapshot = await getDocs(
				query(collection(db, 'appointments'), orderBy('dateTime', 'desc')),
			);

			appointments = appointmentsSnapshot.docs.map((doc) => {
				const data = doc.data();

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
							doc.id,
							data.dateTime,
						);
						dateTime = new Date();
					}
				} else {
					dateTime = new Date();
				}

				// Handle createdAt field similarly
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

				return {
					id: doc.id,
					...data,
					dateTime,
					createdAt,
					paymentStatus: data.paymentStatus || null,
					paymentRef: data.paymentRef || null,
				} as Appointment;
			});
		} catch (error) {
			// Set empty array on error to prevent further issues
			appointments = [];
		} finally {
			loading = false;
		}
	};

	const handleDelete = async (appointment: Appointment) => {
		if (
			confirm(
				`¿Estás seguro de que quieres eliminar la cita del ${formatDate(
					appointment.dateTime,
				)}?`,
			)
		) {
			try {
				await deleteDoc(doc(db, 'appointments', appointment.id));
				await loadAppointments();
			} catch (error) {
				console.error('Error deleting appointment:', error);
				alert('Error al eliminar la cita');
			}
		}
	};

	const handleStatusChange = async (appointment: Appointment, newStatus: AppointmentStatus) => {
		try {
			// In a real app, you'd update the document here
			// await updateDoc(doc(db, 'appointments', appointment.id), { status: newStatus });
			appointment.status = newStatus;
			appointments = [...appointments]; // Trigger reactivity
		} catch (error) {
			console.error('Error updating appointment status:', error);
			alert('Error al actualizar el estado de la cita');
		}
	};

	const showAppointmentDetails = (appointment: Appointment) => {
		selectedAppointment = appointment;
		showDetails = true;
	};

	const closeDetails = () => {
		showDetails = false;
		selectedAppointment = null;
	};

	const formatDate = (date: Date) => {
		// Validate date before formatting
		if (!(date instanceof Date) || isNaN(date.getTime())) {
			return 'Fecha inválida';
		}
		return date.toLocaleDateString('es-CO', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});
	};

	const formatTime = (date: Date) => {
		// Validate date before formatting
		if (!(date instanceof Date) || isNaN(date.getTime())) {
			return 'Hora inválida';
		}
		return date.toLocaleTimeString('es-CO', {
			hour: '2-digit',
			minute: '2-digit',
		});
	};

	const formatDateTime = (date: Date) => {
		// Validate date before formatting
		if (!(date instanceof Date) || isNaN(date.getTime())) {
			return 'Fecha y hora inválidas';
		}
		return `${formatDate(date)} a las ${formatTime(date)}`;
	};

	const formatStatus = (status: AppointmentStatus) => {
		// Handle both formats: "scheduled" and "AppointmentStatus.scheduled"
		const cleanStatus = status.includes('.') ? status.split('.').pop() || status : status;

		const statusMap: Record<string, string> = {
			scheduled: 'Programada',
			pending: 'Pendiente',
			completed: 'Completada',
			cancelledByUser: 'Cancelada por Usuario',
			cancelledByClinic: 'Cancelada por Clínica',
			noShow: 'No asistió',
			rescheduled: 'Reprogramada',
		};
		return statusMap[cleanStatus] || cleanStatus;
	};

	const formatType = (type: AppointmentType) => {
		// Handle both formats: "packageApplication" and "AppointmentType.packageApplication"
		const cleanType = type.includes('.') ? type.split('.').pop() || type : type;

		const typeMap: Record<string, string> = {
			vaccination: 'Vacunación',
			consultation: 'Consulta',
			packageApplication: 'Aplicación de Programa',
			checkup: 'Revisión',
			followUp: 'Seguimiento',
		};
		return typeMap[cleanType] || cleanType;
	};

	const getStatusColor = (status: AppointmentStatus) => {
		const colorMap = {
			scheduled: 'var(--warning-500)',
			pending: 'var(--primary-500)',
			completed: 'var(--success-500)',
			cancelledByUser: 'var(--error-500)',
			cancelledByClinic: 'var(--error-500)',
			noShow: 'var(--neutral-500)',
			rescheduled: 'var(--warning-500)',
		};
		return colorMap[status] || 'var(--neutral-500)';
	};

	const getStatusBadgeClass = (status: AppointmentStatus) => {
		return `status-badge status-${status}`;
	};

	const getProductName = (productId: string) => {
		const product = products.find((p) => p.id === productId);
		return product ? product.name : 'Producto no encontrado';
	};

	const formatPaymentStatus = (paymentStatus: string | null) => {
		if (!paymentStatus) return 'Sin estado de pago';
		// Handle both formats: "none" and "PaymentStatus.none"
		const cleanStatus = paymentStatus.includes('.')
			? paymentStatus.split('.').pop() || paymentStatus
			: paymentStatus;

		const statusMap: Record<string, string> = {
			none: 'Sin pago',
			pending: 'Pendiente',
			completed: 'Completado',
			failed: 'Fallido',
			refunded: 'Reembolsado',
		};
		return statusMap[cleanStatus] || cleanStatus;
	};

	// Filter appointments based on search and filters
	$: filteredAppointments = appointments.filter((appointment) => {
		const matchesSearch =
			(appointment.patientName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
			(appointment.locationName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
			(appointment.notes?.toLowerCase() || '').includes(searchTerm.toLowerCase());

		const matchesStatus = statusFilter === 'all' || appointment.status === statusFilter;

		let matchesDate = true;
		if (dateFilter !== 'all') {
			const now = new Date();
			const appointmentDate = appointment.dateTime;

			// Ensure appointmentDate is a valid Date object
			if (!(appointmentDate instanceof Date) || isNaN(appointmentDate.getTime())) {
				matchesDate = false;
			} else {
				switch (dateFilter) {
					case 'today':
						matchesDate = appointmentDate.toDateString() === now.toDateString();
						break;
					case 'week':
						const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
						matchesDate = appointmentDate >= weekAgo;
						break;
					case 'month':
						const monthAgo = new Date(
							now.getFullYear(),
							now.getMonth() - 1,
							now.getDate(),
						);
						matchesDate = appointmentDate >= monthAgo;
						break;
				}
			}
		}

		return matchesSearch && matchesStatus && matchesDate;
	});

	// Calculate statistics
	$: totalAppointments = appointments.length;
	$: todayAppointments = appointments.filter((a) => {
		// Ensure dateTime is a valid Date object
		if (!(a.dateTime instanceof Date) || isNaN(a.dateTime.getTime())) {
			return false;
		}
		return a.dateTime.toDateString() === new Date().toDateString();
	}).length;
	$: pendingAppointments = appointments.filter(
		(a) => a.status === 'scheduled' || a.status === 'pending',
	).length;
	$: completedAppointments = appointments.filter((a) => a.status === 'completed').length;
</script>

<div class="appointments-page">
	<div class="page-header">
		<div class="header-content">
			<div class="header-logo">
				<img src="/images/logo.png" alt="VAQ+ Logo" class="header-logo-image" />
				<div class="header-text">
					<h1>Gestión de Citas</h1>
					<p>Administra citas médicas y programaciones de pacientes</p>
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
				placeholder="Buscar citas por paciente, ubicación o motivo..."
				bind:value={searchTerm}
				on:input={() => updateURL()}
				class="search-input"
			/>
		</div>

		<div class="filters-container">
			<select bind:value={statusFilter} class="filter-select" on:change={() => updateURL()}>
				<option value="all">Todos los estados</option>
				<option value="scheduled">Programada</option>
				<option value="pending">Pendiente</option>
				<option value="completed">Completada</option>
				<option value="cancelledByUser">Cancelada por Usuario</option>
				<option value="cancelledByClinic">Cancelada por Clínica</option>
				<option value="noShow">No asistió</option>
				<option value="rescheduled">Reprogramada</option>
			</select>

			<select bind:value={dateFilter} class="filter-select" on:change={() => updateURL()}>
				<option value="all">Todas las fechas</option>
				<option value="today">Hoy</option>
				<option value="week">Esta semana</option>
				<option value="month">Este mes</option>
			</select>
		</div>

		<button class="create-btn" on:click={() => goto('/appointments/create')}>
			<svg viewBox="0 0 24 24">
				<path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
			</svg>
			Nueva Cita
		</button>
	</div>

	<!-- Appointments Table -->
	<div class="table-container">
		{#if loading}
			<div class="loading-state">
				<div class="spinner" />
				<p>Cargando citas...</p>
			</div>
		{:else if filteredAppointments.length === 0}
			<div class="empty-state">
				<svg viewBox="0 0 24 24">
					<path
						d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"
					/>
				</svg>
				<p>No se encontraron citas</p>
				{#if searchTerm || statusFilter !== 'all' || dateFilter !== 'all'}
					<p class="empty-subtitle">Intenta con otros filtros de búsqueda</p>
				{/if}
			</div>
		{:else}
			<div class="table-scroll-wrapper">
				<table class="appointments-table">
					<thead>
						<tr>
							<th class="col-patient">Paciente</th>
							<th class="col-location">Ubicación</th>
							<th class="col-datetime">Fecha y Hora</th>
							<th class="col-reason">Motivo</th>
							<th class="col-status">Estado</th>
							<th class="col-actions">Acciones</th>
						</tr>
					</thead>
					<tbody>
						{#each filteredAppointments as appointment (appointment.id)}
							<tr class="appointment-row">
								<td class="col-patient">
									<div class="patient-info">
										<div class="patient-name">
											{appointment.patientName || 'Sin nombre'}
										</div>
										<div class="patient-id">{appointment.patientId}</div>
									</div>
								</td>
								<td class="col-location">
									<div class="location-info">
										<div class="location-name">
											{appointment.locationName || 'Sin ubicación'}
										</div>
										<div class="location-address">
											{appointment.locationAddress || 'Sin dirección'}
										</div>
									</div>
								</td>
								<td class="col-datetime">
									<div class="datetime-info">
										<div class="appointment-date">
											{formatDate(appointment.dateTime)}
										</div>
										<div class="appointment-time">
											{formatTime(appointment.dateTime)}
										</div>
									</div>
								</td>
								<td class="col-reason">
									<div class="reason-info">
										<div class="appointment-type">
											{formatType(appointment.type)}
										</div>
										{#if appointment.notes}
											<div class="appointment-notes">{appointment.notes}</div>
										{/if}
									</div>
								</td>
								<td class="col-status">
									<span
										class={getStatusBadgeClass(appointment.status)}
										style="background-color: {getStatusColor(
											appointment.status,
										)}"
									>
										{formatStatus(appointment.status)}
									</span>
								</td>
								<td class="col-actions">
									<div class="action-buttons">
										<button
											class="action-btn view"
											on:click={() => showAppointmentDetails(appointment)}
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
												goto(`/appointments/${appointment.id}/edit`)}
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
											on:click={() => handleDelete(appointment)}
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
							d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"
						/>
					</svg>
				</div>
				<div class="stat-content">
					<h3>Total Citas</h3>
					<p class="stat-number">{totalAppointments}</p>
				</div>
			</div>

			<div class="stat-card">
				<div class="stat-icon today">
					<svg viewBox="0 0 24 24">
						<path
							d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"
						/>
					</svg>
				</div>
				<div class="stat-content">
					<h3>Citas Hoy</h3>
					<p class="stat-number">{todayAppointments}</p>
				</div>
			</div>

			<div class="stat-card">
				<div class="stat-icon pending">
					<svg viewBox="0 0 24 24">
						<path
							d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
						/>
					</svg>
				</div>
				<div class="stat-content">
					<h3>Pendientes</h3>
					<p class="stat-number">{pendingAppointments}</p>
				</div>
			</div>

			<div class="stat-card">
				<div class="stat-icon completed">
					<svg viewBox="0 0 24 24">
						<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
					</svg>
				</div>
				<div class="stat-content">
					<h3>Completadas</h3>
					<p class="stat-number">{completedAppointments}</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Appointment Details Modal -->
	{#if showDetails && selectedAppointment}
		<div class="modal-overlay" on:click={closeDetails}>
			<div class="modal-content" on:click|stopPropagation>
				<div class="modal-header">
					<h2>Detalles de la Cita</h2>
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
						<h3>Información del Paciente</h3>
						<div class="detail-grid">
							<div class="detail-item">
								<label>Nombre:</label>
								<span>{selectedAppointment.patientName || 'Sin nombre'}</span>
							</div>
							<div class="detail-item">
								<label>ID del Paciente:</label>
								<span>{selectedAppointment.patientId}</span>
							</div>
						</div>
					</div>

					<div class="detail-section">
						<h3>Información de la Ubicación</h3>
						<div class="detail-grid">
							<div class="detail-item">
								<label>Clínica:</label>
								<span>{selectedAppointment.locationName || 'Sin nombre'}</span>
							</div>
							<div class="detail-item">
								<label>Dirección:</label>
								<span>{selectedAppointment.locationAddress || 'Sin dirección'}</span
								>
							</div>
						</div>
					</div>

					<div class="detail-section">
						<h3>Detalles de la Cita</h3>
						<div class="detail-grid">
							<div class="detail-item">
								<label>Fecha y Hora:</label>
								<span>{formatDateTime(selectedAppointment.dateTime)}</span>
							</div>
							<div class="detail-item">
								<label>Duración:</label>
								<span>{selectedAppointment.durationMinutes} minutos</span>
							</div>
							<div class="detail-item">
								<label>Tipo:</label>
								<span>{formatType(selectedAppointment.type)}</span>
							</div>
							<div class="detail-item">
								<label>Estado:</label>
								<span
									class={getStatusBadgeClass(selectedAppointment.status)}
									style="background-color: {getStatusColor(
										selectedAppointment.status,
									)}"
								>
									{formatStatus(selectedAppointment.status)}
								</span>
							</div>
							<div class="detail-item">
								<label>Estado de Pago:</label>
								<span>{formatPaymentStatus(selectedAppointment.paymentStatus)}</span
								>
							</div>
							{#if selectedAppointment.paymentRef}
								<div class="detail-item">
									<label>Referencia de Pago:</label>
									<span>{selectedAppointment.paymentRef}</span>
								</div>
							{/if}
						</div>
						{#if selectedAppointment.notes}
							<div class="detail-item full-width">
								<label>Notas:</label>
								<span>{selectedAppointment.notes}</span>
							</div>
						{/if}
					</div>

					{#if selectedAppointment.productIds && selectedAppointment.productIds.length > 0}
						<div class="detail-section">
							<h3>Productos Aplicados</h3>
							<div class="products-list">
								{#each selectedAppointment.productIds as productId}
									<div class="product-item">
										<span class="product-name">{getProductName(productId)}</span
										>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>
				<div class="modal-footer">
					<button class="btn btn-secondary" on:click={closeDetails}>Cerrar</button>
					<button
						class="btn btn-primary"
						on:click={() => {
							const appointmentId = selectedAppointment?.id;
							if (appointmentId) {
								closeDetails();
								goto(`/appointments/${appointmentId}/edit`);
							}
						}}
					>
						Editar Cita
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	/* Appointments specific styles */
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

	.table-scroll-wrapper {
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}

	.appointments-table {
		width: 100%;
		border-collapse: collapse;
	}

	.appointments-table th {
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

	.appointments-table td {
		padding: var(--spacing-4);
		border-bottom: 1px solid var(--neutral-100);
		vertical-align: middle;
	}

	.appointments-table tbody tr {
		transition: background-color var(--transition-fast);
	}

	.appointments-table tbody tr:hover {
		background-color: var(--neutral-50);
	}

	.patient-info,
	.location-info,
	.datetime-info,
	.reason-info {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-1);
	}

	.patient-name,
	.location-name {
		font-weight: var(--font-weight-semibold);
		color: var(--neutral-900);
	}

	.patient-id,
	.location-address,
	.appointment-time,
	.appointment-notes {
		font-size: var(--font-size-sm);
		color: var(--neutral-500);
	}

	.appointment-date {
		font-weight: var(--font-weight-medium);
		color: var(--neutral-700);
	}

	.appointment-type {
		font-weight: var(--font-weight-medium);
		color: var(--neutral-800);
	}

	.status-badge {
		display: inline-block;
		padding: var(--spacing-1) var(--spacing-3);
		border-radius: var(--radius-full);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-medium);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: white;
	}

	.action-btn.view {
		background-color: var(--secondary-500);
	}

	.action-btn.view:hover {
		background-color: var(--secondary-600);
		transform: scale(1.05);
	}

	.stat-icon.today {
		background: linear-gradient(135deg, var(--primary-100) 0%, var(--primary-200) 100%);
	}

	.stat-icon.today svg {
		color: var(--primary-600);
	}

	.stat-icon.pending {
		background: linear-gradient(135deg, var(--warning-100) 0%, var(--warning-200) 100%);
	}

	.stat-icon.pending svg {
		color: var(--warning-600);
	}

	.stat-icon.completed {
		background: linear-gradient(135deg, var(--success-100) 0%, var(--success-200) 100%);
	}

	.stat-icon.completed svg {
		color: var(--success-600);
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
		max-width: 600px;
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

	.products-list {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-2);
	}

	.product-item {
		padding: var(--spacing-3);
		background-color: var(--neutral-50);
		border-radius: var(--radius-md);
		border-left: 3px solid var(--primary-500);
	}

	.product-name {
		font-weight: var(--font-weight-medium);
		color: var(--neutral-800);
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

		/* Hide less important columns on mobile */
		.col-location,
		.col-reason {
			display: none;
		}

		/* Ensure minimum table width for scrolling */
		.appointments-table {
			min-width: 600px;
		}
	}

	@media (max-width: 480px) {
		/* Hide more columns on very small screens */
		.col-datetime {
			display: none;
		}

		.appointments-table {
			min-width: 400px;
		}
	}
</style>
