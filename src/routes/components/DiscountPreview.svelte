<script lang="ts">
	import {
		shouldShowDiscountPreview,
		calculateDiscountPercentage,
	} from '../lib/utils/productFormUtils';

	export let price: number | null | undefined;
	export let oldPrice: number | null | undefined;

	$: showDiscount = shouldShowDiscountPreview(price, oldPrice);

	$: discountPercentage = showDiscount ? calculateDiscountPercentage(oldPrice!, price!) : 0;
</script>

{#if showDiscount}
	<div class="discount-preview">
		<div class="discount-icon">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M12 2L2 7l10 5 10-5-10-5z" />
				<path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
			</svg>
		</div>
		<div class="discount-content">
			<p class="discount-label">Vista previa</p>
			<p class="discount-amount">{discountPercentage}% de descuento</p>
		</div>
	</div>
{/if}

<style>
	.discount-preview {
		margin-top: 0.5rem;
		padding: 1.25rem;
		background: linear-gradient(135deg, var(--primary-50) 0%, var(--secondary-50) 100%);
		border-radius: var(--border-radius);
		border: 2px solid var(--color-primary);
		display: flex;
		align-items: center;
		gap: 1rem;
		box-shadow: 0 2px 8px rgba(0, 170, 178, 0.1);
	}

	.discount-icon {
		width: 48px;
		height: 48px;
		border-radius: 12px;
		background: linear-gradient(135deg, var(--color-primary) 0%, var(--secondary-500) 100%);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.discount-icon svg {
		width: 24px;
		height: 24px;
		stroke: white;
	}

	.discount-content {
		flex: 1;
	}

	.discount-label {
		margin: 0 0 0.25rem 0;
		font-size: 0.8125rem;
		color: var(--color-text-secondary);
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.discount-amount {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 700;
		background: linear-gradient(135deg, var(--color-primary) 0%, var(--secondary-500) 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}
</style>
