<script lang="ts">
	import { onMount } from 'svelte';
	import type { Location } from '../../types';
	import { db } from '$lib/firebase/vaqmas';
	import { getDocs, query, collection, orderBy, deleteDoc, doc } from 'firebase/firestore';

	let locations: Location[] = [];
	let loading = true;
	let searchTerm = '';
	let selectedLocation: Location | null = null;
	let showDetails = false;

	onMount(async () => {
		await loadLocations();
	});

	const loadLocations = async () => {
		loading = true;
		try {
			const locationsSnapshot = await getDocs(
				query(collection(db, 'locations'), orderBy('createdAt', 'desc')),
			);
			locations = locationsSnapshot.docs.map((doc) => ({
				id: doc.id,
				...doc.data(),
				createdAt: doc.data().createdAt?.toDate() || new Date(),
			})) as Location[];
		} catch (error) {
			console.error('Error loading locations:', error);
		} finally {
			loading = false;
		}
	};

	const handleDelete = async (location: Location) => {
		if (confirm(`¿Estás seguro de que quieres eliminar la ubicación "${location.name}"?`)) {
			try {
				await deleteDoc(doc(db, 'locations', location.id));
				await loadLocations();
			} catch (error) {
				console.error('Error deleting location:', error);
				alert('Error al eliminar la ubicación');
			}
		}
	};

	const showLocationDetails = (location: Location) => {
		selectedLocation = location;
		showDetails = true;
	};

	const closeDetails = () => {
		showDetails = false;
		selectedLocation = null;
	};

	const formatDate = (date: Date | null) => {
		if (!date) return 'No especificada';
		return date.toLocaleDateString('es-CO', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});
	};

	// Filter locations based on search
	$: filteredLocations = locations.filter((location) => {
		const matchesSearch =
			location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			location.address.toLowerCase().includes(searchTerm.toLowerCase());

		return matchesSearch;
	});

	// Calculate statistics
	$: totalLocations = locations.length;
	$: activeLocations = locations.length; // All locations are considered active
</script>

