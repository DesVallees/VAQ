<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { auth, db } from '$lib/firebase/vaqmas';
	import { onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';
	import { getDoc, doc } from 'firebase/firestore';

	let email = '';
	let password = '';
	let isLoading = false;
	let errorMessage = '';
	let isAuthenticated = false;

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

		return unsubscribe;
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
					placeholder="admin@vaqplus.com"
					on:keypress={handleKeyPress}
					required
				/>
			</div>

			<div class="form-group">
				<label for="password">Contraseña</label>
				<input
					type="password"
					id="password"
					bind:value={password}
					placeholder="••••••••"
					on:keypress={handleKeyPress}
					required
				/>
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
		</form>

		<div class="login-footer">
			<p>Acceso exclusivo para administradores</p>
		</div>
	</div>

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

	@media (max-width: 480px) {
		.login-card {
			margin: 1rem;
			padding: 2rem;
		}
	}
</style>
