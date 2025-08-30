<script lang="ts">
	import { onMount } from 'svelte';
	import { db } from '$lib/firebase/vaqmas';
	import {
		getDocs,
		collection,
		query,
		where,
		orderBy,
		limit,
		Timestamp,
	} from 'firebase/firestore';

	interface AnalyticsData {
		totalUsers: number;
		totalPediatricians: number;
		totalProducts: number;
		totalAppointments: number;
		totalArticles: number;
		totalLocations: number;
		appointmentsThisMonth: number;
		appointmentsThisWeek: number;
		newUsersThisMonth: number;
		revenueThisMonth: number;
		topProducts: Array<{ name: string; count: number }>;
		appointmentsByStatus: Array<{ status: string; count: number }>;
		appointmentsByMonth: Array<{ month: string; count: number }>;
		userGrowth: Array<{ month: string; count: number }>;
	}

	let analyticsData: AnalyticsData = {
		totalUsers: 0,
		totalPediatricians: 0,
		totalProducts: 0,
		totalAppointments: 0,
		totalArticles: 0,
		totalLocations: 0,
		appointmentsThisMonth: 0,
		appointmentsThisWeek: 0,
		newUsersThisMonth: 0,
		revenueThisMonth: 0,
		topProducts: [],
		appointmentsByStatus: [],
		appointmentsByMonth: [],
		userGrowth: [],
	};

	let loading = true;
	let selectedTimeframe = 'month'; // month, quarter, year

	onMount(async () => {
		await loadAnalyticsData();
	});

	const loadAnalyticsData = async () => {
		loading = true;
		try {
			// Load all collections for analytics
			const [
				usersSnapshot,
				pediatriciansSnapshot,
				productsSnapshot,
				appointmentsSnapshot,
				articlesSnapshot,
				locationsSnapshot,
			] = await Promise.all([
				getDocs(collection(db, 'users')),
				getDocs(collection(db, 'pediatricians')),
				getDocs(collection(db, 'products')),
				getDocs(collection(db, 'appointments')),
				getDocs(collection(db, 'articles')),
				getDocs(collection(db, 'locations')),
			]);

			const users = usersSnapshot.docs.map((doc) => ({
				id: doc.id,
				...doc.data(),
				createdAt: doc.data().createdAt?.toDate() || new Date(),
			}));

			const pediatricians = pediatriciansSnapshot.docs.map((doc) => ({
				id: doc.id,
				...doc.data(),
				createdAt: doc.data().createdAt?.toDate() || new Date(),
			}));

			const products = productsSnapshot.docs.map((doc) => ({
				id: doc.id,
				...doc.data(),
				createdAt: doc.data().createdAt?.toDate() || new Date(),
			}));

			const appointments = appointmentsSnapshot.docs.map((doc) => ({
				id: doc.id,
				...doc.data(),
				dateTime: doc.data().dateTime?.toDate() || new Date(),
				createdAt: doc.data().createdAt?.toDate() || new Date(),
			}));

			const articles = articlesSnapshot.docs.map((doc) => ({
				id: doc.id,
				...doc.data(),
				createdAt: doc.data().createdAt?.toDate() || new Date(),
			}));

			const locations = locationsSnapshot.docs.map((doc) => ({
				id: doc.id,
				...doc.data(),
				createdAt: doc.data().createdAt?.toDate() || new Date(),
			}));

			// Calculate analytics
			analyticsData = calculateAnalytics(
				users,
				pediatricians,
				products,
				appointments,
				articles,
				locations,
			);
		} catch (error) {
			console.error('Error loading analytics data:', error);
		} finally {
			loading = false;
		}
	};

	const calculateAnalytics = (
		users: any[],
		pediatricians: any[],
		products: any[],
		appointments: any[],
		articles: any[],
		locations: any[],
	) => {
		const now = new Date();
		const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
		const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

		// Basic counts
		const totalUsers = users.length;
		const totalPediatricians = pediatricians.length;
		const totalProducts = products.length;
		const totalAppointments = appointments.length;
		const totalArticles = articles.length;
		const totalLocations = locations.length;

		// Time-based counts
		const appointmentsThisMonth = appointments.filter((a) => a.dateTime >= thisMonth).length;
		const appointmentsThisWeek = appointments.filter((a) => a.dateTime >= thisWeek).length;
		const newUsersThisMonth = users.filter((u) => u.createdAt >= thisMonth).length;

		// Revenue calculation (placeholder - would need actual payment data)
		const revenueThisMonth = appointmentsThisMonth * 50000; // Assuming average appointment cost of 50,000 COP

		// Top products (placeholder - would need actual usage data)
		const topProducts = products.slice(0, 5).map((p) => ({
			name: p.name,
			count: Math.floor(Math.random() * 100) + 10, // Random data for demo
		}));

		// Appointments by status
		const statusCounts: { [key: string]: number } = {};
		appointments.forEach((a) => {
			statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
		});
		const appointmentsByStatus = Object.entries(statusCounts).map(([status, count]) => ({
			status: formatStatus(status),
			count,
		}));

		// Appointments by month (last 6 months)
		const appointmentsByMonth = [];
		for (let i = 5; i >= 0; i--) {
			const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
			const monthName = month.toLocaleDateString('es-CO', { month: 'short' });
			const monthAppointments = appointments.filter((a) => {
				const appointmentMonth = new Date(
					a.dateTime.getFullYear(),
					a.dateTime.getMonth(),
					1,
				);
				return appointmentMonth.getTime() === month.getTime();
			}).length;
			appointmentsByMonth.push({ month: monthName, count: monthAppointments });
		}

		// User growth (last 6 months)
		const userGrowth = [];
		for (let i = 5; i >= 0; i--) {
			const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
			const monthName = month.toLocaleDateString('es-CO', { month: 'short' });
			const monthUsers = users.filter((u) => {
				const userMonth = new Date(u.createdAt.getFullYear(), u.createdAt.getMonth(), 1);
				return userMonth.getTime() === month.getTime();
			}).length;
			userGrowth.push({ month: monthName, count: monthUsers });
		}

		return {
			totalUsers,
			totalPediatricians,
			totalProducts,
			totalAppointments,
			totalArticles,
			totalLocations,
			appointmentsThisMonth,
			appointmentsThisWeek,
			newUsersThisMonth,
			revenueThisMonth,
			topProducts,
			appointmentsByStatus,
			appointmentsByMonth,
			userGrowth,
		};
	};

	const formatStatus = (status: string) => {
		const statusMap: { [key: string]: string } = {
			scheduled: 'Programada',
			pending: 'Pendiente',
			completed: 'Completada',
			cancelledByUser: 'Cancelada por Usuario',
			cancelledByClinic: 'Cancelada por Clínica',
			noShow: 'No asistió',
			rescheduled: 'Reprogramada',
		};
		return statusMap[status] || status;
	};

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('es-CO', {
			style: 'currency',
			currency: 'COP',
		}).format(amount);
	};

	const getStatusColor = (status: string) => {
		const colorMap: { [key: string]: string } = {
			Programada: 'var(--warning-500)',
			Pendiente: 'var(--primary-500)',
			Completada: 'var(--success-500)',
			'Cancelada por Usuario': 'var(--error-500)',
			'Cancelada por Clínica': 'var(--error-500)',
			'No asistió': 'var(--neutral-500)',
			Reprogramada: 'var(--warning-500)',
		};
		return colorMap[status] || 'var(--neutral-500)';
	};
