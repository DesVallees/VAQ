<script lang="ts">
	import { onMount } from 'svelte';
	import { db } from '$lib/firebase/vaqmas';
	import {
		getDocs,
		collection,
		query,
		where,
		Timestamp,
		orderBy,
		limit,
	} from 'firebase/firestore';

	interface DashboardStats {
		totalUsers: number;
		totalPediatricians: number;
		totalProducts: number;
		totalAppointments: number;
		todayAppointments: number;
		thisWeekAppointments: number;
		totalArticles: number;
		totalLocations: number;
	}

	interface RecentActivity {
		id: string;
		type: 'appointment' | 'user' | 'product' | 'article';
		title: string;
		description: string;
		timestamp: Date;
		status?: string;
	}

	let stats: DashboardStats = {
		totalUsers: 0,
		totalPediatricians: 0,
		totalProducts: 0,
		totalAppointments: 0,
		todayAppointments: 0,
		thisWeekAppointments: 0,
		totalArticles: 0,
		totalLocations: 0,
	};

	let recentActivities: RecentActivity[] = [];
	let isLoading = true;
	let error = '';

	// ---- Debug helpers ----
	const DEBUG = false; // flip to false to silence logs in production
	const dbg = (...args: any[]) => {
		if (DEBUG) console.log('[VAQ+ Dashboard]', ...args);
	};
	const dbe = (...args: any[]) => console.error('[VAQ+ Dashboard ERROR]', ...args);
	const time = (label: string) => {
		if (DEBUG) console.time(label);
	};
	const timeEnd = (label: string) => {
		if (DEBUG) console.timeEnd(label);
	};

	onMount(async () => {
		// Global listeners to capture any unexpected errors
		if (typeof window !== 'undefined') {
			window.addEventListener('error', (e) => {
				dbe('Global error', e.error || e.message, e.filename, e.lineno, e.colno);
			});
			window.addEventListener('unhandledrejection', (e) => {
				dbe('Unhandled promise rejection', e.reason);
			});
		}

		dbg('onMount: start');
		try {
			await loadDashboardData();
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			error = `Error al cargar los datos del panel de control: ${message}`;
			dbe('Dashboard error:', err);
		} finally {
			isLoading = false;
			dbg('onMount: end');
		}
	});

	const loadDashboardData = async () => {
		const LABEL = 'loadDashboardData';
		dbg(`${LABEL}: start`);
		time(LABEL);
		try {
			// Get today's start and end
			const now = new Date();
			const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
			const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

			// Get week's start and end
			const weekStart = new Date(
				now.getFullYear(),
				now.getMonth(),
				now.getDate() - now.getDay(),
			);
			const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

			dbg(
				`${LABEL}: now=${now.toISOString()} todayStart=${todayStart.toISOString()} todayEnd=${todayEnd.toISOString()} weekStart=${weekStart.toISOString()} weekEnd=${weekEnd.toISOString()}`,
			);

			// Helper to wrap each Firestore call with logs
			const wrap = <T>(name: string, fn: () => Promise<T>): Promise<T> => {
				const sub = `${LABEL}:${name}`;
				dbg(`${sub}: start`);
				time(sub);
				return fn()
					.then((res: any) => {
						if (res && typeof (res as any).size === 'number') {
							dbg(`${sub}: success size=${(res as any).size}`);
						} else {
							dbg(`${sub}: success`);
						}
						timeEnd(sub);
						return res;
					})
					.catch((err) => {
						dbe(`${sub}: error`, err);
						timeEnd(sub);
						// tag the error so we know which section failed
						(err as any).__vaq_section = name;
						throw err;
					});
			};

			// Load all stats in parallel with per-query logging
			const usersPromise = wrap('users', () => getDocs(collection(db, 'users')));
			const pediatriciansPromise = wrap('pediatricians', () =>
				getDocs(collection(db, 'pediatricians')),
			);
			const productsPromise = wrap('products', () => getDocs(collection(db, 'products')));
			const appointmentsPromise = wrap('appointments', () =>
				getDocs(collection(db, 'appointments')),
			);
			const todayAppointmentsPromise = wrap('appointmentsToday', () =>
				getDocs(
					query(
						collection(db, 'appointments'),
						where('dateTime', '>=', Timestamp.fromDate(todayStart)),
						where('dateTime', '<', Timestamp.fromDate(todayEnd)),
					),
				),
			);
			const weekAppointmentsPromise = wrap('appointmentsWeek', () =>
				getDocs(
					query(
						collection(db, 'appointments'),
						where('dateTime', '>=', Timestamp.fromDate(weekStart)),
						where('dateTime', '<', Timestamp.fromDate(weekEnd)),
					),
				),
			);
			const articlesPromise = wrap('articles', () => getDocs(collection(db, 'articles')));
			const locationsPromise = wrap('locations', () => getDocs(collection(db, 'locations')));

			const [
				usersSnapshot,
				pediatriciansSnapshot,
				productsSnapshot,
				appointmentsSnapshot,
				todayAppointmentsSnapshot,
				weekAppointmentsSnapshot,
				articlesSnapshot,
				locationsSnapshot,
			] = await Promise.all([
				usersPromise,
				pediatriciansPromise,
				productsPromise,
				appointmentsPromise,
				todayAppointmentsPromise,
				weekAppointmentsPromise,
				articlesPromise,
				locationsPromise,
			]);

			// Update stats
			stats = {
				totalUsers: usersSnapshot.size,
				totalPediatricians: pediatriciansSnapshot.size,
				totalProducts: productsSnapshot.size,
				totalAppointments: appointmentsSnapshot.size,
				todayAppointments: todayAppointmentsSnapshot.size,
				thisWeekAppointments: weekAppointmentsSnapshot.size,
				totalArticles: articlesSnapshot.size,
				totalLocations: locationsSnapshot.size,
			};
			dbg(`${LABEL}: stats updated`, stats);

			// Load recent activities
			await loadRecentActivities();
			dbg(`${LABEL}: end OK`);
		} catch (err) {
			const section = (err as any)?.__vaq_section
				? ` (sección: ${(err as any).__vaq_section})`
				: '';
			dbe(`${LABEL}: failed${section}`, err);
			const message = err instanceof Error ? err.message : String(err);
			error = `Error al cargar los datos del panel de control ${section}: ${message}`;
			throw err; // Let caller know
		} finally {
			timeEnd(LABEL);
		}
	};

	const loadRecentActivities = async () => {
		const LABEL = 'loadRecentActivities';
		dbg(`${LABEL}: start`);
		time(LABEL);
		try {
			const activities: RecentActivity[] = [];

			// Get recent appointments
			const apptLabel = `${LABEL}:recentAppointments`;
			time(apptLabel);
			const recentAppointments = await getDocs(
				query(collection(db, 'appointments'), orderBy('createdAt', 'desc'), limit(5)),
			);
			dbg(`${apptLabel}: snapshot size=${recentAppointments.size}`);
			recentAppointments.forEach((doc) => {
				const data = doc.data();
				try {
					activities.push({
						id: doc.id,
						type: 'appointment',
						title: `Cita: ${data.patientName || 'Paciente'}`,
						description: `${
							data.locationName || 'Ubicación desconocida'
						} - ${formatAppointmentType(data.type)}`,
						timestamp: data.createdAt?.toDate?.() || new Date(),
						status: formatAppointmentStatus(data.status),
					});
				} catch (e) {
					dbe(`${apptLabel}: mapping error for doc ${doc.id}`, e);
				}
			});
			timeEnd(apptLabel);

			// Get recent users
			const usersLabel = `${LABEL}:recentUsers`;
			time(usersLabel);
			const recentUsers = await getDocs(
				query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(3)),
			);
			dbg(`${usersLabel}: snapshot size=${recentUsers.size}`);
			recentUsers.forEach((doc) => {
				const data = doc.data();
				try {
					activities.push({
						id: doc.id,
						type: 'user',
						title: `Nuevo usuario: ${data.displayName || data.email}`,
						description: 'Usuario registrado',
						timestamp: data.createdAt?.toDate?.() || new Date(),
					});
				} catch (e) {
					dbe(`${usersLabel}: mapping error for doc ${doc.id}`, e);
				}
			});
			timeEnd(usersLabel);

			// Sort by timestamp and take top 8
			recentActivities = activities
				.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
				.slice(0, 8);
			dbg(`${LABEL}: activities prepared count=${recentActivities.length}`);
		} catch (err) {
			dbe(`${LABEL}: failed`, err);
			const message = err instanceof Error ? err.message : String(err);
			error = `Error al cargar la actividad reciente: ${message}`;
			throw err;
		} finally {
			timeEnd(LABEL);
		}
	};

	const formatNumber = (num: number) => {
		return new Intl.NumberFormat('es-CO').format(num);
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'scheduled':
				return '#3b82f6';
			case 'completed':
				return '#10b981';
			case 'cancelledByUser':
				return '#ef4444';
			case 'cancelledByClinic':
				return '#f59e0b';
			case 'noShow':
				return '#6b7280';
			default:
				return '#6b7280';
		}
	};

	const getActivityIcon = (type: string) => {
		switch (type) {
			case 'appointment':
				return '📅';
			case 'user':
				return '👤';
			case 'product':
				return '💊';
			case 'article':
				return '📄';
			default:
				return '📋';
		}
	};

	const formatAppointmentType = (type: string) => {
		// Handle both formats: "packageApplication" and "AppointmentType.packageApplication"
		const cleanType = type.includes('.') ? type.split('.').pop() || type : type;

		const typeMap: Record<string, string> = {
			vaccination: 'Vacunación',
			consultation: 'Consulta',
			packageApplication: 'Aplicación de Paquete',
			checkup: 'Revisión',
			followUp: 'Seguimiento',
		};
		return typeMap[cleanType] || cleanType;
	};

	const formatAppointmentStatus = (status: string) => {
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
</script>

<svelte:head>
	<title>VAQ+ Admin - Panel de Control</title>
</svelte:head>

<div class="dashboard">
	<div class="dashboard-header">
		<div class="header-logo">
			<img src="/images/logo.png" alt="VAQ+ Logo" class="header-logo-image" />
			<div class="header-text">
				<h1>Panel de Control</h1>
				<p class="subtitle">Resumen general del sistema VAQ+</p>
			</div>
		</div>
	</div>

	{#if isLoading}
		<div class="loading-container">
			<div class="spinner" />
			<p>Cargando datos...</p>
		</div>
	{:else if error}
		<div class="error-container">
			<p>{error}</p>
			<button on:click={loadDashboardData}>Reintentar</button>
		</div>
	{:else}
		<!-- Stats Cards -->
		<div class="stats-grid">
			<div class="stat-card">
				<div class="stat-icon users">
					<svg viewBox="0 0 24 24">
						<path
							d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"
						/>
					</svg>
				</div>
				<div class="stat-content">
					<h3>Usuarios</h3>
					<p class="stat-number">{formatNumber(stats.totalUsers)}</p>
					<p class="stat-label">Total registrados</p>
				</div>
			</div>

			<div class="stat-card">
				<div class="stat-icon pediatricians">
					<svg viewBox="0 0 24 24">
						<path
							d="M10 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.1 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z"
						/>
					</svg>
				</div>
				<div class="stat-content">
					<h3>Pediatras</h3>
					<p class="stat-number">{formatNumber(stats.totalPediatricians)}</p>
					<p class="stat-label">Activos</p>
				</div>
			</div>

			<div class="stat-card">
				<div class="stat-icon appointments">
					<svg viewBox="0 0 24 24">
						<path
							d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"
						/>
					</svg>
				</div>
				<div class="stat-content">
					<h3>Citas</h3>
					<p class="stat-number">{formatNumber(stats.totalAppointments)}</p>
					<p class="stat-label">Total programadas</p>
				</div>
			</div>

			<div class="stat-card">
				<div class="stat-icon products">
					<svg viewBox="0 0 24 24">
						<path
							d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"
						/>
					</svg>
				</div>
				<div class="stat-content">
					<h3>Productos</h3>
					<p class="stat-number">{formatNumber(stats.totalProducts)}</p>
					<p class="stat-label">Disponibles</p>
				</div>
			</div>
		</div>

		<!-- Quick Stats -->
		<div class="quick-stats">
			<div class="quick-stat">
				<h4>Citas Hoy</h4>
				<p>{formatNumber(stats.todayAppointments)}</p>
			</div>
			<div class="quick-stat">
				<h4>Citas Esta Semana</h4>
				<p>{formatNumber(stats.thisWeekAppointments)}</p>
			</div>
			<div class="quick-stat">
				<h4>Artículos</h4>
				<p>{formatNumber(stats.totalArticles)}</p>
			</div>
			<div class="quick-stat">
				<h4>Ubicaciones</h4>
				<p>{formatNumber(stats.totalLocations)}</p>
			</div>
		</div>

		<!-- Recent Activities -->
		<div class="recent-activities">
			<h2>Actividad Reciente</h2>
			<div class="activities-list">
				{#each recentActivities as activity}
					<div class="activity-item">
						<div class="activity-icon">
							{getActivityIcon(activity.type)}
						</div>
						<div class="activity-content">
							<h4>{activity.title}</h4>
							<p>{activity.description}</p>
							<span class="activity-time">
								{activity.timestamp.toLocaleString('es-CO', {
									day: '2-digit',
									month: '2-digit',
									hour: '2-digit',
									minute: '2-digit',
								})}
							</span>
						</div>
						{#if activity.status}
							<div
								class="activity-status"
								style="background-color: {getStatusColor(activity.status)}"
							>
								{activity.status}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.dashboard {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 1rem;
	}

	.dashboard-header {
		margin-bottom: 2rem;
	}

	.dashboard-header h1 {
		margin: 0 0 0.5rem 0;
		font-size: 2rem;
		font-weight: 700;
		color: #1e3a8a;
	}

	.subtitle {
		margin: 0;
		color: #6b7280;
		font-size: 1rem;
	}

	.loading-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 4rem;
	}

	.spinner {
		width: 50px;
		height: 50px;
		border: 3px solid #e5e7eb;
		border-top: 3px solid #667eea;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 1rem;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	.error-container {
		text-align: center;
		padding: 2rem;
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 12px;
		color: #dc2626;
	}

	.error-container button {
		margin-top: 1rem;
		padding: 0.5rem 1rem;
		background: #dc2626;
		color: white;
		border: none;
		border-radius: 6px;
		cursor: pointer;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1.5rem;
		margin-bottom: 2rem;
	}

	.stat-card {
		background: white;
		padding: 1.5rem;
		border-radius: 12px;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
		display: flex;
		align-items: center;
		gap: 1rem;
		transition: transform 0.2s ease, box-shadow 0.2s ease;
	}

	.stat-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1);
	}

	.stat-icon {
		width: 60px;
		height: 60px;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.stat-icon svg {
		width: 30px;
		height: 30px;
		fill: white;
	}

	.stat-icon.users {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	}

	.stat-icon.pediatricians {
		background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
	}

	.stat-icon.appointments {
		background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
	}

	.stat-icon.products {
		background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
	}

	.stat-content h3 {
		margin: 0 0 0.5rem 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.stat-number {
		margin: 0 0 0.25rem 0;
		font-size: 1.875rem;
		font-weight: 700;
		color: #1f2937;
	}

	.stat-label {
		margin: 0;
		font-size: 0.75rem;
		color: #9ca3af;
	}

	.quick-stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.quick-stat {
		background: white;
		padding: 1rem;
		border-radius: 8px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
		text-align: center;
	}

	.quick-stat h4 {
		margin: 0 0 0.5rem 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: #6b7280;
	}

	.quick-stat p {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 700;
		color: #1f2937;
	}

	.recent-activities {
		background: white;
		padding: 1.5rem;
		border-radius: 12px;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
	}

	.recent-activities h2 {
		margin: 0 0 1.5rem 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: #1f2937;
	}

	.activities-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.activity-item {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		border-radius: 8px;
		background: #f9fafb;
		transition: background-color 0.2s ease;
	}

	.activity-item:hover {
		background: #f3f4f6;
	}

	.activity-icon {
		font-size: 1.5rem;
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: white;
		border-radius: 8px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
	}

	.activity-content {
		flex: 1;
	}

	.activity-content h4 {
		margin: 0 0 0.25rem 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: #1f2937;
	}

	.activity-content p {
		margin: 0 0 0.25rem 0;
		font-size: 0.75rem;
		color: #6b7280;
	}

	.activity-time {
		font-size: 0.75rem;
		color: #9ca3af;
	}

	.activity-status {
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 600;
		color: white;
		text-transform: capitalize;
	}

	@media (max-width: 768px) {
		.stats-grid {
			grid-template-columns: 1fr;
		}

		.quick-stats {
			grid-template-columns: repeat(2, 1fr);
		}

		.activity-item {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}

		.activity-status {
			align-self: flex-end;
		}
	}
</style>