<div class="locations-page">
	<div class="page-header">
		<div class="header-content">
			<div class="header-logo">
				<img src="/images/logo.png" alt="VAQ+ Logo" class="header-logo-image" />
				<div class="header-text">
					<h1>Gestión de Ubicaciones</h1>
					<p>Administra las clínicas y ubicaciones de atención médica</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Search and Actions -->
	<div class="actions-bar">
		<div class="search-container">
			<svg class="search-icon" viewBox="0 0 24 24">
				<path
					d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
				/>
			</svg>
			<input
				type="text"
				placeholder="Buscar ubicaciones por nombre o dirección..."
				bind:value={searchTerm}
				class="search-input"
			/>
		</div>

		<button class="create-btn" on:click={() => (window.location.href = '/locations/create')}>
			<svg viewBox="0 0 24 24">
				<path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
			</svg>
			Nueva Ubicación
		</button>
	</div>

	<!-- Locations Table -->
	<div class="table-container">
		{#if loading}
			<div class="loading-state">
				<div class="spinner" />
				<p>Cargando ubicaciones...</p>
			</div>
		{:else if filteredLocations.length === 0}
			<div class="empty-state">
				<svg viewBox="0 0 24 24">
					<path
						d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
					/>
				</svg>
				<p>No se encontraron ubicaciones</p>
				{#if searchTerm}
					<p class="empty-subtitle">Intenta con otros términos de búsqueda</p>
				{/if}
			</div>
		{:else}
			<table class="locations-table">
				<thead>
					<tr>
						<th>Ubicación</th>
						<th>Dirección</th>
						<th>Fecha de Creación</th>
						<th>Acciones</th>
					</tr>
				</thead>
				<tbody>
					{#each filteredLocations as location (location.id)}
						<tr class="location-row">
							<td>
								<div class="location-info">
									<div class="location-icon">
										<svg viewBox="0 0 24 24">
											<path
												d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
											/>
										</svg>
									</div>
									<div class="location-details">
										<div class="location-name">{location.name}</div>
									</div>
								</div>
							</td>
							<td>
								<div class="address-info">
									<div class="address-text">{location.address}</div>
								</div>
							</td>
							<td>
								<div class="date-info">
									<div class="create-date">{formatDate(location.createdAt)}</div>
								</div>
							</td>
							<td>
								<div class="action-buttons">
									<button
										class="action-btn view"
										on:click={() => showLocationDetails(location)}
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
											(window.location.href = `/locations/${location.id}/edit`)}
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
										on:click={() => handleDelete(location)}
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
		{/if}
	</div>

	<!-- Stats Cards -->
	<div class="stats-section">
		<div class="stats-grid">
			<div class="stat-card">
				<div class="stat-icon">
					<svg viewBox="0 0 24 24">
						<path
							d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
						/>
					</svg>
				</div>
				<div class="stat-content">
					<h3>Total Ubicaciones</h3>
					<p class="stat-number">{totalLocations}</p>
				</div>
			</div>

			<div class="stat-card">
				<div class="stat-icon active">
					<svg viewBox="0 0 24 24">
						<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
					</svg>
				</div>
				<div class="stat-content">
					<h3>Activas</h3>
					<p class="stat-number">{activeLocations}</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Location Details Modal -->
	{#if showDetails && selectedLocation}
		<div class="modal-overlay" on:click={closeDetails}>
			<div class="modal-content" on:click|stopPropagation>
				<div class="modal-header">
					<h2>Detalles de la Ubicación</h2>
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
								<label>Nombre:</label>
								<span>{selectedLocation.name}</span>
							</div>
							<div class="detail-item">
								<label>Dirección:</label>
								<span>{selectedLocation.address}</span>
							</div>
						</div>
					</div>

					<div class="detail-section">
						<h3>Información del Sistema</h3>
						<div class="detail-grid">
							<div class="detail-item">
								<label>ID de Ubicación:</label>
								<span class="location-id">{selectedLocation.id}</span>
							</div>
							<div class="detail-item">
								<label>Fecha de Creación:</label>
								<span>{formatDate(selectedLocation.createdAt)}</span>
							</div>
						</div>
					</div>
				</div>
				<div class="modal-footer">
					<button class="btn btn-secondary" on:click={closeDetails}>Cerrar</button>
					<button
						class="btn btn-primary"
						on:click={() => {
							if (selectedLocation) {
								closeDetails();
								window.location.href = `/locations/${selectedLocation.id}/edit`;
							}
						}}
					>
						Editar Ubicación
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	/* Locations specific styles */
	.locations-table {
		width: 100%;
		border-collapse: collapse;
	}

	.locations-table th {
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

	.locations-table td {
		padding: var(--spacing-4);
		border-bottom: 1px solid var(--neutral-100);
		vertical-align: middle;
	}

	.locations-table tbody tr {
		transition: background-color var(--transition-fast);
	}

	.locations-table tbody tr:hover {
		background-color: var(--neutral-50);
	}

	.location-info {
		display: flex;
		align-items: center;
		gap: var(--spacing-3);
	}

	.location-icon {
		width: 48px;
		height: 48px;
		border-radius: var(--radius-lg);
		background: linear-gradient(135deg, var(--primary-100) 0%, var(--primary-200) 100%);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.location-icon svg {
		width: 24px;
		height: 24px;
		color: var(--primary-600);
	}

	.location-details {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-1);
	}

	.location-name {
		font-weight: var(--font-weight-semibold);
		color: var(--neutral-900);
		font-size: var(--font-size-base);
	}

	.address-info {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-1);
	}

	.address-text {
		font-weight: var(--font-weight-medium);
		color: var(--neutral-800);
		line-height: 1.4;
	}

	.date-info {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-1);
	}

	.create-date {
		font-size: var(--font-size-sm);
		color: var(--neutral-600);
	}

	.stat-icon.active {
		background: linear-gradient(135deg, var(--success-100) 0%, var(--success-200) 100%);
	}

	.stat-icon.active svg {
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

	.location-id {
		font-family: monospace;
		background-color: var(--neutral-100);
		padding: var(--spacing-1) var(--spacing-2);
		border-radius: var(--radius-md);
		font-size: var(--font-size-sm);
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

		.detail-grid {
			grid-template-columns: 1fr;
		}

		.modal-content {
			margin: var(--spacing-2);
			max-height: 95vh;
		}

		.location-info {
			flex-direction: column;
			align-items: flex-start;
			gap: var(--spacing-2);
		}

		.location-icon {
			width: 40px;
			height: 40px;
		}

		.location-name {
			font-size: var(--font-size-sm);
		}

		.address-text {
			font-size: var(--font-size-sm);
		}
	}
</style>