</script>

<div class="analytics-page">
	<div class="page-header">
		<div class="header-content">
			<div class="header-logo">
				<img src="/images/logo.png" alt="VAQ+ Logo" class="header-logo-image" />
				<div class="header-text">
					<h1>Métricas y Reportes</h1>
					<p>Estadísticas y análisis del sistema VAQ+</p>
				</div>
			</div>
		</div>
	</div>

	{#if loading}
		<div class="loading-state">
			<div class="spinner" />
			<p>Cargando datos...</p>
		</div>
	{:else}
		<!-- Key Metrics Cards -->
		<div class="metrics-section">
			<div class="metrics-grid">
				<div class="metric-card primary">
					<div class="metric-icon">
						<svg viewBox="0 0 24 24">
							<path
								d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63A1.5 1.5 0 0 0 18.54 8H17c-.8 0-1.54.37-2.01.99L12 13l-2.99-4.01A2.5 2.5 0 0 0 7 8H5.46c-.8 0-1.54.37-2.01.99L1 18.5V22h2v-1h14v1h2z"
							/>
						</svg>
					</div>
					<div class="metric-content">
						<h3>Total Usuarios</h3>
						<p class="metric-number">{analyticsData.totalUsers.toLocaleString()}</p>
						<p class="metric-change positive">
							+{analyticsData.newUsersThisMonth} este mes
						</p>
					</div>
				</div>

				<div class="metric-card secondary">
					<div class="metric-icon">
						<svg viewBox="0 0 24 24">
							<path
								d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"
							/>
						</svg>
					</div>
					<div class="metric-content">
						<h3>Total Pediatras</h3>
						<p class="metric-number">{analyticsData.totalPediatricians}</p>
						<p class="metric-change">Especialistas activos</p>
					</div>
				</div>

				<div class="metric-card success">
					<div class="metric-icon">
						<svg viewBox="0 0 24 24">
							<path
								d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"
							/>
						</svg>
					</div>
					<div class="metric-content">
						<h3>Citas del Mes</h3>
						<p class="metric-number">{analyticsData.appointmentsThisMonth}</p>
						<p class="metric-change">
							{analyticsData.appointmentsThisWeek} esta semana
						</p>
					</div>
				</div>

				<div class="metric-card warning">
					<div class="metric-icon">
						<svg viewBox="0 0 24 24">
							<path
								d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
							/>
						</svg>
					</div>
					<div class="metric-content">
						<h3>Ingresos del Mes</h3>
						<p class="metric-number">
							{formatCurrency(analyticsData.revenueThisMonth)}
						</p>
						<p class="metric-change">Estimado basado en citas</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Charts Section -->
		<div class="charts-section">
			<div class="charts-grid">
				<!-- Appointments by Status Chart -->
				<div class="chart-card">
					<div class="chart-header">
						<h3>Citas por Estado</h3>
						<p>Distribución de citas según su estado actual</p>
					</div>
					<div class="chart-content">
						{#if analyticsData.appointmentsByStatus.length > 0}
							<div class="chart-bars">
								{#each analyticsData.appointmentsByStatus as item}
									<div class="chart-bar-item">
										<div class="bar-label">{item.status}</div>
										<div class="bar-container">
											<div
												class="bar-fill"
												style="width: {(item.count /
													Math.max(
														...analyticsData.appointmentsByStatus.map(
															(i) => i.count,
														),
													)) *
													100}%; background-color: {getStatusColor(
													item.status,
												)}"
											/>
										</div>
										<div class="bar-value">{item.count}</div>
									</div>
								{/each}
							</div>
						{:else}
							<div class="no-data">No hay datos de citas disponibles</div>
						{/if}
					</div>
				</div>

				<!-- Appointments by Month Chart -->
				<div class="chart-card">
					<div class="chart-header">
						<h3>Citas por Mes</h3>
						<p>Tendencia de citas en los últimos 6 meses</p>
					</div>
					<div class="chart-content">
						{#if analyticsData.appointmentsByMonth.length > 0}
							<div class="chart-line">
								{#each analyticsData.appointmentsByMonth as item, index}
									<div
										class="line-point"
										style="left: {(index /
											(analyticsData.appointmentsByMonth.length - 1)) *
											100}%"
									>
										<div class="point-value">{item.count}</div>
										<div class="point-label">{item.month}</div>
									</div>
								{/each}
							</div>
						{:else}
							<div class="no-data">No hay datos de citas disponibles</div>
						{/if}
					</div>
				</div>

				<!-- User Growth Chart -->
				<div class="chart-card">
					<div class="chart-header">
						<h3>Crecimiento de Usuarios</h3>
						<p>Nuevos usuarios registrados por mes</p>
					</div>
					<div class="chart-content">
						{#if analyticsData.userGrowth.length > 0}
							<div class="chart-line">
								{#each analyticsData.userGrowth as item, index}
									<div
										class="line-point"
										style="left: {(index /
											(analyticsData.userGrowth.length - 1)) *
											100}%"
									>
										<div class="point-value">{item.count}</div>
										<div class="point-label">{item.month}</div>
									</div>
								{/each}
							</div>
						{:else}
							<div class="no-data">No hay datos de usuarios disponibles</div>
						{/if}
					</div>
				</div>

				<!-- Top Products Chart -->
				<div class="chart-card">
					<div class="chart-header">
						<h3>Productos Más Populares</h3>
						<p>Productos con mayor demanda</p>
					</div>
					<div class="chart-content">
						{#if analyticsData.topProducts.length > 0}
							<div class="chart-list">
								{#each analyticsData.topProducts as item, index}
									<div class="list-item">
										<div class="item-rank">#{index + 1}</div>
										<div class="item-name">{item.name}</div>
										<div class="item-count">{item.count}</div>
									</div>
								{/each}
							</div>
						{:else}
							<div class="no-data">No hay datos de productos disponibles</div>
						{/if}
					</div>
				</div>
			</div>
		</div>

		<!-- Summary Stats -->
		<div class="summary-section">
			<div class="summary-grid">
				<div class="summary-card">
					<h3>Resumen del Sistema</h3>
					<div class="summary-stats">
						<div class="summary-stat">
							<span class="stat-label">Total Productos:</span>
							<span class="stat-value">{analyticsData.totalProducts}</span>
						</div>
						<div class="summary-stat">
							<span class="stat-label">Total Artículos:</span>
							<span class="stat-value">{analyticsData.totalArticles}</span>
						</div>
						<div class="summary-stat">
							<span class="stat-label">Total Ubicaciones:</span>
							<span class="stat-value">{analyticsData.totalLocations}</span>
						</div>
						<div class="summary-stat">
							<span class="stat-label">Total Citas:</span>
							<span class="stat-value">{analyticsData.totalAppointments}</span>
						</div>
					</div>
				</div>

				<div class="summary-card">
					<h3>Actividad Reciente</h3>
					<div class="activity-list">
						<div class="activity-item">
							<div class="activity-icon">
								<svg viewBox="0 0 24 24">
									<path
										d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
									/>
								</svg>
							</div>
							<div class="activity-content">
								<div class="activity-title">Nuevos Usuarios</div>
								<div class="activity-value">
									{analyticsData.newUsersThisMonth} este mes
								</div>
							</div>
						</div>
						<div class="activity-item">
							<div class="activity-icon">
								<svg viewBox="0 0 24 24">
									<path
										d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"
									/>
								</svg>
							</div>
							<div class="activity-content">
								<div class="activity-title">Citas Programadas</div>
								<div class="activity-value">
									{analyticsData.appointmentsThisWeek} esta semana
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	/* Analytics specific styles */
	.metrics-section {
		margin-bottom: var(--spacing-8);
	}

	.metrics-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: var(--spacing-6);
	}

	.metric-card {
		background: white;
		border-radius: var(--radius-xl);
		padding: var(--spacing-6);
		box-shadow: var(--shadow-sm);
		border: 1px solid var(--neutral-200);
		transition: all var(--transition-fast);
		display: flex;
		align-items: center;
		gap: var(--spacing-4);
	}

	.metric-card:hover {
		transform: translateY(-4px);
		box-shadow: var(--shadow-lg);
	}

	.metric-card.primary {
		border-left: 4px solid var(--primary-500);
	}

	.metric-card.secondary {
		border-left: 4px solid var(--secondary-500);
	}

	.metric-card.success {
		border-left: 4px solid var(--success-500);
	}

	.metric-card.warning {
		border-left: 4px solid var(--warning-500);
	}

	.metric-icon {
		width: 56px;
		height: 56px;
		border-radius: var(--radius-xl);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.metric-card.primary .metric-icon {
		background: linear-gradient(135deg, var(--primary-100) 0%, var(--primary-200) 100%);
	}

	.metric-card.secondary .metric-icon {
		background: linear-gradient(135deg, var(--secondary-100) 0%, var(--secondary-200) 100%);
	}

	.metric-card.success .metric-icon {
		background: linear-gradient(135deg, var(--success-100) 0%, var(--success-200) 100%);
	}

	.metric-card.warning .metric-icon {
		background: linear-gradient(135deg, var(--warning-100) 0%, var(--warning-200) 100%);
	}

	.metric-icon svg {
		width: 28px;
		height: 28px;
		color: var(--neutral-700);
	}

	.metric-content {
		flex: 1;
	}

	.metric-content h3 {
		font-size: var(--font-size-sm);
		color: var(--neutral-600);
		margin-bottom: var(--spacing-2);
		font-weight: var(--font-weight-medium);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.metric-number {
		font-size: var(--font-size-3xl);
		font-weight: var(--font-weight-bold);
		color: var(--neutral-900);
		margin: 0 0 var(--spacing-1) 0;
	}

	.metric-change {
		font-size: var(--font-size-sm);
		color: var(--neutral-500);
		margin: 0;
	}

	.metric-change.positive {
		color: var(--success-600);
	}

	/* Charts Section */
	.charts-section {
		margin-bottom: var(--spacing-8);
	}

	.charts-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
		gap: var(--spacing-6);
	}

	.chart-card {
		background: white;
		border-radius: var(--radius-xl);
		padding: var(--spacing-6);
		box-shadow: var(--shadow-sm);
		border: 1px solid var(--neutral-200);
	}

	.chart-header {
		margin-bottom: var(--spacing-6);
	}

	.chart-header h3 {
		font-size: var(--font-size-lg);
		color: var(--neutral-900);
		margin: 0 0 var(--spacing-2) 0;
	}

	.chart-header p {
		color: var(--neutral-600);
		margin: 0;
		font-size: var(--font-size-sm);
	}

	.chart-content {
		min-height: 200px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	/* Bar Chart */
	.chart-bars {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: var(--spacing-3);
	}

	.chart-bar-item {
		display: flex;
		align-items: center;
		gap: var(--spacing-3);
	}

	.bar-label {
		width: 120px;
		font-size: var(--font-size-sm);
		color: var(--neutral-700);
		font-weight: var(--font-weight-medium);
	}

	.bar-container {
		flex: 1;
		height: 24px;
		background-color: var(--neutral-200);
		border-radius: var(--radius-full);
		overflow: hidden;
	}

	.bar-fill {
		height: 100%;
		border-radius: var(--radius-full);
		transition: width var(--transition-normal);
	}

	.bar-value {
		width: 40px;
		text-align: right;
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-semibold);
		color: var(--neutral-700);
	}

	/* Line Chart */
	.chart-line {
		width: 100%;
		height: 200px;
		position: relative;
		border-bottom: 2px solid var(--neutral-200);
		border-left: 2px solid var(--neutral-200);
	}

	.line-point {
		position: absolute;
		bottom: 0;
		transform: translateX(-50%);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--spacing-2);
	}

	.line-point::before {
		content: '';
		width: 12px;
		height: 12px;
		background-color: var(--primary-500);
		border-radius: 50%;
		border: 3px solid white;
		box-shadow: var(--shadow-sm);
	}

	.point-value {
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-semibold);
		color: var(--neutral-700);
		background: white;
		padding: var(--spacing-1) var(--spacing-2);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-sm);
	}

	.point-label {
		font-size: var(--font-size-xs);
		color: var(--neutral-500);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	/* List Chart */
	.chart-list {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: var(--spacing-3);
	}

	.list-item {
		display: flex;
		align-items: center;
		gap: var(--spacing-4);
		padding: var(--spacing-3);
		background-color: var(--neutral-50);
		border-radius: var(--radius-lg);
	}

	.item-rank {
		width: 32px;
		height: 32px;
		background: linear-gradient(135deg, var(--primary-500) 0%, var(--primary-600) 100%);
		color: white;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-bold);
	}

	.item-name {
		flex: 1;
		font-weight: var(--font-weight-medium);
		color: var(--neutral-800);
	}

	.item-count {
		font-weight: var(--font-weight-semibold);
		color: var(--primary-600);
		font-size: var(--font-size-lg);
	}

	.no-data {
		color: var(--neutral-500);
		font-style: italic;
		text-align: center;
	}

	/* Summary Section */
	.summary-section {
		margin-bottom: var(--spacing-8);
	}

	.summary-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
		gap: var(--spacing-6);
	}

	.summary-card {
		background: white;
		border-radius: var(--radius-xl);
		padding: var(--spacing-6);
		box-shadow: var(--shadow-sm);
		border: 1px solid var(--neutral-200);
	}

	.summary-card h3 {
		font-size: var(--font-size-lg);
		color: var(--neutral-900);
		margin: 0 0 var(--spacing-4) 0;
		padding-bottom: var(--spacing-3);
		border-bottom: 1px solid var(--neutral-200);
	}

	.summary-stats {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-3);
	}

	.summary-stat {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--spacing-2) 0;
	}

	.stat-label {
		color: var(--neutral-600);
		font-size: var(--font-size-sm);
	}

	.stat-value {
		font-weight: var(--font-weight-semibold);
		color: var(--neutral-900);
		font-size: var(--font-size-lg);
	}

	.activity-list {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-4);
	}

	.activity-item {
		display: flex;
		align-items: center;
		gap: var(--spacing-3);
		padding: var(--spacing-3);
		background-color: var(--neutral-50);
		border-radius: var(--radius-lg);
	}

	.activity-icon {
		width: 40px;
		height: 40px;
		background: linear-gradient(135deg, var(--primary-100) 0%, var(--primary-200) 100%);
		border-radius: var(--radius-lg);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.activity-icon svg {
		width: 20px;
		height: 20px;
		color: var(--primary-600);
	}

	.activity-content {
		flex: 1;
	}

	.activity-title {
		font-weight: var(--font-weight-medium);
		color: var(--neutral-800);
		margin-bottom: var(--spacing-1);
	}

	.activity-value {
		font-size: var(--font-size-sm);
		color: var(--neutral-600);
	}

	@media (max-width: 768px) {
		.metrics-grid {
			grid-template-columns: 1fr;
		}

		.charts-grid {
			grid-template-columns: 1fr;
		}

		.summary-grid {
			grid-template-columns: 1fr;
		}

		.metric-card {
			flex-direction: column;
			text-align: center;
		}

		.chart-content {
			min-height: 150px;
		}

		.bar-label {
			width: 80px;
			font-size: var(--font-size-xs);
		}

		.bar-value {
			width: 30px;
			font-size: var(--font-size-xs);
		}
	}
</style>
