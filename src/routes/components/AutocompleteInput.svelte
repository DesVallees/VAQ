<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { onMount, onDestroy } from 'svelte';

	export let placeholder: string = '';
	export let options: Array<{ id: string; label: string; description?: string }> = [];
	export let selectedOptions: string[] = [];
	export let removeOption: (id: string) => void;
	export let disabled: boolean = false;
	export let error: boolean = false;
	export let helpText: string = '';

	const dispatch = createEventDispatcher();

	let inputElement: HTMLInputElement;
	let dropdownVisible = false;
	let filteredOptions: typeof options = [];
	let selectedIndex = -1;
	let searchTerm = '';

	// Filter options based on search term and exclude already selected ones
	$: {
		if (searchTerm.trim()) {
			filteredOptions = options.filter(
				(option) =>
					!selectedOptions.includes(option.id) &&
					(option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
						option.id.toLowerCase().includes(searchTerm.toLowerCase())),
			);
		} else {
			filteredOptions = options.filter((option) => !selectedOptions.includes(option.id));
		}
		selectedIndex = -1;
	}

	// Handle input changes
	function handleInput() {
		searchTerm = inputElement.value;
		dropdownVisible = true;
		dispatch('input', { value: searchTerm });
	}

	// Handle keydown events
	function handleKeydown(event: KeyboardEvent) {
		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				selectedIndex = Math.min(selectedIndex + 1, filteredOptions.length - 1);
				break;
			case 'ArrowUp':
				event.preventDefault();
				selectedIndex = Math.max(selectedIndex - 1, -1);
				break;
			case 'Enter':
				event.preventDefault();
				if (selectedIndex >= 0 && filteredOptions[selectedIndex]) {
					selectOption(filteredOptions[selectedIndex]);
				}
				break;
			case 'Escape':
				dropdownVisible = false;
				selectedIndex = -1;
				break;
		}
	}

	// Select an option
	function selectOption(option: (typeof options)[0]) {
		dispatch('select', { option });
		searchTerm = '';
		inputElement.value = '';
		dropdownVisible = false;
		selectedIndex = -1;
	}

	// Handle click outside to close dropdown
	function handleClickOutside(event: MouseEvent) {
		if (inputElement && !inputElement.contains(event.target as Node)) {
			dropdownVisible = false;
			selectedIndex = -1;
		}
	}

	// Close dropdown when clicking outside
	onMount(() => {
		document.addEventListener('click', handleClickOutside);
	});

	onDestroy(() => {
		document.removeEventListener('click', handleClickOutside);
	});

	// Get display label for selected option
	function getSelectedOptionLabel(id: string): string {
		const option = options.find((opt) => opt.id === id);
		return option ? option.label : id;
	}
</script>

<div class="autocomplete-container">
	<input
		bind:this={inputElement}
		type="text"
		{placeholder}
		{disabled}
		class:error
		on:input={handleInput}
		on:keydown={handleKeydown}
		on:focus={() => (dropdownVisible = true)}
	/>

	{#if dropdownVisible && filteredOptions.length > 0}
		<div class="dropdown">
			{#each filteredOptions as option, index}
				<div
					class="dropdown-item"
					class:selected={index === selectedIndex}
					on:click={() => selectOption(option)}
					on:mouseenter={() => (selectedIndex = index)}
				>
					<div class="option-label">{option.label}</div>
					{#if option.description}
						<div class="option-description">{option.description}</div>
					{/if}
					<div class="option-id">ID: {option.id}</div>
				</div>
			{/each}
		</div>
	{/if}

	{#if selectedOptions && selectedOptions.length > 0}
		<div class="selected-options">
			{#each selectedOptions as optionId}
				<span class="selected-tag">
					{getSelectedOptionLabel(optionId)}
					<button
						type="button"
						on:click={() => removeOption(optionId)}
						class="remove-tag"
						title="Eliminar"
					>
						×
					</button>
				</span>
			{/each}
		</div>
	{/if}

	{#if helpText}
		<p class="help-text">{helpText}</p>
	{/if}
</div>

<style>
	.autocomplete-container {
		position: relative;
		width: 100%;
	}

	input {
		width: 100%;
		padding: 0.75rem;
		border: 2px solid #e5e7eb;
		border-radius: 8px;
		font-size: 0.875rem;
		transition: all 0.2s ease;
	}

	input:focus {
		outline: none;
		border-color: #667eea;
		box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
	}

	input.error {
		border-color: #ef4444;
	}

	.dropdown {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		background: white;
		border: 2px solid #e5e7eb;
		border-top: none;
		border-radius: 0 0 8px 8px;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
		max-height: 200px;
		overflow-y: auto;
		z-index: 1000;
	}

	.dropdown-item {
		padding: 0.75rem;
		cursor: pointer;
		border-bottom: 1px solid #f3f4f6;
		transition: background-color 0.2s ease;
	}

	.dropdown-item:last-child {
		border-bottom: none;
	}

	.dropdown-item:hover,
	.dropdown-item.selected {
		background-color: #f9fafb;
	}

	.option-label {
		font-weight: 600;
		color: #1f2937;
		margin-bottom: 0.25rem;
	}

	.option-description {
		font-size: 0.875rem;
		color: #6b7280;
		margin-bottom: 0.25rem;
	}

	.option-id {
		font-size: 0.75rem;
		color: #9ca3af;
		font-family: monospace;
	}

	.selected-options {
		margin-top: 0.75rem;
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.selected-tag {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		background-color: #e6f7f8;
		color: #065f46;
		border: 1px solid #b3e8ec;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
	}

	.remove-tag {
		background: none;
		border: none;
		color: #065f46;
		cursor: pointer;
		font-size: 1.25rem;
		font-weight: bold;
		padding: 0;
		width: 20px;
		height: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		transition: all 0.2s ease;
	}

	.remove-tag:hover {
		background-color: #065f46;
		color: white;
	}

	.help-text {
		margin-top: 0.5rem;
		font-size: 0.875rem;
		color: #6b7280;
	}
</style>
