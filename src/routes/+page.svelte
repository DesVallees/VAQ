<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let isMobileMenuOpen = false;
	let selectedImage: string | null = null;

	const toggleMobileMenu = () => {
		isMobileMenuOpen = !isMobileMenuOpen;
	};

	const closeMobileMenu = () => {
		isMobileMenuOpen = false;
	};

	const openImage = (imagePath: string) => {
		selectedImage = imagePath;
		document.body.style.overflow = 'hidden';
	};

	const closeImage = () => {
		selectedImage = null;
		document.body.style.overflow = '';
	};

	// Close mobile menu when clicking on a link
	const handleNavClick = () => {
		closeMobileMenu();
	};

	// Close mobile menu when clicking outside
	onMount(() => {
		const handleClickOutside = (event: Event) => {
			const target = event.target as HTMLElement;
			if (!target.closest('.header-nav') && !target.closest('.mobile-menu-toggle')) {
				closeMobileMenu();
			}
		};

		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === 'Escape' && selectedImage) {
				closeImage();
			}
		};

		document.addEventListener('click', handleClickOutside);
		document.addEventListener('keydown', handleEscape);
		return () => {
			document.removeEventListener('click', handleClickOutside);
			document.removeEventListener('keydown', handleEscape);
		};
	});
</script>

<svelte:head>
	<title>VAQ+ - Vacunación y Cuidado Pediátrico</title>
	<meta
		name="description"
		content="VAQ+ es la plataforma líder en vacunación y cuidado pediátrico. Conectamos familias con los mejores especialistas."
	/>
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />

	<!-- Favicon -->
	<link rel="icon" type="image/png" sizes="32x32" href="/images/favicon-32x32.png" />
	<link rel="icon" type="image/png" sizes="16x16" href="/images/favicon-16x16.png" />
	<link rel="apple-touch-icon" sizes="180x180" href="/images/apple-touch-icon.png" />
	<link rel="manifest" href="/site.webmanifest" />
	<meta name="theme-color" content="#667eea" />
</svelte:head>

