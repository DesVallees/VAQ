<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import type { Pediatrician } from '../../types';
	import { db } from '$lib/firebase/vaqmas';
	import { getDocs, query, collection, orderBy, deleteDoc, doc } from 'firebase/firestore';

	let pediatricians: Pediatrician[] = [];
	let loading = true;
	let searchTerm = '';
	let specialtyFilter = 'all';
	let selectedPediatrician: Pediatrician | null = null;
	let showDetails = false;

	const STORAGE_KEY = 'pediatricians-filters';

	// Save to sessionStorage
	function saveToStorage() {
		if (typeof window !== 'undefined') {
			sessionStorage.setItem(
				STORAGE_KEY,
				JSON.stringify({
					searchTerm,
					specialtyFilter,
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
					specialtyFilter = parsed.specialtyFilter || 'all';
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
		if (specialtyFilter !== 'all') params.set('specialty', specialtyFilter);

		const queryString = params.toString();
		const newUrl = queryString ? `${$page.url.pathname}?${queryString}` : $page.url.pathname;
		goto(newUrl, { replaceState: true, noScroll: true });
		saveToStorage();
	}

	// Initialize from URL params (priority) or sessionStorage
	function initializeFromURL() {
		const params = $page.url.searchParams;

		// URL params take priority if they exist
		if (params.has('search') || params.has('specialty')) {
			searchTerm = params.get('search') || '';
			specialtyFilter = params.get('specialty') || 'all';
			// Save URL params to storage
			saveToStorage();
		} else {
			// Otherwise load from sessionStorage
			loadFromStorage();
		}
	}

	onMount(async () => {
		initializeFromURL();
		await loadPediatricians();
	});

	const loadPediatricians = async () => {
		loading = true;
		try {
			const pediatriciansSnapshot = await getDocs(
				query(collection(db, 'pediatricians'), orderBy('createdAt', 'desc')),
			);
			pediatricians = pediatriciansSnapshot.docs.map((doc) => ({
				id: doc.id,
				...doc.data(),
				createdAt: doc.data().createdAt?.toDate() || new Date(),
				lastLoginAt: doc.data().lastLoginAt?.toDate() || null,
			})) as Pediatrician[];
		} catch (error) {
			console.error('Error loading pediatricians:', error);
		} finally {
			loading = false;
		}
	};

	const handleDelete = async (pediatrician: Pediatrician) => {
		if (
			confirm(
				`¿Estás seguro de que quieres eliminar al pediatra "${
					pediatrician.displayName || pediatrician.email
				}"?`,
			)
		) {
			try {
				await deleteDoc(doc(db, 'pediatricians', pediatrician.id));
				await loadPediatricians();
			} catch (error) {
				console.error('Error deleting pediatrician:', error);
				alert('Error al eliminar al pediatra');
			}
		}
	};

	const showPediatricianDetails = (pediatrician: Pediatrician) => {
		selectedPediatrician = pediatrician;
		showDetails = true;
	};

	const closeDetails = () => {
		showDetails = false;
		selectedPediatrician = null;
	};

	const formatDate = (date: Date | null) => {
		if (!date) return 'Nunca';
		return date.toLocaleDateString('es-CO', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});
	};

	const formatDateTime = (date: Date | null) => {
		if (!date) return 'Nunca';
		return date.toLocaleDateString('es-CO', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	};

	// Get unique specialties for filter
	$: specialties = [...new Set(pediatricians.map((p) => p.specialty))];

	// Filter pediatricians based on search and filters
	$: filteredPediatricians = pediatricians.filter((pediatrician) => {
		const matchesSearch =
			pediatrician.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
			pediatrician.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			false ||
			pediatrician.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
			false ||
			pediatrician.licenseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
			false;

		const matchesSpecialty =
			specialtyFilter === 'all' || pediatrician.specialty === specialtyFilter;

		return matchesSearch && matchesSpecialty;
	});

	// Calculate statistics
	$: totalPediatricians = pediatricians.length;
	$: activePediatricians = pediatricians.filter(
		(p) => p.lastLoginAt && p.lastLoginAt > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
	).length;
	$: adminPediatricians = pediatricians.filter((p) => p.isAdmin).length;
	$: totalSpecialties = specialties.length;
</script>

<div class="pediatricians-page">
	<div class="page-header">
		<div class="header-content">
			<div class="header-logo">
				<img src="/images/logo.png" alt="VAQ+ Logo" class="header-logo-image" />
				<div class="header-text">
					<h1>Gestión de Pediatras</h1>
					<p>Administra perfiles de médicos pediatras y sus especialidades</p>
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
				placeholder="Buscar pediatras por nombre, email, especialidad o licencia..."
				bind:value={searchTerm}
				on:input={() => updateURL()}
				class="search-input"
			/>
		</div>

		<div class="filters-container">
			<select
				bind:value={specialtyFilter}
				class="filter-select"
				on:change={() => updateURL()}
			>
				<option value="all">Todas las especialidades</option>
				{#each specialties as specialty}
					<option value={specialty}>{specialty}</option>
				{/each}
			</select>
		</div>

		<button class="create-btn" on:click={() => goto('/pediatricians/create')}>
			<svg viewBox="0 0 24 24">
				<path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
			</svg>
			Nuevo Pediatra
		</button>
	</div>

	<!-- Pediatricians Table -->
	<div class="table-container">
		{#if loading}
			<div class="loading-state">
				<div class="spinner" />
				<p>Cargando pediatras...</p>
			</div>
		{:else if filteredPediatricians.length === 0}
			<div class="empty-state">
				<svg viewBox="0 0 24 24">
					<path
						d="M10 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z"
					/>
				</svg>
				<p>No se encontraron pediatras</p>
				{#if searchTerm || specialtyFilter !== 'all'}
					<p class="empty-subtitle">Intenta con otros filtros de búsqueda</p>
				{/if}
			</div>
		{:else}
			<div class="table-scroll-wrapper">
				<table class="pediatricians-table">
					<thead>
						<tr>
							<th class="col-pediatrician">Pediatra</th>
							<th class="col-specialty">Especialidad</th>
							<th class="col-license">Licencia</th>
							<th class="col-contact">Contacto</th>
							<th class="col-last-login">Último Acceso</th>
							<th class="col-actions">Acciones</th>
						</tr>
					</thead>
					<tbody>
						{#each filteredPediatricians as pediatrician (pediatrician.id)}
							<tr class="pediatrician-row">
								<td class="col-pediatrician">
									<div class="pediatrician-info">
										<div class="pediatrician-avatar">
											{#if pediatrician.photoUrl}
												<img src={pediatrician.photoUrl} alt="Avatar" />
											{:else}
												<svg viewBox="0 0 24 24">
													<path
														d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
													/>
												</svg>
											{/if}
										</div>
										<div class="pediatrician-details">
											<div class="pediatrician-name">
												{pediatrician.displayName || 'Sin nombre'}
											</div>
											<div class="pediatrician-email">
												{pediatrician.email}
											</div>
										</div>
									</div>
								</td>
								<td class="col-specialty">
									<div class="specialty-info">
										<span class="specialty-badge">{pediatrician.specialty}</span
										>
										{#if pediatrician.yearsExperience}
											<div class="experience">
												{pediatrician.yearsExperience} años de experiencia
											</div>
										{/if}
									</div>
								</td>
								<td class="col-license">
									<div class="license-info">
										<div class="license-number">
											{pediatrician.licenseNumber}
										</div>
									</div>
								</td>
								<td class="col-contact">
									<div class="contact-info">
										{#if pediatrician.phoneNumber}
											<div class="phone-number">
												{pediatrician.phoneNumber}
											</div>
										{:else}
											<div class="no-phone">Sin teléfono</div>
										{/if}
									</div>
								</td>
								<td class="col-last-login">
									<div class="last-login">
										{formatDateTime(pediatrician.lastLoginAt)}
									</div>
								</td>
								<td class="col-actions">
									<div class="action-buttons">
										<button
											class="action-btn view"
											on:click={() => showPediatricianDetails(pediatrician)}
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
												goto(`/pediatricians/${pediatrician.id}/edit`)}
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
											on:click={() => handleDelete(pediatrician)}
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
							d="M10 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z"
						/>
					</svg>
				</div>
				<div class="stat-content">
					<h3>Total Pediatras</h3>
					<p class="stat-number">{totalPediatricians}</p>
				</div>
			</div>

			<div class="stat-card">
				<div class="stat-icon active">
					<svg viewBox="0 0 24 24">
						<path
							d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
						/>
					</svg>
				</div>
				<div class="stat-content">
					<h3>Activos</h3>
					<p class="stat-number">{activePediatricians}</p>
				</div>
			</div>

			<div class="stat-card">
				<div class="stat-icon specialties">
					<svg viewBox="0 0 24 24">
						<path
							d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"
						/>
					</svg>
				</div>
				<div class="stat-content">
					<h3>Especialidades</h3>
					<p class="stat-number">{totalSpecialties}</p>
				</div>
			</div>

			<div class="stat-card">
				<div class="stat-icon admins">
					<svg viewBox="0 0 24 24">
						<path
							d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"
						/>
					</svg>
				</div>
				<div class="stat-content">
					<h3>Administradores</h3>
					<p class="stat-number">{adminPediatricians}</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Pediatrician Details Modal -->
	{#if showDetails && selectedPediatrician}
		<div class="modal-overlay" on:click={closeDetails}>
			<div class="modal-content" on:click|stopPropagation>
				<div class="modal-header">
					<h2>Detalles del Pediatra</h2>
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
								<label>Email:</label>
								<span>{selectedPediatrician.email}</span>
							</div>
							<div class="detail-item">
								<label>Nombre:</label>
								<span>{selectedPediatrician.displayName || 'Sin nombre'}</span>
							</div>
							<div class="detail-item">
								<label>Especialidad:</label>
								<span>{selectedPediatrician.specialty}</span>
							</div>
							<div class="detail-item">
								<label>Es Administrador:</label>
								<span>{selectedPediatrician.isAdmin ? 'Sí' : 'No'}</span>
							</div>
						</div>
					</div>

					<div class="detail-section">
						<h3>Información Profesional</h3>
						<div class="detail-grid">
							<div class="detail-item">
								<label>Número de Licencia:</label>
								<span>{selectedPediatrician.licenseNumber}</span>
							</div>
							<div class="detail-item">
								<label>Años de Experiencia:</label>
								<span
									>{selectedPediatrician.yearsExperience ||
										'No especificado'}</span
								>
							</div>
							<div class="detail-item">
								<label>Clínicas Asignadas:</label>
								<span
									>{selectedPediatrician.clinicLocationIds?.length || 0} clínicas</span
								>
							</div>
						</div>
					</div>

					<div class="detail-section">
						<h3>Información de Contacto</h3>
						<div class="detail-grid">
							<div class="detail-item">
								<label>Teléfono:</label>
								<span>{selectedPediatrician.phoneNumber || 'No especificado'}</span>
							</div>
						</div>
					</div>

					<div class="detail-section">
						<h3>Información de la Cuenta</h3>
						<div class="detail-grid">
							<div class="detail-item">
								<label>Fecha de Registro:</label>
								<span>{formatDate(selectedPediatrician.createdAt)}</span>
							</div>
							<div class="detail-item">
								<label>Último Acceso:</label>
								<span>{formatDateTime(selectedPediatrician.lastLoginAt)}</span>
							</div>
						</div>
					</div>

					{#if selectedPediatrician.bio}
						<div class="detail-section">
							<h3>Biografía</h3>
							<div class="detail-item full-width">
								<label>Descripción:</label>
								<span>{selectedPediatrician.bio}</span>
							</div>
						</div>
					{/if}
				</div>
				<div class="modal-footer">
					<button class="btn btn-secondary" on:click={closeDetails}>Cerrar</button>
					<button
						class="btn btn-primary"
						on:click={() => {
							if (selectedPediatrician) {
								closeDetails();
								goto(`/pediatricians/${selectedPediatrician.id}/edit`);
							}
						}}
					>
						Editar Pediatra
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.table-scroll-wrapper {
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}

	/* Pediatricians specific styles */
	.pediatricians-table {
		width: 100%;
		border-collapse: collapse;
	}

	.pediatricians-table th {
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

	.pediatricians-table td {
		padding: var(--spacing-4);
		border-bottom: 1px solid var(--neutral-100);
		vertical-align: middle;
	}

	.pediatricians-table tbody tr {
		transition: background-color var(--transition-fast);
	}

	.pediatricians-table tbody tr:hover {
		background-color: var(--neutral-50);
	}

	.pediatrician-info {
		display: flex;
		align-items: center;
		gap: var(--spacing-3);
	}

	.pediatrician-avatar {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		overflow: hidden;
		background-color: var(--neutral-200);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.pediatrician-avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.pediatrician-avatar svg {
		width: 24px;
		height: 24px;
		color: var(--neutral-500);
	}

	.pediatrician-details {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-1);
	}

	.pediatrician-name {
		font-weight: var(--font-weight-semibold);
		color: var(--neutral-900);
	}

	.pediatrician-email {
		font-size: var(--font-size-sm);
		color: var(--neutral-600);
	}

	.specialty-info {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-2);
		align-items: flex-start;
	}

	.specialty-badge {
		display: inline-block;
		padding: var(--spacing-1) var(--spacing-3);
		background-color: var(--secondary-500);
		color: white;
		border-radius: var(--radius-full);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-medium);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.experience {
		font-size: var(--font-size-sm);
		color: var(--neutral-500);
	}

	.license-info {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-1);
	}

	.license-number {
		font-weight: var(--font-weight-medium);
		color: var(--neutral-800);
		font-family: monospace;
	}

	.contact-info {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-1);
	}

	.phone-number {
		font-weight: var(--font-weight-medium);
		color: var(--neutral-800);
	}

	.no-phone {
		font-size: var(--font-size-sm);
		color: var(--neutral-400);
		font-style: italic;
	}

	.last-login {
		font-size: var(--font-size-sm);
		color: var(--neutral-600);
	}

	.stat-icon.active {
		background: linear-gradient(135deg, var(--success-100) 0%, var(--success-200) 100%);
	}

	.stat-icon.active svg {
		color: var(--success-600);
	}

	.stat-icon.specialties {
		background: linear-gradient(135deg, var(--primary-100) 0%, var(--primary-200) 100%);
	}

	.stat-icon.specialties svg {
		color: var(--primary-600);
	}

	.stat-icon.admins {
		background: linear-gradient(135deg, var(--warning-100) 0%, var(--warning-200) 100%);
	}

	.stat-icon.admins svg {
		color: var(--warning-600);
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

		.pediatrician-info {
			flex-direction: column;
			align-items: flex-start;
			gap: var(--spacing-2);
		}

		.pediatrician-avatar {
			width: 40px;
			height: 40px;
		}

		/* Hide less important columns on mobile */
		.col-license,
		.col-contact {
			display: none;
		}

		/* Ensure minimum table width for scrolling */
		.pediatricians-table {
			min-width: 600px;
		}
	}

	@media (max-width: 480px) {
		/* Hide more columns on very small screens */
		.col-specialty,
		.col-last-login {
			display: none;
		}

		.pediatricians-table {
			min-width: 400px;
		}
	}
</style>
