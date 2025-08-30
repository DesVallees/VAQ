<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { userStore } from './stores/auth';
	import './app.css';
	import { auth, db } from '$lib/firebase/vaqmas';
	import { onAuthStateChanged, signOut } from 'firebase/auth';
	import { getDoc, doc } from 'firebase/firestore';

	let isAuthenticated = false;
	let currentUser: any = null;
	let isLoading = true;

	onMount(() => {
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (user) {
				// Check if user is admin
				const userDoc = await getDoc(doc(db, 'users', user.uid));
				if (userDoc.exists() && userDoc.data().isAdmin) {
					isAuthenticated = true;
					currentUser = user;
					userStore.set({ user, isAdmin: true, isLoading: false });

					// Redirect authenticated users to dashboard ONLY if they're on main page or login
					// Don't redirect from protected routes like /products, /appointments, etc.
					if ($page.url.pathname === '/' || $page.url.pathname === '/login') {
						goto('/dashboard');
					}
				} else {
					// Not admin, redirect to login
					await signOut(auth);
					goto('/login');
				}
			} else {
				isAuthenticated = false;
				currentUser = null;
				userStore.set({ user: null, isAdmin: false, isLoading: false });
			}
			isLoading = false;
		});

		return unsubscribe;
	});

	const handleLogout = async () => {
		await signOut(auth);
		goto('/');
	};
</script>

<svelte:head>
	<title>VAQ+ Admin Dashboard</title>
	<meta name="description" content="Firebase database management interface for VAQ+ mobile app" />
</svelte:head>

