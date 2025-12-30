<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { auth } from '$lib/firebase/vaqmas';
	import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
	import { toastStore } from '../../stores/toast';

	let isLoading = true;
	let isValidCode = false;
	let errorMessage = '';
	let newPassword = '';
	let confirmPassword = '';
	let isResetting = false;
	let showPassword = false;
	let showConfirmPassword = false;
	let oobCode = '';
	let email = '';

	onMount(async () => {
		const mode = $page.url.searchParams.get('mode');
		const code = $page.url.searchParams.get('oobCode');

		if (!mode || !code) {
			errorMessage =
				'Enlace inválido. Por favor solicita un nuevo enlace de restablecimiento de contraseña.';
			isLoading = false;
			return;
		}

		if (mode !== 'resetPassword') {
			errorMessage =
				'Acción no reconocida. Este enlace no es válido para restablecer contraseña.';
			isLoading = false;
			return;
		}

		oobCode = code;

		try {
			// Verify the password reset code
			email = await verifyPasswordResetCode(auth, oobCode);
			isValidCode = true;
		} catch (error: any) {
			console.error('Password reset verification error:', error);

			// Handle different error cases
			switch (error.code) {
				case 'auth/invalid-action-code':
					errorMessage =
						'Este enlace de restablecimiento de contraseña ha expirado o ya ha sido utilizado. Por favor solicita un nuevo enlace.';
					break;
				case 'auth/expired-action-code':
					errorMessage =
						'Este enlace de restablecimiento de contraseña ha expirado. Por favor solicita un nuevo enlace.';
					break;
				default:
					errorMessage =
						'Error al verificar el enlace. Por favor intenta nuevamente o solicita un nuevo enlace de restablecimiento.';
			}
		} finally {
			isLoading = false;
		}
	});

	const handlePasswordReset = async () => {
		// Validate password fields
		if (!newPassword || !confirmPassword) {
			errorMessage = 'Por favor completa todos los campos';
			return;
		}

		if (newPassword.length < 6) {
			errorMessage = 'La contraseña debe tener al menos 6 caracteres';
			return;
		}

		if (newPassword !== confirmPassword) {
			errorMessage = 'Las contraseñas no coinciden';
			return;
		}

		isResetting = true;
		errorMessage = '';

		try {
			await confirmPasswordReset(auth, oobCode, newPassword);

			// Show success toast
			toastStore.success(
				'Tu contraseña ha sido restablecida exitosamente. Por favor inicia sesión con tu nueva contraseña.',
			);

			// Redirect to login page after a short delay
			setTimeout(() => {
				goto('/login');
			}, 1500);
		} catch (error: any) {
			console.error('Password reset confirmation error:', error);

			// Handle different error cases
			switch (error.code) {
				case 'auth/invalid-action-code':
					errorMessage =
						'Este enlace de restablecimiento ha expirado o ya ha sido utilizado. Por favor solicita un nuevo enlace.';
					break;
				case 'auth/expired-action-code':
					errorMessage =
						'Este enlace de restablecimiento ha expirado. Por favor solicita un nuevo enlace.';
					break;
				case 'auth/weak-password':
					errorMessage =
						'La contraseña es demasiado débil. Por favor elige una contraseña más segura.';
					break;
				default:
					errorMessage =
						'Error al restablecer la contraseña. Por favor intenta nuevamente.';
			}
		} finally {
			isResetting = false;
		}
	};

	const handleKeyPress = (event: KeyboardEvent) => {
		if (event.key === 'Enter' && isValidCode && !isResetting) {
			handlePasswordReset();
		}
	};
</script>

<svelte:head>
	<title>Restablecer Contraseña - VAQ+ Admin</title>
</svelte:head>

