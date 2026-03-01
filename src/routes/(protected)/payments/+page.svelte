<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import type { Payment, PaymentMethod, PaymentStatus } from '../../types';
	import { db } from '$lib/firebase/vaqmas';
	import {
		getDocs,
		query,
		collection,
		orderBy,
		doc,
		writeBatch,
		serverTimestamp,
	} from 'firebase/firestore';
	import { toastStore } from '../../stores/toast';

	let payments: Payment[] = [];
	let loading = true;
	let searchUserId = '';
	let methodFilter: PaymentMethod | 'all' = 'all';
	let statusFilter: PaymentStatus | 'all' = 'all';
	let dateFilter = 'all';
	let selectedPayment: Payment | null = null;
	let showDetails = false;
	let confirming = false;

	const STORAGE_KEY = 'payments-filters';

	function saveToStorage() {
		if (typeof window !== 'undefined') {
			sessionStorage.setItem(
				STORAGE_KEY,
				JSON.stringify({
					searchUserId,
					methodFilter,
					statusFilter,
					dateFilter,
				}),
			);
		}
	}

	function loadFromStorage() {
		if (typeof window !== 'undefined') {
			const stored = sessionStorage.getItem(STORAGE_KEY);
			if (stored) {
				try {
					const parsed = JSON.parse(stored);
					searchUserId = parsed.searchUserId || '';
					methodFilter = parsed.methodFilter || 'all';
					statusFilter = parsed.statusFilter || 'all';
					dateFilter = parsed.dateFilter || 'all';
				} catch (e) {
					console.error('Error loading from sessionStorage:', e);
				}
			}
		}
	}

	function updateURL() {
		const params = new URLSearchParams();
		if (searchUserId) params.set('userId', searchUserId);
		if (methodFilter !== 'all') params.set('method', methodFilter);
		if (statusFilter !== 'all') params.set('status', statusFilter);
		if (dateFilter !== 'all') params.set('date', dateFilter);
		const queryString = params.toString();
		const newUrl = queryString ? `${$page.url.pathname}?${queryString}` : $page.url.pathname;
		goto(newUrl, { replaceState: true, noScroll: true });
		saveToStorage();
	}

	function initializeFromURL() {
		const params = $page.url.searchParams;
		if (
			params.has('userId') ||
			params.has('method') ||
			params.has('status') ||
			params.has('date')
		) {
			searchUserId = params.get('userId') || '';
			methodFilter = (params.get('method') as PaymentMethod | 'all') || 'all';
			statusFilter = (params.get('status') as PaymentStatus | 'all') || 'all';
			dateFilter = params.get('date') || 'all';
			saveToStorage();
		} else {
			loadFromStorage();
		}
	}

	onMount(async () => {
		initializeFromURL();
		await loadPayments();
	});

	const loadPayments = async () => {
		loading = true;
		try {
			const snapshot = await getDocs(
				query(collection(db, 'payments'), orderBy('createdAt', 'desc')),
			);
			payments = snapshot.docs.map((docSnap) => {
				const data = docSnap.data();
				return {
					paymentId: docSnap.id,
					userId: data.userId ?? '',
					method: (data.method ?? 'CREDIT_CARD') as PaymentMethod,
					status: (data.status ?? 'PENDING') as PaymentStatus,
					amount: data.amount ?? 0,
					currency: data.currency ?? 'COP',
					bill: data.bill,
					refPayco: data.refPayco,
					transactionId: data.transactionId,
					createdAt: data.createdAt?.toDate?.() ?? null,
					updatedAt: data.updatedAt?.toDate?.() ?? null,
					initiatedAt: data.initiatedAt?.toDate?.() ?? null,
					confirmedAt: data.confirmedAt?.toDate?.() ?? null,
					errorMessage: data.errorMessage,
					recipientName: data.recipientName,
					recipientLlave: data.recipientLlave,
					receiptDownloadUrl: data.receiptDownloadUrl,
					appointmentIds: data.appointmentIds ?? [],
					purchaseIds: data.purchaseIds ?? [],
				} as Payment;
			});
		} catch (error) {
			console.error('Error loading payments:', error);
			toastStore.error('Error al cargar pagos');
		} finally {
			loading = false;
		}
	};

	const canConfirmBreB = (p: Payment) =>
		p.method === 'BRE_B' && (p.status === 'PENDING' || p.status === 'PENDING_CONFIRMATION');

	const confirmBreB = async (p: Payment, verified: boolean) => {
		if (!canConfirmBreB(p)) return;
		confirming = true;
		try {
			const newStatus = verified ? 'VERIFIED' : 'REJECTED';
			const batch = writeBatch(db);
			const paymentRef = doc(db, 'payments', p.paymentId);
			batch.update(paymentRef, {
				status: newStatus,
				confirmedAt: serverTimestamp(),
				updatedAt: serverTimestamp(),
			});

			if (verified) {
				const transactionId = p.transactionId ?? p.paymentId;
				for (const appointmentId of p.appointmentIds) {
					batch.update(doc(db, 'appointments', appointmentId), {
						paymentStatus: 'paid',
						paymentRef: p.paymentId,
						lastUpdatedAt: serverTimestamp(),
					});
				}
				for (const purchaseId of p.purchaseIds) {
					batch.update(doc(db, 'users', p.userId, 'purchased', purchaseId), {
						paymentStatus: 'paid',
						transactionId,
					});
				}
			}

			await batch.commit();
			toastStore.success(verified ? 'Pago confirmado correctamente' : 'Pago rechazado');
			if (selectedPayment?.paymentId === p.paymentId) {
				selectedPayment = { ...selectedPayment, status: newStatus };
			}
			await loadPayments();
		} catch (error) {
			console.error('Error confirming payment:', error);
			toastStore.error('Error al confirmar o rechazar el pago');
		} finally {
			confirming = false;
		}
	};

	const showPaymentDetails = (payment: Payment) => {
		selectedPayment = payment;
		showDetails = true;
	};

	const closeDetails = () => {
		showDetails = false;
		selectedPayment = null;
	};

	const formatDate = (d: Date | null) => {
		if (!d || !(d instanceof Date) || isNaN(d.getTime())) return '—';
		return d.toLocaleDateString('es-CO', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	};

	const formatAmount = (amount: number, currency?: string) =>
		new Intl.NumberFormat('es-CO', {
			style: 'currency',
			currency: currency ?? 'COP',
		}).format(amount);

	const formatMethod = (m: PaymentMethod) => (m === 'CREDIT_CARD' ? 'Tarjeta (ePayco)' : 'Bre-B');

	const formatStatus = (s: PaymentStatus) => {
		const map: Record<PaymentStatus, string> = {
			PENDING: 'Pendiente',
			PENDING_CONFIRMATION: 'Pendiente confirmación',
			VERIFIED: 'Verificado',
			REJECTED: 'Rechazado',
			ERROR: 'Error',
		};
		return map[s] ?? s;
	};

	const getStatusColor = (s: PaymentStatus) => {
		const map: Record<PaymentStatus, string> = {
			PENDING: 'var(--warning-500)',
			PENDING_CONFIRMATION: 'var(--primary-500)',
			VERIFIED: 'var(--success-500)',
			REJECTED: 'var(--error-500)',
			ERROR: 'var(--error-500)',
		};
		return map[s] ?? 'var(--neutral-500)';
	};

	$: filteredPayments = payments.filter((p) => {
		if (searchUserId && !p.userId.toLowerCase().includes(searchUserId.toLowerCase()))
			return false;
		if (methodFilter !== 'all' && p.method !== methodFilter) return false;
		if (statusFilter !== 'all' && p.status !== statusFilter) return false;
		if (dateFilter !== 'all' && p.createdAt) {
			const now = new Date();
			const created = p.createdAt instanceof Date ? p.createdAt : new Date(p.createdAt);
			switch (dateFilter) {
				case 'today':
					if (created.toDateString() !== now.toDateString()) return false;
					break;
				case 'week': {
					const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
					if (created < weekAgo) return false;
					break;
				}
				case 'month': {
					const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
					if (created < monthAgo) return false;
					break;
				}
			}
		}
		return true;
	});
</script>

<svelte:head>
	<title>Pagos - VAQ+ Admin</title>
</svelte:head>

<div class="payments-page">
	<div class="page-header">
		<div class="header-content">
			<div class="header-logo">
				<img src="/images/logo.png" alt="VAQ+ Logo" class="header-logo-image" />
				<div class="header-text">
					<h1>Pagos</h1>
					<p>Gestionar pagos (ePayco y Bre-B) y confirmar transferencias</p>
				</div>
			</div>
		</div>
	</div>

	<div class="actions-bar">
		<div class="search-container">
			<svg class="search-icon" viewBox="0 0 24 24">
				<path
					d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
				/>
			</svg>
			<input
				type="text"
				placeholder="Buscar registros de pago..."
				bind:value={searchUserId}
				on:blur={updateURL}
				class="search-input"
			/>
		</div>
		<div class="filters-container">
			<select bind:value={methodFilter} class="filter-select" on:change={() => updateURL()}>
				<option value="all">Todos los métodos</option>
				<option value="CREDIT_CARD">Tarjeta (ePayco)</option>
				<option value="BRE_B">Bre-B</option>
			</select>
			<select bind:value={statusFilter} class="filter-select" on:change={() => updateURL()}>
				<option value="all">Todos los estados</option>
				<option value="PENDING">Pendiente</option>
				<option value="PENDING_CONFIRMATION">Pendiente confirmación</option>
				<option value="VERIFIED">Verificado</option>
				<option value="REJECTED">Rechazado</option>
				<option value="ERROR">Error</option>
			</select>
			<select bind:value={dateFilter} class="filter-select" on:change={() => updateURL()}>
				<option value="all">Todas las fechas</option>
				<option value="today">Hoy</option>
				<option value="week">Esta semana</option>
				<option value="month">Este mes</option>
			</select>
		</div>
	</div>

	<div class="table-container">
		{#if loading}
			<div class="loading-state">
				<div class="spinner" />
				<p>Cargando pagos...</p>
			</div>
		{:else if filteredPayments.length === 0}
			<div class="empty-state">
				<svg viewBox="0 0 24 24">
					<path
						d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"
					/>
				</svg>
				<p>No se encontraron pagos</p>
				{#if searchUserId || methodFilter !== 'all' || statusFilter !== 'all' || dateFilter !== 'all'}
					<p class="empty-subtitle">Intenta con otros filtros</p>
				{/if}
			</div>
		{:else}
			<div class="table-scroll-wrapper">
				<table class="appointments-table payments-table">
					<thead>
						<tr>
							<th class="col-id">ID</th>
							<th class="col-user">Usuario</th>
							<th class="col-method">Método</th>
							<th class="col-amount">Monto</th>
							<th class="col-status">Estado</th>
							<th class="col-date">Fecha</th>
							<th class="col-actions">Acciones</th>
						</tr>
					</thead>
					<tbody>
						{#each filteredPayments as payment (payment.paymentId)}
							<tr class="appointment-row">
								<td class="col-id">
									<span class="payment-id">{payment.paymentId.slice(0, 20)}…</span
									>
								</td>
								<td class="col-user">{payment.userId.slice(0, 12)}…</td>
								<td class="col-method">{formatMethod(payment.method)}</td>
								<td class="col-amount"
									>{formatAmount(payment.amount, payment.currency)}</td
								>
								<td class="col-status">
									<span
										class="status-badge"
										style="background-color: {getStatusColor(payment.status)}"
									>
										{formatStatus(payment.status)}
									</span>
								</td>
								<td class="col-date">{formatDate(payment.createdAt)}</td>
								<td class="col-actions">
									<button
										class="action-btn view"
										title="Ver detalles"
										on:click={() => showPaymentDetails(payment)}
									>
										<svg viewBox="0 0 24 24">
											<path
												d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
											/>
										</svg>
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>

	{#if showDetails && selectedPayment}
		<div
			class="modal-overlay"
			on:click={closeDetails}
			role="button"
			tabindex="0"
			on:keydown={(e) => e.key === 'Escape' && closeDetails()}
		>
			<div
				class="modal-content"
				on:click|stopPropagation
				role="dialog"
				aria-label="Detalles del pago"
			>
				<div class="modal-header">
					<h2>Detalles del pago</h2>
					<button class="modal-close" on:click={closeDetails} type="button">
						<svg viewBox="0 0 24 24">
							<path
								d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
							/>
						</svg>
					</button>
				</div>
				<div class="modal-body">
					<div class="detail-section">
						<h3>General</h3>
						<div class="detail-flex">
							<div class="detail-item">
								<label>ID:</label>
								<span>{selectedPayment.paymentId}</span>
							</div>
							<div class="detail-item">
								<label>Usuario:</label>
								<span>{selectedPayment.userId}</span>
							</div>
							<div class="detail-item">
								<label>Método:</label>
								<span>{formatMethod(selectedPayment.method)}</span>
							</div>
							<div class="detail-item">
								<label>Estado:</label>
								<span
									class="status-badge"
									style="background-color: {getStatusColor(
										selectedPayment.status,
									)}"
								>
									{formatStatus(selectedPayment.status)}
								</span>
							</div>
							<div class="detail-item">
								<label>Monto:</label>
								<span
									>{formatAmount(
										selectedPayment.amount,
										selectedPayment.currency,
									)}</span
								>
							</div>
							<div class="detail-item">
								<label>Creado:</label>
								<span>{formatDate(selectedPayment.createdAt)}</span>
							</div>
							{#if selectedPayment.confirmedAt}
								<div class="detail-item">
									<label>Confirmado:</label>
									<span>{formatDate(selectedPayment.confirmedAt)}</span>
								</div>
							{/if}
							{#if selectedPayment.errorMessage}
								<div class="detail-item full-width">
									<label>Error:</label>
									<span class="error-text">{selectedPayment.errorMessage}</span>
								</div>
							{/if}
						</div>
					</div>
					{#if selectedPayment.appointmentIds.length > 0}
						<div class="detail-section">
							<h3>Citas vinculadas</h3>
							<ul class="id-list">
								{#each selectedPayment.appointmentIds as appointmentId}
									<li>
										<a href="/appointments/{appointmentId}/edit" class="link"
											>{appointmentId}</a
										>
									</li>
								{/each}
							</ul>
						</div>
					{/if}
					{#if selectedPayment.purchaseIds.length > 0}
						<div class="detail-section">
							<h3>Compras vinculadas</h3>
							<ul class="id-list">
								{#each selectedPayment.purchaseIds as purchaseId}
									<li>
										<span>{purchaseId}</span> (usuario: {selectedPayment.userId})
									</li>
								{/each}
							</ul>
						</div>
					{/if}
					{#if canConfirmBreB(selectedPayment)}
						<div class="detail-section confirm-actions">
							<h3>Confirmar Bre-B</h3>
							<div class="button-group">
								<button
									class="confirm-btn verified"
									disabled={confirming}
									on:click={() =>
										selectedPayment && confirmBreB(selectedPayment, true)}
									type="button"
								>
									Confirmar pago
								</button>
								<button
									class="confirm-btn rejected"
									disabled={confirming}
									on:click={() =>
										selectedPayment && confirmBreB(selectedPayment, false)}
									type="button"
								>
									Rechazar
								</button>
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.payments-page {
		padding: 1.5rem;
	}
	.page-header {
		margin-bottom: 1.5rem;
	}
	.header-content {
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	.header-logo {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.header-logo-image {
		height: 48px;
		width: auto;
	}
	.header-text h1 {
		margin: 0;
		font-size: 1.5rem;
	}
	.header-text p {
		margin: 0.25rem 0 0;
		color: var(--neutral-600);
		font-size: 0.9rem;
	}
	.actions-bar {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		align-items: center;
		margin-bottom: 1rem;
	}
	.search-container {
		display: flex;
		align-items: center;
		position: relative;
	}
	.search-icon {
		position: absolute;
		left: 0.75rem;
		width: 20px;
		height: 20px;
		pointer-events: none;
		color: var(--neutral-500);
	}
	.search-input {
		padding: 0.5rem 0.75rem 0.5rem 2.5rem;
		border: 1px solid var(--neutral-300);
		border-radius: 8px;
		min-width: 200px;
	}
	.filters-container {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.filter-select {
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--neutral-300);
		border-radius: 8px;
	}
	.table-container {
		background: var(--neutral-0);
		border-radius: 12px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
		overflow: hidden;
		min-height: 200px;
	}
	.loading-state,
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem;
		gap: 0.5rem;
		color: var(--neutral-600);
	}
	.spinner {
		width: 40px;
		height: 40px;
		border: 3px solid var(--neutral-200);
		border-top-color: var(--primary-500);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	.empty-state svg {
		width: 48px;
		height: 48px;
		color: var(--neutral-400);
	}
	.empty-subtitle {
		font-size: 0.875rem;
	}
	.table-scroll-wrapper {
		overflow-x: auto;
	}
	.payments-table {
		width: 100%;
		border-collapse: collapse;
	}
	.payments-table th,
	.payments-table td {
		padding: 0.75rem 1rem;
		text-align: left;
		border-bottom: 1px solid var(--neutral-200);
	}
	.payments-table th {
		font-weight: 600;
		color: var(--neutral-700);
		background: var(--neutral-50);
	}
	.payment-id {
		font-family: monospace;
		font-size: 0.85rem;
	}
	.status-badge {
		display: inline-block;
		padding: 0.25rem 0.5rem;
		border-radius: 6px;
		color: white;
		font-size: 0.8rem;
		font-weight: 500;
	}
	.action-btn {
		padding: 0.35rem;
		border: none;
		background: transparent;
		cursor: pointer;
		border-radius: 6px;
		color: var(--neutral-600);
	}
	.action-btn:hover {
		background: var(--neutral-100);
		color: var(--primary-600);
	}
	.action-btn svg {
		width: 20px;
		height: 20px;
	}
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.4);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
	}
	.modal-content {
		background: var(--neutral-50);
		border-radius: 12px;
		max-width: 520px;
		width: 100%;
		max-height: 90vh;
		overflow: auto;
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
	}
	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid var(--neutral-200);
	}
	.modal-header h2 {
		margin: 0;
		font-size: 1.25rem;
	}
	.modal-close {
		padding: 0.35rem;
		border: none;
		background: transparent;
		cursor: pointer;
		border-radius: 6px;
		color: var(--neutral-600);
	}
	.modal-close:hover {
		background: var(--neutral-100);
	}
	.modal-close svg {
		width: 24px;
		height: 24px;
	}
	.modal-body {
		padding: 1.25rem;
	}
	.detail-section {
		margin-bottom: 1.25rem;
	}
	.detail-section h3 {
		margin: 0 0 0.5rem;
		font-size: 0.95rem;
		color: var(--neutral-700);
	}
	.detail-flex {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.detail-item {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}
	.detail-item.full-width {
		grid-column: 1 / -1;
	}
	.detail-item label {
		font-size: 0.75rem;
		color: var(--neutral-500);
		text-transform: uppercase;
		letter-spacing: 0.02em;
	}
	.detail-item span {
		font-size: 0.9rem;
	}
	.error-text {
		color: var(--error-600);
	}
	.id-list {
		margin: 0;
		padding-left: 1.25rem;
	}
	.id-list li {
		margin: 0.25rem 0;
	}
	.link {
		color: var(--primary-600);
		text-decoration: none;
	}
	.link:hover {
		text-decoration: underline;
	}
	.confirm-actions .button-group {
		display: flex;
		gap: 0.75rem;
		margin-top: 0.5rem;
	}
	.confirm-btn {
		padding: 0.5rem 1rem;
		border-radius: 8px;
		font-weight: 500;
		cursor: pointer;
		border: none;
	}
	.confirm-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
	.confirm-btn.verified {
		background: var(--success-500);
		color: white;
	}
	.confirm-btn.rejected {
		background: var(--error-500);
		color: white;
	}
</style>
