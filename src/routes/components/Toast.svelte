<script lang="ts">
	import { onMount } from 'svelte';
	import { toastStore, type Toast } from '../stores/toast';

	let toasts: Toast[] = [];

	const unsubscribe = toastStore.subscribe((value) => {
		toasts = value;
	});

	onMount(() => {
		return unsubscribe;
	});

	const removeToast = (id: string) => {
		toastStore.remove(id);
	};

	const getIcon = (type: Toast['type']) => {
		switch (type) {
			case 'success':
				return 'M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z';
			case 'error':
				return 'M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z';
			case 'warning':
				return 'M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z';
			case 'info':
				return 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z';
			default:
				return '';
		}
	};
</script>

<div class="toast-container">
	{#each toasts as toast (toast.id)}
		<div
			class="toast"
			class:toast-success={toast.type === 'success'}
			class:toast-error={toast.type === 'error'}
			class:toast-warning={toast.type === 'warning'}
			class:toast-info={toast.type === 'info'}
			role="alert"
			aria-live="polite"
		>
			<div class="toast-content">
				<svg class="toast-icon" viewBox="0 0 20 20" fill="currentColor">
					<path
						fill-rule="evenodd"
						d={getIcon(toast.type)}
						clip-rule="evenodd"
					/>
				</svg>
				<p class="toast-message">{toast.message}</p>
			</div>
			<button
				class="toast-close"
				on:click={() => removeToast(toast.id)}
				aria-label="Cerrar notificación"
			>
				<svg viewBox="0 0 20 20" fill="currentColor">
					<path
						fill-rule="evenodd"
						d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
						clip-rule="evenodd"
					/>
				</svg>
			</button>
		</div>
	{/each}
</div>

<style>
	.toast-container {
		position: fixed;
		top: 1.5rem;
		right: 1.5rem;
		z-index: 10000;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		max-width: 420px;
		width: calc(100% - 3rem);
		pointer-events: none;
	}

	.toast {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.25rem;
		border-radius: 12px;
		box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
		backdrop-filter: blur(10px);
		background: white;
		border: 1px solid rgba(0, 0, 0, 0.05);
		animation: slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		pointer-events: auto;
		position: relative;
		overflow: hidden;
	}

	.toast::before {
		content: '';
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		width: 4px;
		background: currentColor;
	}

	.toast-content {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex: 1;
		min-width: 0;
	}

	.toast-icon {
		width: 20px;
		height: 20px;
		flex-shrink: 0;
	}

	.toast-message {
		margin: 0;
		font-size: 0.9375rem;
		line-height: 1.5;
		color: var(--color-text-primary, #1f2937);
		font-weight: 500;
	}

	.toast-close {
		background: none;
		border: none;
		padding: 0.25rem;
		cursor: pointer;
		color: var(--color-text-secondary, #6b7280);
		opacity: 0.6;
		transition: opacity 0.2s ease, color 0.2s ease;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
		margin-left: 0.5rem;
	}

	.toast-close:hover {
		opacity: 1;
		color: var(--color-text-primary, #1f2937);
		background: rgba(0, 0, 0, 0.05);
	}

	.toast-close svg {
		width: 16px;
		height: 16px;
	}

	/* Toast Type Styles */
	.toast-success {
		color: #10b981;
		background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%);
		border-color: rgba(16, 185, 129, 0.2);
	}

	.toast-success .toast-icon {
		color: #10b981;
	}

	.toast-error {
		color: #ef4444;
		background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%);
		border-color: rgba(239, 68, 68, 0.2);
	}

	.toast-error .toast-icon {
		color: #ef4444;
	}

	.toast-warning {
		color: #f59e0b;
		background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%);
		border-color: rgba(245, 158, 11, 0.2);
	}

	.toast-warning .toast-icon {
		color: #f59e0b;
	}

	.toast-info {
		color: #3b82f6;
		background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%);
		border-color: rgba(59, 130, 246, 0.2);
	}

	.toast-info .toast-icon {
		color: #3b82f6;
	}

	/* Animations */
	@keyframes slideInRight {
		from {
			transform: translateX(100%);
			opacity: 0;
		}
		to {
			transform: translateX(0);
			opacity: 1;
		}
	}

	/* Responsive */
	@media (max-width: 768px) {
		.toast-container {
			top: 1rem;
			right: 1rem;
			left: 1rem;
			max-width: none;
			width: auto;
		}

		.toast {
			padding: 0.875rem 1rem;
		}

		.toast-message {
			font-size: 0.875rem;
		}
	}
</style>