<div class="reset-password-container">
	<div class="reset-password-card">
		<div class="reset-password-header">
			<div class="logo">
				<img src="/images/logo.png" alt="VAQ+ Logo" class="logo-image" />
				<div class="logo-text">
					<h1>Restablecer Contraseña</h1>
					<p class="subtitle">VAQ+ Admin</p>
				</div>
			</div>
		</div>

		{#if isLoading}
			<div class="loading-state">
				<div class="spinner" />
				<p>Verificando enlace...</p>
			</div>
		{:else if errorMessage && !isValidCode}
			<div class="error-state">
				<div class="error-icon">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="10" />
						<line x1="12" y1="8" x2="12" y2="12" />
						<line x1="12" y1="16" x2="12.01" y2="16" />
					</svg>
				</div>
				<p class="error-message">{errorMessage}</p>
				<a href="/login" class="back-to-login-link"> ← Volver al inicio de sesión </a>
			</div>
		{:else if isValidCode}
			<div class="reset-form">
				<p class="form-description">
					Ingresa tu nueva contraseña para <strong>{email}</strong>
				</p>

				<form class="password-reset-form" on:submit|preventDefault={handlePasswordReset}>
					<div class="form-group">
						<label for="newPassword">Nueva Contraseña</label>
						<div class="password-input-wrapper">
							{#if showPassword}
								<input
									type="text"
									id="newPassword"
									bind:value={newPassword}
									placeholder="••••••••"
									on:keypress={handleKeyPress}
									disabled={isResetting}
									required
									minlength="6"
								/>
							{:else}
								<input
									type="password"
									id="newPassword"
									bind:value={newPassword}
									placeholder="••••••••"
									on:keypress={handleKeyPress}
									disabled={isResetting}
									required
									minlength="6"
								/>
							{/if}
							<button
								type="button"
								class="password-toggle"
								on:click={() => (showPassword = !showPassword)}
								aria-label={showPassword
									? 'Ocultar contraseña'
									: 'Mostrar contraseña'}
								disabled={isResetting}
							>
								{#if showPassword}
									<svg
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
									>
										<path
											d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
										/>
										<line x1="1" y1="1" x2="23" y2="23" />
									</svg>
								{:else}
									<svg
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
									>
										<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
										<circle cx="12" cy="12" r="3" />
									</svg>
								{/if}
							</button>
						</div>
						<p class="password-hint">Mínimo 6 caracteres</p>
					</div>

					<div class="form-group">
						<label for="confirmPassword">Confirmar Contraseña</label>
						<div class="password-input-wrapper">
							{#if showConfirmPassword}
								<input
									type="text"
									id="confirmPassword"
									bind:value={confirmPassword}
									placeholder="••••••••"
									on:keypress={handleKeyPress}
									disabled={isResetting}
									required
									minlength="6"
								/>
							{:else}
								<input
									type="password"
									id="confirmPassword"
									bind:value={confirmPassword}
									placeholder="••••••••"
									on:keypress={handleKeyPress}
									disabled={isResetting}
									required
									minlength="6"
								/>
							{/if}
							<button
								type="button"
								class="password-toggle"
								on:click={() => (showConfirmPassword = !showConfirmPassword)}
								aria-label={showConfirmPassword
									? 'Ocultar contraseña'
									: 'Mostrar contraseña'}
								disabled={isResetting}
							>
								{#if showConfirmPassword}
									<svg
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
									>
										<path
											d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
										/>
										<line x1="1" y1="1" x2="23" y2="23" />
									</svg>
								{:else}
									<svg
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
									>
										<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
										<circle cx="12" cy="12" r="3" />
									</svg>
								{/if}
							</button>
						</div>
					</div>

					{#if errorMessage}
						<div class="error-message">
							{errorMessage}
						</div>
					{/if}

					<button type="submit" class="reset-btn" disabled={isResetting}>
						{#if isResetting}
							<div class="spinner" />
						{/if}
						{isResetting ? 'Restableciendo...' : 'Restablecer Contraseña'}
					</button>
				</form>

				<div class="back-to-login">
					<a href="/login" class="back-to-login-link">← Volver al inicio de sesión</a>
				</div>
			</div>
		{/if}
	</div>

	<div class="background-decoration">
		<div class="circle circle-1" />
		<div class="circle circle-2" />
		<div class="circle circle-3" />
	</div>
</div>

<style>
	.reset-password-container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, #00aab2 0%, #7ed321 100%);
		position: relative;
		overflow: hidden;
		padding: 2rem 1rem;
	}

	.reset-password-card {
		background: white;
		padding: 3rem;
		border-radius: 20px;
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
		width: 100%;
		max-width: 450px;
		position: relative;
		z-index: 10;
	}

	.reset-password-header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.logo {
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 1rem;
		gap: 1rem;
	}

	.logo-image {
		width: 64px;
		height: 64px;
		border-radius: 12px;
		flex-shrink: 0;
	}

	.logo-text {
		text-align: left;
	}

	.reset-password-header h1 {
		margin: 0;
		font-size: 1.75rem;
		font-weight: 700;
		color: #00aab2;
	}

	.subtitle {
		margin: 0;
		color: #6b7280;
		font-size: 0.875rem;
	}

	.loading-state,
	.error-state {
		text-align: center;
		padding: 2rem 0;
	}

	.loading-state p,
	.error-state p {
		margin-top: 1rem;
		color: #6b7280;
	}

	.error-icon {
		width: 64px;
		height: 64px;
		margin: 0 auto 1rem;
		color: #ef4444;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.error-icon svg {
		width: 100%;
		height: 100%;
	}

	.error-message {
		background: #fef2f2;
		color: #dc2626;
		padding: 0.75rem 1rem;
		border-radius: 8px;
		border: 1px solid #fecaca;
		font-size: 0.875rem;
		line-height: 1.5;
		margin-bottom: 1rem;
	}

	.reset-form {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.form-description {
		margin: 0 0 1rem 0;
		color: #6b7280;
		font-size: 0.875rem;
		text-align: center;
		line-height: 1.5;
	}

	.password-reset-form {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.form-group label {
		font-weight: 600;
		color: #374151;
		font-size: 0.875rem;
	}

	.form-group input {
		padding: 0.75rem 1rem;
		border: 2px solid #e5e7eb;
		border-radius: 10px;
		font-size: 1rem;
		transition: all 0.3s ease;
		background: #f9fafb;
	}

	.form-group input:focus {
		outline: none;
		border-color: #00aab2;
		background: white;
		box-shadow: 0 0 0 3px rgba(0, 170, 178, 0.1);
	}

	.form-group input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.password-hint {
		margin: 0;
		font-size: 0.75rem;
		color: #9ca3af;
	}

	.password-input-wrapper {
		position: relative;
		display: flex;
		align-items: center;
	}

	.password-input-wrapper input {
		width: 100%;
		padding-right: 3rem;
	}

	.password-toggle {
		position: absolute;
		right: 0.75rem;
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #6b7280;
		transition: all 0.3s ease;
		border-radius: 6px;
		width: 2rem;
		height: 2rem;
	}

	.password-toggle:hover:not(:disabled) {
		background: rgba(0, 170, 178, 0.1);
		color: #00aab2;
	}

	.password-toggle:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.password-toggle svg {
		width: 20px;
		height: 20px;
		stroke-width: 2;
	}

	.reset-btn {
		background: linear-gradient(135deg, #00aab2 0%, #7ed321 100%);
		color: white;
		border: none;
		padding: 1rem;
		border-radius: 10px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s ease;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.reset-btn:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 10px 20px rgba(0, 170, 178, 0.3);
	}

	.reset-btn:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.spinner {
		width: 20px;
		height: 20px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top: 2px solid white;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	.back-to-login {
		text-align: center;
		margin-top: 1rem;
		padding-top: 1.5rem;
		border-top: 1px solid #e5e7eb;
	}

	.back-to-login-link {
		color: #00aab2;
		text-decoration: none;
		font-size: 0.875rem;
		font-weight: 500;
		transition: all 0.3s ease;
	}

	.back-to-login-link:hover {
		color: #007a80;
		text-decoration: underline;
	}

	.background-decoration {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}

	.circle {
		position: absolute;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.1);
	}

	.circle-1 {
		width: 200px;
		height: 200px;
		top: -100px;
		right: -100px;
	}

	.circle-2 {
		width: 150px;
		height: 150px;
		bottom: -75px;
		left: -75px;
	}

	.circle-3 {
		width: 100px;
		height: 100px;
		top: 50%;
		right: 10%;
	}

	@media (max-width: 480px) {
		.reset-password-card {
			margin: 0;
			padding: 2rem;
		}

		.reset-password-container {
			padding: 1rem 0.5rem;
		}
	}
</style>
