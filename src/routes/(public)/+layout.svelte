<script lang="ts">
	import { onMount } from 'svelte';
	import { loadProductsIfNeeded } from '../stores/publicProducts';

	let isMobileMenuOpen = false;
	let productsDropdownOpen = false;

	const toggleMobileMenu = () => {
		isMobileMenuOpen = !isMobileMenuOpen;
		if (!isMobileMenuOpen) productsDropdownOpen = false;
	};

	const closeMobileMenu = () => {
		isMobileMenuOpen = false;
		productsDropdownOpen = false;
	};

	const handleNavClick = () => {
		closeMobileMenu();
	};

	const toggleProductsDropdown = () => {
		productsDropdownOpen = !productsDropdownOpen;
	};

	onMount(() => {
		loadProductsIfNeeded();
		const handleClickOutside = (event: Event) => {
			const target = event.target as HTMLElement;
			if (!target.closest('.header-nav') && !target.closest('.mobile-menu-toggle')) {
				closeMobileMenu();
			}
		};
		document.addEventListener('click', handleClickOutside);
		return () => document.removeEventListener('click', handleClickOutside);
	});
</script>

<svelte:head>
	<title>VAQ+ - Vacunación y Cuidado Pediátrico</title>
	<meta
		name="description"
		content="VAQ+ es la plataforma líder en vacunación y cuidado pediátrico. Conectamos familias con los mejores especialistas."
	/>
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<link rel="icon" type="image/png" sizes="32x32" href="/images/favicon-32x32.png" />
	<link rel="icon" type="image/png" sizes="16x16" href="/images/favicon-16x16.png" />
	<link rel="apple-touch-icon" sizes="180x180" href="/images/apple-touch-icon.png" />
	<link rel="manifest" href="/site.webmanifest" />
	<meta name="theme-color" content="#667eea" />
</svelte:head>

<div class="public-layout">
	<header class="landing-header">
		<div class="header-container">
			<a href="/" class="header-logo">
				<img src="/images/logo.png" alt="VAQ+ Logo" class="logo-image" />
				<div class="logo-text">
					<h1>VAQ+</h1>
					<p>Vacunación y Cuidado Pediátrico</p>
				</div>
			</a>

			<button class="mobile-menu-toggle" on:click={toggleMobileMenu} aria-label="Abrir menú">
				<svg viewBox="0 0 24 24" class="menu-icon">
					<path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
				</svg>
			</button>

			<nav class="header-nav" class:open={isMobileMenuOpen}>
				<a href="/#features" class="nav-link" on:click={handleNavClick}>Características</a>
				<div
					class="nav-dropdown"
					class:dropdown-open={productsDropdownOpen}
					role="group"
					aria-label="Productos"
					on:mouseenter={() => (productsDropdownOpen = true)}
					on:mouseleave={() => (productsDropdownOpen = false)}
				>
					<a
						href="/#products"
						class="nav-link nav-link-trigger"
						on:click={(e) => {
							if (typeof window !== 'undefined' && window.innerWidth <= 768) {
								e.preventDefault();
								toggleProductsDropdown();
							} else {
								handleNavClick();
							}
						}}
						aria-expanded={productsDropdownOpen}
						aria-haspopup="true"
					>
						Productos
						<svg class="dropdown-chevron" viewBox="0 0 24 24" aria-hidden="true">
							<path d="M7 10l5 5 5-5z" />
						</svg>
					</a>
					<div class="dropdown-panel" class:open={productsDropdownOpen}>
						<a href="/vaccines" class="dropdown-link" on:click={handleNavClick}
							>Vacunas</a
						>
						<a href="/programs" class="dropdown-link" on:click={handleNavClick}
							>Programas</a
						>
						<a href="/packages" class="dropdown-link" on:click={handleNavClick}
							>Paquetes</a
						>
					</div>
				</div>
				<a href="/#about" class="nav-link" on:click={handleNavClick}>Acerca de</a>
				<a href="/#contact" class="nav-link" on:click={handleNavClick}>Contacto</a>
			</nav>
		</div>
	</header>

	<main class="public-main">
		<slot />
	</main>

	<footer class="landing-footer">
		<div class="container">
			<div class="footer-content">
				<div class="footer-logo">
					<img src="/images/logo.png" alt="VAQ+ Logo" class="footer-logo-image" />
					<p>Vacunación y Cuidado Pediátrico</p>
				</div>
				<div class="footer-links">
					<div class="footer-section">
						<h4>Servicios</h4>
						<a href="/vaccines">Vacunas</a>
						<a href="/programs">Programas</a>
						<a href="/packages">Paquetes</a>
					</div>
					<div class="footer-section">
						<h4>Empresa</h4>
						<a href="/#about">Acerca de</a>
						<a href="/#contact">Contacto</a>
						<a href="/login">Admin</a>
					</div>
				</div>
			</div>
			<div class="footer-bottom">
				<p>&copy; {new Date().getFullYear()} VAQ+. Todos los derechos reservados.</p>
			</div>
		</div>
	</footer>