<!-- Landing Page for Non-Authenticated Users -->
<div class="landing-page">
	<!-- Header -->
	<header class="landing-header">
		<div class="header-container">
			<div class="header-logo">
				<img src="/images/logo.png" alt="VAQ+ Logo" class="logo-image" />
				<div class="logo-text">
					<h1>VAQ+</h1>
					<p>Vacunación y Cuidado Pediátrico</p>
				</div>
			</div>

			<!-- Mobile Menu Toggle -->
			<button class="mobile-menu-toggle" on:click={toggleMobileMenu} aria-label="Toggle menu">
				<svg viewBox="0 0 24 24" class="menu-icon">
					<path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
				</svg>
			</button>

			<nav class="header-nav" class:open={isMobileMenuOpen}>
				<a href="#features" class="nav-link" on:click={handleNavClick}>Características</a>
				<a href="#products" class="nav-link" on:click={handleNavClick}>Productos</a>
				<a href="#about" class="nav-link" on:click={handleNavClick}>Acerca de</a>
				<a href="#contact" class="nav-link" on:click={handleNavClick}>Contacto</a>
				<button class="login-btn" on:click={() => goto('/login')}> Iniciar Sesión </button>
			</nav>
		</div>
	</header>

	<!-- Hero Section -->
	<section class="hero-section">
		<div class="hero-container">
			<div class="hero-content">
				<h1 class="hero-title">
					Tu Salud, Nuestra <span class="highlight">Prioridad</span>
				</h1>
				<p class="hero-subtitle">
					VAQ+ es la plataforma líder en vacunación y cuidado pediátrico. Conectamos
					familias con los mejores especialistas para garantizar el bienestar de los más
					pequeños.
				</p>
				<div class="hero-actions">
					<button class="cta-btn primary" on:click={() => goto('/login')}>
						Acceder al Sistema
					</button>
					<button
						class="cta-btn secondary"
						on:click={() => {
							const element = document.getElementById('features');
							if (element) {
								element.scrollIntoView({ behavior: 'smooth' });
							}
						}}
					>
						Conocer Más
					</button>
				</div>
			</div>
			<div class="hero-visual">
				<div class="hero-image-container">
					<img src="/images/logo.png" alt="VAQ+ App" class="hero-app-image" />
				</div>
			</div>
		</div>
	</section>

	<!-- Features Section -->
	<section id="features" class="features-section">
		<div class="container">
			<div class="section-header">
				<h2>¿Por qué elegir VAQ+?</h2>
				<p>Descubre las ventajas de nuestra plataforma integral</p>
			</div>
			<div class="features-grid">
				<div class="feature-card">
					<div class="feature-icon">
						<svg viewBox="0 0 24 24">
							<path
								d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
							/>
						</svg>
					</div>
					<h3>Vacunación Segura</h3>
					<p>
						Protocolos médicos rigurosos y seguimiento completo del historial de
						vacunación.
					</p>
				</div>
				<div class="feature-card">
					<div class="feature-icon">
						<svg viewBox="0 0 24 24">
							<path
								d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"
							/>
						</svg>
					</div>
					<h3>Especialistas Certificados</h3>
					<p>
						Red de pediatras altamente calificados y con amplia experiencia en cuidado
						infantil.
					</p>
				</div>
				<div class="feature-card">
					<div class="feature-icon">
						<svg viewBox="0 0 24 24">
							<path
								d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"
							/>
						</svg>
					</div>
					<h3>Citas Programadas</h3>
					<p>
						Sistema inteligente de agendamiento que se adapta a tu horario y
						preferencias.
					</p>
				</div>
				<div class="feature-card">
					<div class="feature-icon">
						<svg viewBox="0 0 24 24">
							<path
								d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
							/>
						</svg>
					</div>
					<h3>Seguimiento Continuo</h3>
					<p>Monitoreo del desarrollo y crecimiento con recordatorios personalizados.</p>
				</div>
			</div>
		</div>
	</section>

	<!-- Products Preview Section -->
	<section id="products" class="products-section">
		<div class="container">
			<div class="section-header">
				<h2>Nuestros Productos</h2>
				<p>Vacunas y servicios médicos de la más alta calidad</p>
			</div>
			<div class="products-preview">
				<div class="product-category">
					<h3>Vacunas</h3>
					<p>Programa completo de inmunización para todas las edades</p>
				</div>
				<div class="product-category">
					<h3>Programas</h3>
					<p>Combinaciones optimizadas para máxima protección</p>
				</div>
				<div class="product-category">
					<h3>Consultas</h3>
					<p>Atención pediátrica especializada y personalizada</p>
				</div>
			</div>
		</div>
	</section>

	<!-- SCP Programs Section -->
	<section id="scp-programs" class="scp-programs-section">
		<div class="container">
			<div class="section-header">
				<h2>Programas de Vacunación SCP</h2>
				<p class="update-date">Revisado y actualizado, 26 de febrero de 2025</p>
			</div>
			<div class="scp-programs-grid">
				<div
					class="scp-program-card"
					on:click={() => openImage('/images/SCP_programs/1.webp')}
				>
					<div class="program-image-container">
						<img
							src="/images/SCP_programs/1.webp"
							alt="Vacunación menores de 5 años: PAI Colombia"
						/>
					</div>
					<h3>Vacunación de los niños y niñas menores de 5 años: PAI Colombia</h3>
				</div>
				<div
					class="scp-program-card"
					on:click={() => openImage('/images/SCP_programs/1-1.webp')}
				>
					<div class="program-image-container">
						<img
							src="/images/SCP_programs/1-1.webp"
							alt="Vacunación menores de 5 años: esquema SCP"
						/>
					</div>
					<h3>
						Vacunación de los niños y niñas menores de 5 años: esquema sugerido por la
						SCP
					</h3>
				</div>
				<div
					class="scp-program-card"
					on:click={() => openImage('/images/SCP_programs/2.webp')}
				>
					<div class="program-image-container">
						<img
							src="/images/SCP_programs/2.webp"
							alt="Vacunación del escolar y adolescente sano"
						/>
					</div>
					<h3>Vacunación del escolar y adolescente sano</h3>
				</div>
				<div
					class="scp-program-card"
					on:click={() => openImage('/images/SCP_programs/3.webp')}
				>
					<div class="program-image-container">
						<img src="/images/SCP_programs/3.webp" alt="Vacunación de la gestante" />
					</div>
					<h3>Vacunación de la gestante</h3>
				</div>
				<div
					class="scp-program-card"
					on:click={() => openImage('/images/SCP_programs/4.webp')}
				>
					<div class="program-image-container">
						<img
							src="/images/SCP_programs/4.webp"
							alt="Vacunas recomendadas a los trabajadores de la salud"
						/>
					</div>
					<h3>Vacunas recomendadas a los trabajadores de la salud</h3>
				</div>
				<div
					class="scp-program-card"
					on:click={() => openImage('/images/SCP_programs/5.webp')}
				>
					<div class="program-image-container">
						<img
							src="/images/SCP_programs/5.webp"
							alt="Vacunas indicadas en pacientes menores de 18 años con enfermedades crónicas"
						/>
					</div>
					<h3>
						Vacunas indicadas en pacientes menores de 18 años con enfermedades crónicas
					</h3>
				</div>
				<div
					class="scp-program-card"
					on:click={() => openImage('/images/SCP_programs/6.webp')}
				>
					<div class="program-image-container">
						<img
							src="/images/SCP_programs/6.webp"
							alt="Vacunación en el postrasplante de médula ósea"
						/>
					</div>
					<h3>Vacunación en el postrasplante de médula ósea</h3>
				</div>
			</div>
		</div>
	</section>

	<!-- Image Overlay -->
	{#if selectedImage}
		<div class="image-overlay" on:click={closeImage} role="button" tabindex="-1">
			<button class="close-overlay" on:click|stopPropagation={closeImage} aria-label="Cerrar">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<line x1="18" y1="6" x2="6" y2="18" />
					<line x1="6" y1="6" x2="18" y2="18" />
				</svg>
			</button>
			<div class="overlay-image-container" on:click|stopPropagation>
				<img src={selectedImage} alt="Programa de vacunación SCP" />
			</div>
		</div>
	{/if}

	<!-- About Section -->
	<section id="about" class="about-section">
		<div class="container">
			<div class="about-content">
				<div class="about-text">
					<h2>Acerca de VAQ+</h2>
					<p>
						Somos una plataforma comprometida con la salud infantil, ofreciendo
						soluciones integrales para el cuidado pediátrico. Nuestra misión es
						facilitar el acceso a servicios médicos de calidad y promover la prevención
						a través de la vacunación.
					</p>
					<div class="stats">
						<div class="stat">
							<span class="stat-number">1000+</span>
							<span class="stat-label">Familias Atendidas</span>
						</div>
						<div class="stat">
							<span class="stat-number">50+</span>
							<span class="stat-label">Especialistas</span>
						</div>
						<div class="stat">
							<span class="stat-number">99%</span>
							<span class="stat-label">Satisfacción</span>
						</div>
					</div>
				</div>
				<div class="about-visual">
					<div class="about-image-container">
						<img src="/images/logo.png" alt="VAQ+ Team" class="about-image" />
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Contact Section -->
	<section id="contact" class="contact-section">
		<div class="container">
			<div class="section-header">
				<h2>Contáctanos</h2>
				<p>Estamos aquí para ayudarte con cualquier consulta</p>
			</div>
			<div class="contact-content">
				<div class="contact-info">
					<div class="contact-item">
						<svg viewBox="0 0 24 24">
							<path
								d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"
							/>
						</svg>
						<div>
							<h4>Email</h4>
							<p>info@vaqmas.com</p>
						</div>
					</div>
					<div class="contact-item">
						<svg viewBox="0 0 24 24">
							<path
								d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"
							/>
						</svg>
						<div>
							<h4>Teléfono</h4>
							<p>+57 (1) 123-4567</p>
						</div>
					</div>
					<div class="contact-item">
						<svg viewBox="0 0 24 24">
							<path
								d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
							/>
						</svg>
						<div>
							<h4>Ubicación</h4>
							<p>Bogotá, Colombia</p>
						</div>
					</div>
				</div>
				<div class="contact-form">
					<form class="form">
						<div class="form-group">
							<input type="text" placeholder="Nombre completo" required />
						</div>
						<div class="form-group">
							<input type="email" placeholder="Email" required />
						</div>
						<div class="form-group">
							<textarea placeholder="Mensaje" rows="4" required />
						</div>
						<button type="submit" class="submit-btn">Enviar Mensaje</button>
					</form>
				</div>
			</div>
		</div>
	</section>

	<!-- Footer -->
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
						<a href="#products">Vacunación</a>
						<a href="#products">Consultas</a>
						<a href="#products">Programas</a>
					</div>
					<div class="footer-section">
						<h4>Empresa</h4>
						<a href="#about">Acerca de</a>
						<a href="#contact">Contacto</a>
						<a href="/login">Admin</a>
					</div>
				</div>
			</div>
			<div class="footer-bottom">
				<p>&copy; 2024 VAQ+. Todos los derechos reservados.</p>
			</div>
		</div>
	</footer>
</div>

<style>
	.landing-page {
		min-height: 100vh;
		background-color: #f9fafb;
		padding-top: 80px; /* Adjust for fixed header */
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
	}

	.logo-image {
		width: 50px;
		height: 50px;
	}

	.logo-text h1 {
		margin: 0;
		font-size: 1.8rem;
		font-weight: 700;
		color: #1e3a8a;
	}

	.logo-text p {
		margin: 0;
		font-size: 0.9rem;
		color: #6b7280;
	}

	/* Mobile Menu Toggle */
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
		background-color: #f3f4f6;
	}

	.menu-icon {
		width: 24px;
		height: 24px;
		fill: #374151;
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
		color: #4b5563;
		text-decoration: none;
		transition: color 0.2s ease;
	}

	.nav-link:hover {
		color: #1e3a8a;
	}

	.login-btn {
		padding: 0.6rem 1.2rem;
		background-color: #1e3a8a;
		color: white;
		border: none;
		border-radius: 8px;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		transition: background-color 0.2s ease;
	}

	.login-btn:hover {
		background-color: #1e40af;
	}

	.hero-section {
		padding: 4rem 0;
		background-color: #f0f9eb; /* Light green background */
		text-align: center;
	}

	.hero-container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 1rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 2rem;
	}

	.hero-content {
		flex: 1;
		text-align: left;
	}

	.hero-title {
		font-size: 3.5rem;
		font-weight: 800;
		color: #1e3a8a;
		margin-bottom: 1.5rem;
	}

	.hero-subtitle {
		font-size: 1.25rem;
		color: #4b5563;
		margin-bottom: 2.5rem;
		line-height: 1.8;
	}

	.hero-actions {
		display: flex;
		gap: 1rem;
	}

	.cta-btn {
		padding: 0.8rem 1.5rem;
		border-radius: 10px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: background-color 0.2s ease, transform 0.2s ease;
	}

	.cta-btn.primary {
		background-color: #1e3a8a;
		color: white;
		border: none;
	}

	.cta-btn.primary:hover {
		background-color: #1e40af;
		transform: translateY(-2px);
	}

	.cta-btn.secondary {
		background-color: #e0e7ff;
		color: #1e3a8a;
		border: none;
	}

	.cta-btn.secondary:hover {
		background-color: #dbe4ff;
		transform: translateY(-2px);
	}

	.hero-visual {
		flex: 1;
		display: flex;
		justify-content: center;
	}

	.hero-image-container {
		width: 400px;
		height: 400px;
		border-radius: 20px;
		overflow: hidden;
		box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
	}

	.hero-app-image {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	.features-section,
	.products-section,
	.scp-programs-section,
	.about-section,
	.contact-section {
		padding: 4rem 0;
		text-align: center;
	}

	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 1rem;
	}

	.section-header {
		margin-bottom: 3rem;
	}

	.section-header h2 {
		font-size: 2.5rem;
		font-weight: 700;
		color: #1e3a8a;
		margin-bottom: 0.8rem;
	}

	.section-header p {
		font-size: 1.1rem;
		color: #6b7280;
		margin-bottom: 2rem;
	}

	.features-grid,
	.products-preview {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 2rem;
	}

	.feature-card,
	.product-category {
		background: white;
		padding: 2rem;
		border-radius: 15px;
		box-shadow: 0 8px 15px rgba(0, 0, 0, 0.08);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		transition: transform 0.3s ease, box-shadow 0.3s ease;
	}

	.feature-card:hover,
	.product-category:hover {
		transform: translateY(-5px);
		box-shadow: 0 12px 20px rgba(0, 0, 0, 0.12);
	}

	.feature-icon,
	.product-category h3 {
		font-size: 3rem;
		color: #1e3a8a;
	}

	.feature-card p,
	.product-category p {
		font-size: 0.95rem;
		color: #4b5563;
		line-height: 1.6;
	}

	.about-section {
		background-color: #f9fafb;
	}

	.about-content {
		display: flex;
		align-items: center;
		gap: 3rem;
		margin-top: 2rem;
	}

	.about-text {
		flex: 1;
		text-align: left;
	}

	.about-text h2 {
		font-size: 2.5rem;
		font-weight: 700;
		color: #1e3a8a;
		margin-bottom: 1.5rem;
	}

	.about-text p {
		font-size: 1.1rem;
		color: #4b5563;
		margin-bottom: 2.5rem;
		line-height: 1.8;
	}

	.stats {
		display: flex;
		gap: 2rem;
	}

	.stat {
		text-align: center;
	}

	.stat-number {
		font-size: 2.5rem;
		font-weight: 800;
		color: #1e3a8a;
		display: block;
		margin-bottom: 0.5rem;
	}

	.stat-label {
		font-size: 0.9rem;
		color: #6b7280;
	}

	.about-visual {
		flex: 1;
		display: flex;
		justify-content: center;
	}

	.about-image-container {
		width: 400px;
		height: 400px;
		border-radius: 20px;
		overflow: hidden;
		box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
	}

	.about-image {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	.contact-section {
		background-color: #f0f9eb; /* Light green background */
		padding-bottom: 0; /* Remove extra padding */
	}

	.contact-content {
		display: flex;
		gap: 3rem;
		margin-top: 2rem;
	}

	.contact-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.contact-item {
		display: flex;
		align-items: center;
		gap: 1rem;
		font-size: 1.1rem;
		color: #4b5563;
	}

	.contact-item svg {
		width: 28px;
		height: 28px;
		fill: #1e3a8a;
	}

	.contact-item h4 {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		color: #1e3a8a;
	}

	.contact-item p {
		margin: 0;
		font-size: 0.9rem;
		color: #6b7280;
	}

	.contact-form {
		flex: 1;
		background: white;
		padding: 2rem;
		border-radius: 15px;
		box-shadow: 0 8px 15px rgba(0, 0, 0, 0.08);
	}

	.form {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
	}

	.form-group input,
	.form-group textarea {
		padding: 0.8rem 1rem;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		font-size: 1rem;
		transition: border-color 0.2s ease, box-shadow 0.2s ease;
	}

	.form-group input:focus,
	.form-group textarea:focus {
		border-color: #1e3a8a;
		box-shadow: 0 0 0 3px rgba(30, 58, 138, 0.2);
		outline: none;
	}

	.form-group textarea {
		min-height: 100px;
		resize: vertical;
		padding-top: 0.8rem;
	}

	.submit-btn {
		padding: 0.8rem 1.5rem;
		background-color: #1e3a8a;
		color: white;
		border: none;
		border-radius: 10px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: background-color 0.2s ease, transform 0.2s ease;
	}

	.submit-btn:hover {
		background-color: #1e40af;
		transform: translateY(-2px);
	}

	.landing-footer {
		background-color: #1e3a8a;
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

	/* SCP Programs Section */
	.scp-programs-section {
		background-color: #f9fafb;
	}

	.update-date {
		font-size: 1rem;
		color: #6b7280;
		font-style: italic;
		margin-top: -1rem;
		margin-bottom: 2rem;
	}

	.scp-programs-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 2rem;
		margin-top: 2rem;
	}

	.scp-program-card {
		background: white;
		border-radius: 15px;
		box-shadow: 0 8px 15px rgba(0, 0, 0, 0.08);
		overflow: hidden;
		transition: transform 0.3s ease, box-shadow 0.3s ease;
		cursor: pointer;
		display: flex;
		flex-direction: column;
	}

	.scp-program-card:hover {
		transform: translateY(-5px);
		box-shadow: 0 12px 20px rgba(0, 0, 0, 0.12);
	}

	.program-image-container {
		width: 100%;
		height: 400px;
		overflow: hidden;
		background-color: #f3f4f6;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.program-image-container img {
		width: 100%;
		height: 100%;
		object-fit: contain;
		transition: transform 0.3s ease;
	}

	.scp-program-card:hover .program-image-container img {
		transform: scale(1.05);
	}

	.scp-program-card h3 {
		padding: 1.5rem;
		margin: 0;
		font-size: 1.1rem;
		font-weight: 600;
		color: #1e3a8a;
		text-align: left;
		line-height: 1.4;
	}

	/* Image Overlay */
	.image-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: rgba(0, 0, 0, 0.9);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 10000;
		padding: 2rem;
		animation: fadeIn 0.3s ease;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.close-overlay {
		position: absolute;
		top: 2rem;
		right: 2rem;
		background: rgba(255, 255, 255, 0.1);
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-radius: 50%;
		width: 50px;
		height: 50px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.3s ease;
		z-index: 10001;
	}

	.close-overlay:hover {
		background: rgba(255, 255, 255, 0.2);
		border-color: rgba(255, 255, 255, 0.5);
		transform: rotate(90deg);
	}

	.close-overlay svg {
		width: 24px;
		height: 24px;
		stroke: white;
	}

	.overlay-image-container {
		max-width: 90%;
		max-height: 90%;
		display: flex;
		align-items: center;
		justify-content: center;
		animation: zoomIn 0.3s ease;
	}

	@keyframes zoomIn {
		from {
			transform: scale(0.9);
			opacity: 0;
		}
		to {
			transform: scale(1);
			opacity: 1;
		}
	}

	.overlay-image-container img {
		max-width: 100%;
		max-height: 90vh;
		object-fit: contain;
		border-radius: 8px;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
	}

	/* Responsive Design */
	@media (max-width: 1024px) {
		.hero-container {
			flex-direction: column;
			text-align: center;
			padding-top: 100px; /* Adjust for fixed header */
		}

		.hero-content {
			text-align: center;
		}

		.hero-actions {
			flex-direction: column;
			gap: 1rem;
		}

		.hero-visual {
			order: -1; /* Move image to the top */
		}

		.features-grid,
		.products-preview,
		.scp-programs-grid {
			grid-template-columns: 1fr;
		}

		.about-content {
			flex-direction: column;
			text-align: center;
			gap: 2rem;
		}

		.about-visual {
			order: -1; /* Move image to the top */
		}

		.contact-content {
			flex-direction: column;
			gap: 2rem;
		}

		.contact-info {
			order: -1; /* Move info to the top */
		}

		.contact-form {
			width: 100%;
		}

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
	}

	@media (max-width: 768px) {
		section {
			padding-inline: 0.8rem !important;
		}

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
			border-bottom: 1px solid #f3f4f6;
			width: 100%;
			text-align: center;
		}

		.nav-link:last-child {
			border-bottom: none;
		}

		.login-btn {
			width: 100%;
			margin-top: 0.5rem;
		}

		.hero-title {
			font-size: 2.5rem;
		}

		.hero-subtitle {
			font-size: 1rem;
		}

		.cta-btn {
			width: 100%;
			padding: 0.7rem 1.2rem;
		}

		.hero-image-container,
		.about-image-container {
			width: 300px;
			height: 300px;
		}

		.feature-icon,
		.product-category h3 {
			font-size: 2.5rem;
		}

		.feature-card p,
		.product-category p {
			font-size: 0.85rem;
		}

		.stats {
			flex-direction: column;
			gap: 1rem;
		}

		.stat-number {
			font-size: 2rem;
		}

		.stat-label {
			font-size: 0.8rem;
		}

		.contact-item {
			font-size: 1rem;
		}

		.contact-item svg {
			width: 24px;
			height: 24px;
		}

		.contact-item h4 {
			font-size: 0.9rem;
		}

		.contact-item p {
			font-size: 0.8rem;
		}

		.program-image-container {
			height: 300px;
		}

		.scp-program-card h3 {
			font-size: 1rem;
			padding: 1rem;
		}

		.close-overlay {
			top: 1rem;
			right: 1rem;
			width: 40px;
			height: 40px;
		}

		.close-overlay svg {
			width: 20px;
			height: 20px;
		}

		.overlay-image-container {
			max-width: 95%;
			padding: 1rem;
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
		.landing-page {
			padding-top: 70px;
		}

		.header-container {
			padding: 0 1rem;
		}

		.logo-text h1 {
			font-size: 1.5rem;
			display: none;
		}

		.logo-text p {
			font-size: 0.8rem;
			display: none;
		}

		.hero-section {
			padding: 2rem 0;
		}

		.hero-title {
			font-size: 2rem;
		}

		.hero-subtitle {
			font-size: 0.9rem;
		}

		.hero-image-container,
		.about-image-container {
			width: 250px;
			height: 250px;
		}

		.section-header h2 {
			font-size: 2rem;
		}

		.section-header p {
			font-size: 1rem;
		}

		.feature-card,
		.product-category {
			padding: 1.5rem;
		}

		.contact-form {
			padding: 1.5rem;
		}
	}
</style>
