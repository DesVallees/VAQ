<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { auth, db } from '$lib/firebase/vaqmas';
	import {
		onAuthStateChanged,
		signInWithEmailAndPassword,
		sendPasswordResetEmail,
	} from 'firebase/auth';
	import { getDoc, doc } from 'firebase/firestore';

	let email = '';
	let password = '';
	let isLoading = false;
	let errorMessage = '';
	let isAuthenticated = false;
	let showPassword = false;
	let showForgotPassword = false;
	let forgotPasswordEmail = '';
	let forgotPasswordLoading = false;
	let forgotPasswordMessage = '';
	let forgotPasswordSuccess = false;
	let forgotPasswordTimeoutId: ReturnType<typeof setTimeout> | null = null;

	onMount(() => {
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (user) {
				// Check if user is admin
				const userDoc = await getDoc(doc(db, 'users', user.uid));
				if (userDoc.exists() && userDoc.data().isAdmin) {
					isAuthenticated = true;
					goto('/dashboard');
				} else {
					// Not admin, sign out
					await auth.signOut();
				}
			}
		});

		// Handle Escape key to close forgot password modal
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === 'Escape' && showForgotPassword) {
				closeForgotPassword();
			}
		};

		window.addEventListener('keydown', handleEscape);

		return () => {
			unsubscribe();
			window.removeEventListener('keydown', handleEscape);
			// Clear any pending timeouts on unmount
			if (forgotPasswordTimeoutId !== null) {
				clearTimeout(forgotPasswordTimeoutId);
				forgotPasswordTimeoutId = null;
			}
		};
	});

	const handleLogin = async () => {
		if (!email || !password) {
			errorMessage = 'Por favor completa todos los campos';
			return;
		}

		isLoading = true;
		errorMessage = '';

		try {
			const userCredential = await signInWithEmailAndPassword(auth, email, password);
			const user = userCredential.user;

			// Check if user is admin
			const userDoc = await getDoc(doc(db, 'users', user.uid));
			if (userDoc.exists() && userDoc.data().isAdmin) {
				goto('/dashboard');
			} else {
				errorMessage = 'No tienes permisos de administrador';
				await auth.signOut();
			}
		} catch (error: any) {
			console.error('Login error:', error);
			switch (error.code) {
				case 'auth/user-not-found':
					errorMessage = 'Usuario no encontrado';
					break;
				case 'auth/wrong-password':
					errorMessage = 'Contraseña incorrecta';
					break;
				case 'auth/invalid-email':
					errorMessage = 'Email inválido';
					break;
				default:
					errorMessage = 'Error al iniciar sesión';
			}
		} finally {
			isLoading = false;
		}
	};

	const handleKeyPress = (event: KeyboardEvent) => {
		if (event.key === 'Enter') {
			handleLogin();
		}
	};

	const handleForgotPassword = async () => {
		if (!forgotPasswordEmail) {
			forgotPasswordMessage = 'Por favor ingresa tu email';
			forgotPasswordSuccess = false;
			return;
		}

		// Basic email validation
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(forgotPasswordEmail)) {
			forgotPasswordMessage = 'Por favor ingresa un email válido';
			forgotPasswordSuccess = false;
			return;
		}

		forgotPasswordLoading = true;
		forgotPasswordMessage = '';

		// Clear any existing timeout before creating a new one
		if (forgotPasswordTimeoutId !== null) {
			clearTimeout(forgotPasswordTimeoutId);
			forgotPasswordTimeoutId = null;
		}

		try {
			// Force Spanish for password reset emails
			auth.languageCode = 'es';

			// Configure custom action URL for password reset
			const actionCodeSettings = {
				url:
					typeof window !== 'undefined'
						? `${window.location.origin}/auth/action`
						: '/auth/action',
				handleCodeInApp: true,
			};

			await sendPasswordResetEmail(auth, forgotPasswordEmail, actionCodeSettings);
			// Security best practice: Show generic success message regardless of whether email exists
			// This prevents email enumeration attacks
			forgotPasswordMessage =
				'Si el email existe en nuestro sistema, recibirás un enlace para restablecer tu contraseña.';
			forgotPasswordSuccess = true;
			// Clear the email field after successful submission
			forgotPasswordEmail = '';
			// Auto-close after 5 seconds
			forgotPasswordTimeoutId = setTimeout(() => {
				showForgotPassword = false;
				forgotPasswordMessage = '';
				forgotPasswordSuccess = false;
				forgotPasswordTimeoutId = null;
			}, 5000);
		} catch (error: any) {
			console.error('Password reset error:', error);
			// Security best practice: Don't reveal specific error details
			// Show generic message to prevent email enumeration
			forgotPasswordMessage =
				'Si el email existe en nuestro sistema, recibirás un enlace para restablecer tu contraseña.';
			forgotPasswordSuccess = true;
			// Clear the email field
			forgotPasswordEmail = '';
			// Auto-close after 5 seconds
			forgotPasswordTimeoutId = setTimeout(() => {
				showForgotPassword = false;
				forgotPasswordMessage = '';
				forgotPasswordSuccess = false;
				forgotPasswordTimeoutId = null;
			}, 5000);
		} finally {
			forgotPasswordLoading = false;
		}
	};

	const openForgotPassword = () => {
		showForgotPassword = true;
		forgotPasswordEmail = email; // Pre-fill with login email if available
		forgotPasswordMessage = '';
		forgotPasswordSuccess = false;
	};

	const closeForgotPassword = () => {
		// Clear any pending timeout when closing the modal
		if (forgotPasswordTimeoutId !== null) {
			clearTimeout(forgotPasswordTimeoutId);
			forgotPasswordTimeoutId = null;
		}
		showForgotPassword = false;
		forgotPasswordEmail = '';
		forgotPasswordMessage = '';
		forgotPasswordSuccess = false;
	};