</div>

<style>
	.public-layout {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		background-color: var(--surface-50, #f9fafb);
		padding-top: 40px;
	}

	.public-main {
		padding-top: 40px;
		flex: 1;
	}

	.landing-header {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		background-color: white;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		z-index: 1000;
		padding: 1rem 0;
	}

	.header-container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 1rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.header-logo {
		display: flex;
		align-items: center;
		gap: 1rem;
		text-decoration: none;
		color: inherit;
	}

	.logo-image {
		width: 50px;
		height: 50px;
	}

	.logo-text h1 {
		margin: 0;
		font-size: 1.8rem;
		font-weight: 700;
		color: var(--primary-800, #1e3a8a);
	}

	.logo-text p {
		margin: 0;
		font-size: 0.9rem;
		color: var(--surface-600, #6b7280);
	}

	.mobile-menu-toggle {
		display: none;
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.5rem;
		border-radius: 4px;
		transition: background-color 0.2s ease;
	}

	.mobile-menu-toggle:hover {
		background-color: var(--surface-200, #f3f4f6);
	}

	.menu-icon {
		width: 24px;
		height: 24px;
		fill: var(--surface-700, #374151);
	}

	.header-nav {
		display: flex;
		gap: 2rem;
		margin-left: 2rem;
		align-items: center;
	}

	.nav-link {
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--surface-600, #4b5563);
		text-decoration: none;
		transition: color 0.2s ease;
	}

	.nav-link:hover {
		color: var(--primary-800, #1e3a8a);
	}

	/* Products dropdown */
	.nav-dropdown {
		position: relative;
	}

	.nav-link-trigger {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
	}

	.dropdown-chevron {
		width: 18px;
		height: 18px;
		fill: currentColor;
		transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.nav-dropdown:hover .dropdown-chevron,
	.nav-dropdown.dropdown-open .dropdown-chevron {
		transform: rotate(180deg);
	}

	.dropdown-panel {
		position: absolute;
		top: 100%;
		left: 50%;
		transform: translateX(-50%) translateY(-8px);
		min-width: 180px;
		padding: 0.5rem 0;
		background: white;
		border-radius: 12px;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.12), 0 2px 10px rgba(0, 0, 0, 0.08);
		opacity: 0;
		visibility: hidden;
		transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1),
			transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), visibility 0.2s;
		transition-delay: 0.05s;
		z-index: 100;
		border: 1px solid var(--surface-200, #e5e7eb);
	}

	.nav-dropdown:hover .dropdown-panel,
	.dropdown-panel.open {
		opacity: 1;
		visibility: visible;
		transform: translateX(-50%) translateY(4px);
	}

	.nav-dropdown:hover .dropdown-panel {
		transition-delay: 0s;
	}

	.dropdown-link {
		display: block;
		padding: 0.6rem 1.25rem;
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--surface-600, #4b5563);
		text-decoration: none;
		transition: background-color 0.15s ease, color 0.15s ease;
		white-space: nowrap;
	}

	.dropdown-link:hover {
		background-color: var(--surface-100, #f3f4f6);
		color: var(--primary-800, #1e3a8a);
	}

	.dropdown-link:first-child {
		border-radius: 12px 12px 0 0;
	}

	.dropdown-link:last-child {
		border-radius: 0 0 12px 12px;
	}

	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 1rem;
	}

	.landing-footer {
		background-color: var(--primary-800, #1e3a8a);
		color: white;
		padding: 3rem 0;
		margin-top: 4rem;
	}

	.footer-content {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 1rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 2rem;
	}

	.footer-logo {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.footer-logo-image {
		width: 60px;
		height: 60px;
	}

	.footer-logo p {
		font-size: 0.9rem;
		color: #e0e7ff;
		margin: 0;
	}

	.footer-links {
		display: flex;
		gap: 3rem;
		flex-wrap: wrap;
	}

	.footer-section h4 {
		font-size: 1rem;
		font-weight: 600;
		color: #e0e7ff;
		margin-bottom: 1rem;
	}

	.footer-section a {
		display: block;
		color: #dbe4ff;
		text-decoration: none;
		font-size: 0.9rem;
		margin-bottom: 0.5rem;
		transition: color 0.2s ease;
	}

	.footer-section a:hover {
		color: #ffffff;
	}

	.footer-bottom {
		text-align: center;
		padding-top: 2rem;
		border-top: 1px solid rgba(255, 255, 255, 0.2);
		margin-top: 2rem;
	}

	.footer-bottom p {
		font-size: 0.8rem;
		color: #dbe4ff;
		margin: 0;
	}

	@media (max-width: 1024px) {
		.mobile-menu-toggle {
			display: block;
		}

		.header-nav {
			position: absolute;
			top: 100%;
			left: 0;
			right: 0;
			background: white;
			flex-direction: column;
			gap: 0;
			margin: 0;
			padding: 1rem;
			box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
			transform: translateY(-100%);
			opacity: 0;
			visibility: hidden;
			transition: all 0.3s ease;
		}

		.header-nav.open {
			transform: translateY(0);
			opacity: 1;
			visibility: visible;
		}

		.nav-link {
			padding: 0.75rem 0;
			border-bottom: 1px solid var(--surface-200, #f3f4f6);
			width: 100%;
			text-align: center;
		}

		.nav-link:last-child {
			border-bottom: none;
		}

		/* Mobile: products dropdown in flow with animation */
		.nav-dropdown {
			display: flex;
			flex-direction: column;
			width: 100%;
		}

		.nav-dropdown .nav-link-trigger {
			width: 100%;
			border-bottom: 1px solid var(--surface-200, #f3f4f6);
		}

		.nav-dropdown .dropdown-panel {
			position: static;
			transform: none;
			left: auto;
			min-width: auto;
			width: 100%;
			max-height: 0;
			padding: 0;
			overflow: hidden;
			box-shadow: none;
			border: none;
			border-radius: 0;
			transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
			transform: translateX(0) translateY(0);
		}

		.nav-dropdown:hover .dropdown-panel {
			transform: translateX(0) translateY(4px);
		}

		.dropdown-panel.open {
			max-height: 220px;
			padding: 0.5rem 0;
			transform: translateX(0) translateY(0);
		}

		.nav-dropdown .dropdown-link {
			padding: 0.65rem 1.5rem;
			border-bottom: none;
		}
	}

	@media (max-width: 768px) {
		.footer-content {
			flex-direction: column;
			align-items: center;
			gap: 1.5rem;
		}

		.footer-links {
			flex-direction: column;
			align-items: center;
			gap: 1rem;
		}

		.footer-logo-image {
			width: 50px;
			height: 50px;
		}

		.footer-logo p {
			font-size: 0.8rem;
		}

		.footer-section h4 {
			font-size: 0.9rem;
		}

		.footer-section a {
			font-size: 0.8rem;
		}
	}

	@media (max-width: 480px) {
		.public-layout {
			padding-top: 70px;
		}

		.logo-text h1 {
			font-size: 1.5rem;
		}

		.logo-text p {
			font-size: 0.8rem;
		}
	}
</style>
