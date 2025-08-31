<script lang="ts">
	import { onMount } from 'svelte';
	import { getDocs, query, collection, orderBy, deleteDoc, doc } from 'firebase/firestore';
	import type { User, UserType } from '../../types';
	import { db } from '$lib/firebase/vaqmas';

	let users: User[] = [];
	let loading = true;
	let searchTerm = '';
	let typeFilter: UserType | 'all' = 'all';
	let adminFilter: boolean | 'all' = 'all';
	let selectedUser: User | null = null;
	let showDetails = false;

	onMount(async () => {
		await loadUsers();
	});

	const loadUsers = async () => {
		loading = true;
		try {
			const usersSnapshot = await getDocs(
				query(collection(db, 'users'), orderBy('createdAt', 'desc')),
			);
			users = usersSnapshot.docs.map((doc) => ({
				id: doc.id,
				...doc.data(),
				createdAt: doc.data().createdAt?.toDate() || new Date(),
				lastLoginAt: doc.data().lastLoginAt?.toDate() || null,
			})) as User[];
		} catch (error) {
			console.error('Error loading users:', error);
		} finally {
			loading = false;
		}
	};

	const handleDelete = async (user: User) => {
		if (
			confirm(
				`¿Estás seguro de que quieres eliminar al usuario "${
					user.displayName || user.email
				}"?`,
			)
		) {
			try {
				await deleteDoc(doc(db, 'users', user.id));
				await loadUsers();
			} catch (error) {
				console.error('Error deleting user:', error);
				alert('Error al eliminar el usuario');
			}
		}
	};

	const showUserDetails = (user: User) => {
		selectedUser = user;
		showDetails = true;
	};

	const closeDetails = () => {
		showDetails = false;
		selectedUser = null;
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

	const formatUserType = (type: UserType) => {
		const typeMap = {
			normal: 'Paciente',
			pediatrician: 'Pediatra',
		};
		return typeMap[type] || type;
	};

	const getUserTypeColor = (type: UserType) => {
		const colorMap = {
			normal: 'var(--primary-500)',
			pediatrician: 'var(--secondary-500)',
		};
		return colorMap[type] || 'var(--neutral-500)';
	};

	const getUserTypeBadgeClass = (type: UserType) => {
		return `type-badge type-${type}`;
	};

	// Filter users based on search and filters
	$: filteredUsers = users.filter((user) => {
		const matchesSearch =
			user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
			user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			false ||
			user.phoneNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			false;

		const matchesType = typeFilter === 'all' || user.userType === typeFilter;
		const matchesAdmin = adminFilter === 'all' || user.isAdmin === adminFilter;

		return matchesSearch && matchesType && matchesAdmin;
	});

	// Calculate statistics
	$: totalUsers = users.length;
	$: normalUsers = users.filter((u) => u.userType === 'normal').length;
	$: pediatricianUsers = users.filter((u) => u.userType === 'pediatrician').length;
	$: adminUsers = users.filter((u) => u.isAdmin).length;
	$: activeUsers = users.filter(
		(u) => u.lastLoginAt && u.lastLoginAt > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
	).length;
</script>

<div class="users-page">
	<div class="page-header">
		<div class="header-content">
			<div class="header-logo">
				<img src="/images/logo.png" alt="VAQ+ Logo" class="header-logo-image" />
				<div class="header-text">
					<h1>Gestión de Usuarios</h1>
					<p>Administra cuentas de usuarios, pediatras y permisos de administrador</p>
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
				placeholder="Buscar usuarios por email, nombre o teléfono..."
				bind:value={searchTerm}
				class="search-input"
			/>
		</div>

		<div class="filters-container">
			<select bind:value={typeFilter} class="filter-select">
				<option value="all">Todos los tipos</option>
				<option value="normal">Pacientes</option>
				<option value="pediatrician">Pediatras</option>
			</select>

			<select bind:value={adminFilter} class="filter-select">
				<option value="all">Todos los roles</option>
				<option value={true}>Solo Administradores</option>
				<option value={false}>Solo Usuarios</option>
			</select>
		</div>

		<button class="create-btn" on:click={() => (window.location.href = '/users/create')}>
			<svg viewBox="0 0 24 24">
				<path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
			</svg>
			Nuevo Usuario
		</button>
	</div>

	<!-- Users Table -->
	<div class="table-container">
		{#if loading}
			<div class="loading-state">
				<div class="spinner" />
				<p>Cargando usuarios...</p>
			</div>
		{:else if filteredUsers.length === 0}
			<div class="empty-state">
				<svg viewBox="0 0 24 24">
					<path
						d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"
					/>
				</svg>
				<p>No se encontraron usuarios</p>
				{#if searchTerm || typeFilter !== 'all' || adminFilter !== 'all'}
					<p class="empty-subtitle">Intenta con otros filtros de búsqueda</p>
				{/if}
			</div>
		{:else}
			<div class="table-scroll-wrapper">
				<table class="users-table">
					<thead>
						<tr>
							<th class="col-user">Usuario</th>
							<th class="col-type">Tipo</th>
							<th class="col-contact">Contacto</th>
							<th class="col-last-login">Último Acceso</th>
							<th class="col-created">Registrado</th>
							<th class="col-actions">Acciones</th>
						</tr>
					</thead>
					<tbody>
						{#each filteredUsers as user (user.id)}
							<tr class="user-row">
								<td class="col-user">
									<div class="user-info">
										<div class="user-avatar">
											{#if user.photoUrl}
												<img src={user.photoUrl} alt="Avatar" />
											{:else}
												<svg viewBox="0 0 24 24">
													<path
														d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
													/>
												</svg>
											{/if}
										</div>
										<div class="user-details">
											<div class="user-name">
												{user.displayName || 'Sin nombre'}
											</div>
											<div class="user-email">{user.email}</div>
										</div>
									</div>
								</td>
								<td class="col-type">
									<div class="user-type-info">
										<span
											class={getUserTypeBadgeClass(user.userType)}
											style="background-color: {getUserTypeColor(
												user.userType,
											)}"
										>
											{formatUserType(user.userType)}
										</span>
										{#if user.isAdmin}
											<span class="admin-badge">Admin</span>
										{/if}
									</div>
								</td>
								<td class="col-contact">
									<div class="contact-info">
										{#if user.phoneNumber}
											<div class="phone-number">{user.phoneNumber}</div>
										{:else}
											<div class="no-phone">Sin teléfono</div>
										{/if}
									</div>
								</td>
								<td class="col-last-login">
									<div class="last-login">
										{formatDateTime(user.lastLoginAt)}
									</div>
								</td>
								<td class="col-created">
									<div class="created-date">
										{formatDate(user.createdAt)}
									</div>
								</td>
								<td class="col-actions">
									<div class="action-buttons">
										<button
											class="action-btn view"
											on:click={() => showUserDetails(user)}
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
												(window.location.href = `/users/${user.id}/edit`)}
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
											on:click={() => handleDelete(user)}
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
							d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"
						/>
					</svg>
				</div>
				<div class="stat-content">
					<h3>Total Usuarios</h3>
					<p class="stat-number">{totalUsers}</p>
				</div>
			</div>

			<div class="stat-card">
				<div class="stat-icon patients">
					<svg viewBox="0 0 24 24">
						<path
							d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
						/>
					</svg>
				</div>
				<div class="stat-content">
					<h3>Pacientes</h3>
					<p class="stat-number">{normalUsers}</p>
				</div>
			</div>

			<div class="stat-card">
				<div class="stat-icon doctors">
					<svg viewBox="0 0 24 24">
						<path
							d="M10 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z"
						/>
					</svg>
				</div>
				<div class="stat-content">
					<h3>Pediatras</h3>
					<p class="stat-number">{pediatricianUsers}</p>
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
					<p class="stat-number">{adminUsers}</p>
				</div>
			</div>
		</div>
	</div>

	<!-- User Details Modal -->
	{#if showDetails && selectedUser}
		<div class="modal-overlay" on:click={closeDetails}>
			<div class="modal-content" on:click|stopPropagation>
				<div class="modal-header">
					<h2>Detalles del Usuario</h2>
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
								<span>{selectedUser.email}</span>
							</div>
							<div class="detail-item">
								<label>Nombre:</label>
								<span>{selectedUser.displayName || 'Sin nombre'}</span>
							</div>
							<div class="detail-item">
								<label>Tipo de Usuario:</label>
								<span
									class={getUserTypeBadgeClass(selectedUser.userType)}
									style="background-color: {getUserTypeColor(
										selectedUser.userType,
									)}"
								>
									{formatUserType(selectedUser.userType)}
								</span>
							</div>
							<div class="detail-item">
								<label>Es Administrador:</label>
								<span>{selectedUser.isAdmin ? 'Sí' : 'No'}</span>
							</div>
						</div>
					</div>

					<div class="detail-section">
						<h3>Información de Contacto</h3>
						<div class="detail-grid">
							<div class="detail-item">
								<label>Teléfono:</label>
								<span>{selectedUser.phoneNumber || 'No especificado'}</span>
							</div>
						</div>
					</div>

					<div class="detail-section">
						<h3>Información de la Cuenta</h3>
						<div class="detail-grid">
							<div class="detail-item">
								<label>Fecha de Registro:</label>
								<span>{formatDate(selectedUser.createdAt)}</span>
							</div>
							<div class="detail-item">
								<label>Último Acceso:</label>
								<span>{formatDateTime(selectedUser.lastLoginAt)}</span>
							</div>
						</div>
					</div>

					{#if selectedUser.userType === 'pediatrician'}
						<div class="detail-section">
							<h3>Perfil de Pediatra</h3>
							<div class="detail-grid">
								<div class="detail-item">
									<label>Especialidad:</label>
									<span>Pediatría</span>
								</div>
								<div class="detail-item">
									<label>Perfiles de Paciente:</label>
									<span
										>{selectedUser.patientProfileIds?.length || 0} perfiles</span
									>
								</div>
							</div>
						</div>
					{:else}
						<div class="detail-section">
							<h3>Perfil de Paciente</h3>
							<div class="detail-grid">
								<div class="detail-item">
									<label>Perfiles de Paciente:</label>
									<span
										>{selectedUser.patientProfileIds?.length || 0} perfiles</span
									>
								</div>
								<div class="detail-item">
									<label>Ubicación Preferida:</label>
									<span
										>{selectedUser.preferredLocationId ||
											'No especificada'}</span
									>
								</div>
							</div>
						</div>
					{/if}
				</div>
				<div class="modal-footer">
					<button class="btn btn-secondary" on:click={closeDetails}>Cerrar</button>
					<button
						class="btn btn-primary"
						on:click={() => {
							if (selectedUser) {
								closeDetails();
								window.location.href = `/users/${selectedUser.id}/edit`;
							}
						}}
					>
						Editar Usuario
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

	/* Users specific styles */
	.users-table {
		width: 100%;
		border-collapse: collapse;
	}

	.users-table th {
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

	.users-table td {
		padding: var(--spacing-4);
		border-bottom: 1px solid var(--neutral-100);
		vertical-align: middle;
	}

	.users-table tbody tr {
		transition: background-color var(--transition-fast);
	}

	.users-table tbody tr:hover {
		background-color: var(--neutral-50);
	}

	.user-info {
		display: flex;
		align-items: center;
		gap: var(--spacing-3);
	}

	.user-avatar {
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

	.user-avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.user-avatar svg {
		width: 24px;
		height: 24px;
		color: var(--neutral-500);
	}

	.user-details {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-1);
	}

	.user-name {
		font-weight: var(--font-weight-semibold);
		color: var(--neutral-900);
	}

	.user-email {
		font-size: var(--font-size-sm);
		color: var(--neutral-600);
	}

	.user-type-info {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-2);
		align-items: flex-start;
	}

	.type-badge {
		display: inline-block;
		padding: var(--spacing-1) var(--spacing-3);
		border-radius: var(--radius-full);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-medium);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: white;
	}

	.admin-badge {
		display: inline-block;
		padding: var(--spacing-1) var(--spacing-2);
		background-color: var(--warning-500);
		color: white;
		border-radius: var(--radius-full);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-medium);
		text-transform: uppercase;
		letter-spacing: 0.05em;
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

	.last-login,
	.created-date {
		font-size: var(--font-size-sm);
		color: var(--neutral-600);
	}

	.stat-icon.patients {
		background: linear-gradient(135deg, var(--primary-100) 0%, var(--primary-200) 100%);
	}

	.stat-icon.patients svg {
		color: var(--primary-600);
	}

	.stat-icon.doctors {
		background: linear-gradient(135deg, var(--secondary-100) 0%, var(--secondary-200) 100%);
	}

	.stat-icon.doctors svg {
		color: var(--secondary-600);
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

		.user-info {
			flex-direction: column;
			align-items: flex-start;
			gap: var(--spacing-2);
		}

		.user-avatar {
			width: 40px;
			height: 40px;
		}

		/* Hide less important columns on mobile */
		.col-contact,
		.col-last-login {
			display: none;
		}

		/* Ensure minimum table width for scrolling */
		.users-table {
			min-width: 600px;
		}
	}

	@media (max-width: 480px) {
		/* Hide more columns on very small screens */
		.col-type {
			display: none;
		}

		.users-table {
			min-width: 400px;
		}
	}
</style>