</script>

<svelte:head>
	<title>VAQ+ Admin - Login</title>
</svelte:head>

<div class="login-container">
	<div class="login-card">
		<div class="login-header">
			<div class="logo">
				<img src="/images/logo.png" alt="VAQ+ Logo" class="logo-image" />
				<div class="logo-text">
					<h1>VAQ+ Admin</h1>
					<p class="subtitle">Panel de Administración</p>
				</div>
			</div>
		</div>

		<form class="login-form" on:submit|preventDefault={handleLogin}>
			<div class="form-group">
				<label for="email">Email</label>
				<input
					type="email"
					id="email"
					bind:value={email}
					placeholder="admin@vaqmas.com"
					on:keypress={handleKeyPress}
					required
				/>
			</div>

			<div class="form-group">
				<label for="password">Contraseña</label>
				<div class="password-input-wrapper">
					{#if showPassword}
						<input
							type="text"
							id="password"
							bind:value={password}
							placeholder="••••••••"
							on:keypress={handleKeyPress}
							required
						/>
					{:else}
						<input
							type="password"
							id="password"
							bind:value={password}
							placeholder="••••••••"
							on:keypress={handleKeyPress}
							required
						/>
					{/if}
					<button
						type="button"
						class="password-toggle"
						on:click={() => (showPassword = !showPassword)}
						aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
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
			</div>

			{#if errorMessage}
				<div class="error-message">
					{errorMessage}
				</div>
			{/if}

			<button type="submit" class="login-btn" disabled={isLoading}>
				{#if isLoading}
					<div class="spinner" />
				{/if}
				{isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
			</button>

			<div class="forgot-password-link">
				<button type="button" class="forgot-password-btn" on:click={openForgotPassword}>
					¿Olvidaste tu contraseña?
				</button>
			</div>
		</form>

		<div class="login-footer">
			<p>Acceso exclusivo para administradores</p>
		</div>
	</div>

	<!-- Forgot Password Modal -->
	{#if showForgotPassword}
		<div class="modal-overlay">
			<button
				type="button"
				class="modal-overlay-button"
				on:click={closeForgotPassword}
				aria-label="Cerrar modal"
			>
				<span class="sr-only">Cerrar</span>
			</button>
			<div
				class="modal-content"
				role="dialog"
				aria-labelledby="forgot-password-title"
				aria-modal="true"
			>
				<div class="modal-header">
					<h2 id="forgot-password-title">Restablecer Contraseña</h2>
					<button
						type="button"
						class="modal-close"
						on:click={closeForgotPassword}
						aria-label="Cerrar"
					>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<line x1="18" y1="6" x2="6" y2="18" />
							<line x1="6" y1="6" x2="18" y2="18" />
						</svg>
					</button>
				</div>
				<div class="modal-body">
					<p class="modal-description">
						Ingresa tu dirección de email y te enviaremos un enlace para restablecer tu
						contraseña.
					</p>
					<div class="form-group">
						<label for="forgot-password-email">Email</label>
						<input
							type="email"
							id="forgot-password-email"
							bind:value={forgotPasswordEmail}
							placeholder="admin@vaqmas.com"
							disabled={forgotPasswordLoading}
							required
						/>
					</div>
					{#if forgotPasswordMessage}
						<div
							class="forgot-password-message"
							class:success={forgotPasswordSuccess}
							class:error={!forgotPasswordSuccess}
						>
							{forgotPasswordMessage}
						</div>
					{/if}
				</div>
				<div class="modal-footer">
					<button
						type="button"
						class="modal-cancel-btn"
						on:click={closeForgotPassword}
						disabled={forgotPasswordLoading}
					>
						Cancelar
					</button>
					<button
						type="button"
						class="modal-submit-btn"
						on:click={handleForgotPassword}
						disabled={forgotPasswordLoading}
					>
						{#if forgotPasswordLoading}
							<div class="spinner" />
						{/if}
						{forgotPasswordLoading ? 'Enviando...' : 'Enviar Enlace'}
					</button>
				</div>
			</div>
		</div>
	{/if}

	<div class="background-decoration">
		<div class="circle circle-1" />
		<div class="circle circle-2" />
		<div class="circle circle-3" />
	</div>
</div>

<style>
	.login-container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, #00aab2 0%, #7ed321 100%);
		position: relative;
		overflow: hidden;
	}

	.login-card {
		background: white;
		padding: 3rem;
		border-radius: 20px;
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
		width: 100%;
		max-width: 400px;
		position: relative;
		z-index: 10;
	}

	.login-header {
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

	.login-header h1 {
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

	.login-form {
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

	.password-toggle:hover {
		background: rgba(0, 170, 178, 0.1);
		color: #00aab2;
	}

	.password-toggle:active {
		transform: scale(0.95);
	}

	.password-toggle svg {
		width: 20px;
		height: 20px;
		stroke-width: 2;
	}

	.password-input-wrapper:focus-within .password-toggle {
		color: #00aab2;
	}

	.error-message {
		background: #fef2f2;
		color: #dc2626;
		padding: 0.75rem 1rem;
		border-radius: 8px;
		border: 1px solid #fecaca;
		font-size: 0.875rem;
	}

	.login-btn {
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

	.login-btn:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 10px 20px rgba(0, 170, 178, 0.3);
	}

	.login-btn:disabled {
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

	.login-footer {
		text-align: center;
		margin-top: 2rem;
		padding-top: 1.5rem;
		border-top: 1px solid #e5e7eb;
	}

	.login-footer p {
		margin: 0;
		color: #6b7280;
		font-size: 0.75rem;
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

	.forgot-password-link {
		text-align: center;
		margin-top: 0.5rem;
	}

	.forgot-password-btn {
		background: none;
		border: none;
		color: #00aab2;
		font-size: 0.875rem;
		cursor: pointer;
		padding: 0.5rem;
		text-decoration: underline;
		transition: all 0.3s ease;
	}

	.forgot-password-btn:hover {
		color: #007a80;
		text-decoration: none;
	}

	.forgot-password-btn:active {
		transform: scale(0.98);
	}

	/* Modal Styles */
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		animation: fadeIn 0.2s ease;
	}

	.modal-overlay-button {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.5);
		border: none;
		cursor: pointer;
		backdrop-filter: blur(4px);
		padding: 0;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border-width: 0;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.modal-content {
		background: white;
		border-radius: 20px;
		width: 90%;
		max-width: 450px;
		max-height: 90vh;
		overflow-y: auto;
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
		animation: slideUp 0.3s ease;
		position: relative;
		z-index: 1001;
		pointer-events: auto;
	}

	@keyframes slideUp {
		from {
			transform: translateY(20px);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.5rem 2rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.modal-header h2 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 700;
		color: #1f2937;
	}

	.modal-close {
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.5rem;
		color: #6b7280;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 6px;
		transition: all 0.2s ease;
		width: 2rem;
		height: 2rem;
	}

	.modal-close:hover {
		background: #f3f4f6;
		color: #1f2937;
	}

	.modal-close svg {
		width: 20px;
		height: 20px;
	}

	.modal-body {
		padding: 2rem;
	}

	.modal-description {
		margin: 0 0 1.5rem 0;
		color: #6b7280;
		font-size: 0.875rem;
		line-height: 1.5;
	}

	.forgot-password-message {
		padding: 0.75rem 1rem;
		border-radius: 8px;
		font-size: 0.875rem;
		margin-top: 1rem;
		line-height: 1.5;
	}

	.forgot-password-message.success {
		background: #f0fdf4;
		color: #166534;
		border: 1px solid #bbf7d0;
	}

	.forgot-password-message.error {
		background: #fef2f2;
		color: #dc2626;
		border: 1px solid #fecaca;
	}

	.modal-footer {
		display: flex;
		gap: 1rem;
		padding: 1.5rem 2rem;
		border-top: 1px solid #e5e7eb;
		justify-content: flex-end;
	}

	.modal-cancel-btn {
		background: #f3f4f6;
		color: #374151;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 10px;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.modal-cancel-btn:hover:not(:disabled) {
		background: #e5e7eb;
	}

	.modal-cancel-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.modal-submit-btn {
		background: linear-gradient(135deg, #00aab2 0%, #7ed321 100%);
		color: white;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 10px;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s ease;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.modal-submit-btn:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 10px 20px rgba(0, 170, 178, 0.3);
	}

	.modal-submit-btn:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	@media (max-width: 480px) {
		.login-card {
			margin: 1rem;
			padding: 2rem;
		}

		.login-container {
			padding: 0.5rem;
		}

		.modal-content {
			width: 95%;
			margin: 1rem;
		}

		.modal-header,
		.modal-body,
		.modal-footer {
			padding: 1.25rem 1.5rem;
		}

		.modal-footer {
			flex-direction: column;
		}

		.modal-cancel-btn,
		.modal-submit-btn {
			width: 100%;
		}
	}
</style>