{#if isLoading}
	<div class="loading-screen">
		<div class="spinner" />
		<p>Cargando...</p>
	</div>
{:else if isAuthenticated}
	<div class="admin-layout">
		<!-- Sidebar Navigation -->
		<nav class="sidebar">
			<div class="sidebar-header">
				<div class="sidebar-logo">
					<img src="/images/logo.png" alt="VAQ+ Logo" class="logo-image" />
					<div class="logo-text">
						<h1>VAQ+ Admin</h1>
						<p>Panel de Administración</p>
					</div>
				</div>
			</div>

			<ul class="nav-menu">
				<li class="nav-item">
					<a
						href="/dashboard"
						class="nav-link"
						class:active={$page.url.pathname === '/dashboard'}
					>
						<svg class="nav-icon" viewBox="0 0 24 24">
							<path
								d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"
							/>
						</svg>
						Dashboard
					</a>
				</li>

				<li class="nav-item">
					<a
						href="/products"
						class="nav-link"
						class:active={$page.url.pathname.startsWith('/products')}
					>
						<svg class="nav-icon" viewBox="0 0 24 24">
							<path
								d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"
							/>
						</svg>
						Productos
					</a>
				</li>

				<li class="nav-item">
					<a
						href="/appointments"
						class="nav-link"
						class:active={$page.url.pathname.startsWith('/appointments')}
					>
						<svg class="nav-icon" viewBox="0 0 24 24">
							<path
								d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"
							/>
						</svg>
						Citas
					</a>
				</li>

				<li class="nav-item">
					<a
						href="/users"
						class="nav-link"
						class:active={$page.url.pathname.startsWith('/users')}
					>
						<svg class="nav-icon" viewBox="0 0 24 24">
							<path
								d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"
							/>
						</svg>
						Usuarios
					</a>
				</li>

				<li class="nav-item">
					<a
						href="/pediatricians"
						class="nav-link"
						class:active={$page.url.pathname.startsWith('/pediatricians')}
					>
						<svg class="nav-icon" viewBox="0 0 24 24">
							<path
								d="M10 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.1 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z"
							/>
						</svg>
						Pediatras
					</a>
				</li>

				<li class="nav-item">
					<a
						href="/articles"
						class="nav-link"
						class:active={$page.url.pathname.startsWith('/articles')}
					>
						<svg class="nav-icon" viewBox="0 0 24 24">
							<path
								d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm0-4H7V7h10v2z"
							/>
						</svg>
						Artículos
					</a>
				</li>

				<li class="nav-item">
					<a
						href="/locations"
						class="nav-link"
						class:active={$page.url.pathname.startsWith('/locations')}
					>
						<svg class="nav-icon" viewBox="0 0 24 24">
							<path
								d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
							/>
						</svg>
						Ubicaciones
					</a>
				</li>

				<li class="nav-item">
					<a
						href="/analytics"
						class="nav-link"
						class:active={$page.url.pathname.startsWith('/analytics')}
					>
						<svg class="nav-icon" viewBox="0 0 24 24">
							<path
								d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"
							/>
						</svg>
						Analytics
					</a>
				</li>
			</ul>

			<div class="logout-button">
				<button class="logout-btn" on:click={handleLogout}>
					<svg viewBox="0 0 24 24">
						<path
							d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"
						/>
					</svg>
					Cerrar Sesión
				</button>
			</div>
		</nav>

		<!-- Main Content -->
		<main class="main-content">
			<slot />
		</main>
	</div>
{:else}
	<!-- For non-authenticated users, just render the slot (child routes) -->
	<slot />
{/if}

<style>
	.loading-screen {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100vh;
		background: linear-gradient(135deg, var(--primary-500) 0%, var(--secondary-500) 100%);
		color: white;
	}

	.spinner {
		width: 50px;
		height: 50px;
		border: 3px solid rgba(255, 255, 255, 0.3);
		border-top: 3px solid white;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 20px;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	.admin-layout {
		display: flex;
		min-height: 100vh;
		background-color: var(--surface-50);
	}

	.sidebar {
		width: 280px;
		background: linear-gradient(180deg, var(--primary-600) 0%, var(--primary-700) 100%);
		color: white;
		display: flex;
		flex-direction: column;
		box-shadow: var(--shadow-lg);
	}

	.sidebar-header {
		padding: 2rem 1.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.sidebar-logo {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.logo-image {
		width: 48px;
		height: 48px;
		border-radius: var(--radius-lg);
	}

	.logo-text h1 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 700;
	}

	.logo-text p {
		margin: 0.5rem 0 0 0;
		opacity: 0.8;
		font-size: 0.875rem;
	}

	.nav-menu {
		list-style: none;
		padding: 0;
		margin: 0;
		flex: 1;
	}

	.nav-item {
		margin: 0;
	}

	.nav-link {
		display: flex;
		align-items: center;
		padding: 1rem 1.5rem;
		color: white;
		text-decoration: none;
		transition: all var(--transition-fast);
		border-left: 3px solid transparent;
	}

	.nav-link:hover,
	.nav-link.active {
		background-color: rgba(255, 255, 255, 0.1);
		border-left-color: var(--primary-300);
	}

	.nav-icon {
		width: 20px;
		height: 20px;
		margin-right: 12px;
		fill: currentColor;
	}

	.logout-button {
		padding: 1.5rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.logout-btn {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.75rem;
		background-color: rgba(239, 68, 68, 0.9);
		color: #fff5f5;
		border: 1px solid rgba(239, 68, 68, 0.2);
		border-radius: var(--radius-lg);
		cursor: pointer;
		transition: all var(--transition-fast);
		font-size: 0.875rem;
	}

	.logout-btn:hover {
		background-color: rgba(239, 68, 68, 1);
	}

	.logout-btn svg {
		width: 16px;
		height: 16px;
		margin-right: 8px;
		fill: #fff5f5;
	}

	.main-content {
		flex: 1;
		padding: 2rem;
		overflow-y: auto;
	}

	@media (max-width: 768px) {
		.sidebar {
			width: 100%;
			position: fixed;
			top: 0;
			left: 0;
			height: 100vh;
			z-index: 1000;
			transform: translateX(-100%);
			transition: transform 0.3s ease;
		}

		.sidebar.open {
			transform: translateX(0);
		}

		.main-content {
			padding: 1rem;
		}
	}
</style>
