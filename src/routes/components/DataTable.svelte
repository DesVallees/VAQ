<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let data: any[] = [];
  export let columns: {
    key: string;
    label: string;
    sortable?: boolean;
    width?: string;
    render?: (value: any, row: any) => string;
  }[] = [];
  export let loading = false;
  export let total = 0;
  export let page = 1;
  export let limit = 10;
  export let searchTerm = '';
  export let sortBy = '';
  export let sortOrder: 'asc' | 'desc' = 'asc';
  export let selectedRows: string[] = [];
  export let selectable = false;

  const dispatch = createEventDispatcher();

  $: totalPages = Math.ceil(total / limit);
  $: startIndex = (page - 1) * limit + 1;
  $: endIndex = Math.min(page * limit, total);

  const handleSort = (key: string) => {
    if (sortBy === key) {
      sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      sortBy = key;
      sortOrder = 'asc';
    }
    dispatch('sort', { sortBy, sortOrder });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      dispatch('pageChange', newPage);
    }
  };

  const handleSearch = (event: Event) => {
    const target = event.target as HTMLInputElement;
    dispatch('search', target.value);
  };

  const handleRowSelect = (id: string, checked: boolean) => {
    if (checked) {
      selectedRows = [...selectedRows, id];
    } else {
      selectedRows = selectedRows.filter(rowId => rowId !== id);
    }
    dispatch('selectionChange', selectedRows);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      selectedRows = data.map(row => row.id);
    } else {
      selectedRows = [];
    }
    dispatch('selectionChange', selectedRows);
  };

  const handleRowClick = (row: any) => {
    dispatch('rowClick', row);
  };

  const handleEdit = (row: any) => {
    dispatch('edit', row);
  };

  const handleDelete = (row: any) => {
    dispatch('delete', row);
  };

  const formatValue = (value: any, column: any, row: any) => {
    if (column.render) {
      return column.render(value, row);
    }
    
    if (value === null || value === undefined) {
      return '-';
    }
    
    if (typeof value === 'boolean') {
      return value ? 'Sí' : 'No';
    }
    
    if (value instanceof Date) {
      return value.toLocaleDateString('es-CO');
    }
    
    if (typeof value === 'number') {
      return new Intl.NumberFormat('es-CO').format(value);
    }
    
    return String(value);
  };
</script>

<div class="data-table-container">
  <!-- Search and Actions Bar -->
  <div class="table-header">
    <div class="search-container">
      <svg class="search-icon" viewBox="0 0 24 24">
        <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
      </svg>
      <input
        type="text"
        placeholder="Buscar..."
        value={searchTerm}
        on:input={handleSearch}
        class="search-input"
      />
    </div>
    
    <div class="table-actions">
      {#if selectable && selectedRows.length > 0}
        <button class="action-btn secondary" on:click={() => dispatch('bulkDelete', selectedRows)}>
          Eliminar ({selectedRows.length})
        </button>
      {/if}
      <button class="action-btn primary" on:click={() => dispatch('create')}>
        <svg viewBox="0 0 24 24">
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
        </svg>
        Crear Nuevo
      </button>
    </div>
  </div>

  <!-- Table -->
  <div class="table-wrapper">
    <table class="data-table">
      <thead>
        <tr>
          {#if selectable}
            <th class="checkbox-cell">
              <input
                type="checkbox"
                checked={selectedRows.length === data.length && data.length > 0}
                on:change={(e) => handleSelectAll(e.target.checked)}
              />
            </th>
          {/if}
          {#each columns as column}
            <th 
              class="table-header-cell"
              class:sortable={column.sortable}
              style="width: {column.width || 'auto'}"
              on:click={() => column.sortable && handleSort(column.key)}
            >
              <div class="header-content">
                {column.label}
                {#if column.sortable}
                  <div class="sort-indicator">
                    {#if sortBy === column.key}
                      {#if sortOrder === 'asc'}
                        <svg viewBox="0 0 24 24">
                          <path d="M7 14l5-5 5 5z"/>
                        </svg>
                      {:else}
                        <svg viewBox="0 0 24 24">
                          <path d="M7 10l5 5 5-5z"/>
                        </svg>
                      {/if}
                    {:else}
                      <svg viewBox="0 0 24 24">
                        <path d="M7 10l5 5 5-5z"/>
                      </svg>
                    {/if}
                  </div>
                {/if}
              </div>
            </th>
          {/each}
          <th class="actions-cell">Acciones</th>
        </tr>
      </thead>
      <tbody>
        {#if loading}
          <tr>
            <td colspan={columns.length + (selectable ? 2 : 1)} class="loading-cell">
              <div class="loading-spinner"></div>
              <span>Cargando datos...</span>
            </td>
          </tr>
        {:else if data.length === 0}
          <tr>
            <td colspan={columns.length + (selectable ? 2 : 1)} class="empty-cell">
              <div class="empty-state">
                <svg viewBox="0 0 24 24">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                </svg>
                <p>No se encontraron datos</p>
                {#if searchTerm}
                  <p class="empty-subtitle">Intenta con otros términos de búsqueda</p>
                {/if}
              </div>
            </td>
          </tr>
        {:else}
          {#each data as row (row.id)}
            <tr class="table-row" on:click={() => handleRowClick(row)}>
              {#if selectable}
                <td class="checkbox-cell" on:click|stopPropagation>
                  <input
                    type="checkbox"
                    checked={selectedRows.includes(row.id)}
                    on:change={(e) => handleRowSelect(row.id, e.target.checked)}
                  />
                </td>
              {/if}
              {#each columns as column}
                <td class="table-cell">
                  {formatValue(row[column.key], column, row)}
                </td>
              {/each}
              <td class="actions-cell" on:click|stopPropagation>
                <div class="action-buttons">
                  <button class="action-btn-icon edit" on:click={() => handleEdit(row)} title="Editar">
                    <svg viewBox="0 0 24 24">
                      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                    </svg>
                  </button>
                  <button class="action-btn-icon delete" on:click={() => handleDelete(row)} title="Eliminar">
                    <svg viewBox="0 0 24 24">
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>

  <!-- Pagination -->
  {#if totalPages > 1}
    <div class="pagination">
      <div class="pagination-info">
        Mostrando {startIndex}-{endIndex} de {total} resultados
      </div>
      
      <div class="pagination-controls">
        <button
          class="pagination-btn"
          disabled={page === 1}
          on:click={() => handlePageChange(page - 1)}
        >
          <svg viewBox="0 0 24 24">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
          </svg>
          Anterior
        </button>
        
                          <div class="page-numbers">
           {#each Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
             const pageNum = i + 1;
             if (totalPages <= 5) {
               return pageNum;
             } else if (page <= 3) {
               return pageNum;
             } else if (page >= totalPages - 2) {
               return totalPages - 4 + pageNum;
             } else {
               return page - 2 + pageNum;
             }
           }) as number[]}
             <button
               class="page-btn"
               class:active={page === pageNum}
               on:click={() => handlePageChange(pageNum)}
             >
               {pageNum}
             </button>
           {/each}
         </div>
        
        <button
          class="pagination-btn"
          disabled={page === totalPages}
          on:click={() => handlePageChange(page + 1)}
        >
          Siguiente
          <svg viewBox="0 0 24 24">
            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
          </svg>
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .data-table-container {
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    overflow: hidden;
  }

  .table-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .search-container {
    position: relative;
    flex: 1;
    max-width: 400px;
  }

  .search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    width: 20px;
    height: 20px;
    fill: #9ca3af;
  }

  .search-input {
    width: 100%;
    padding: 0.75rem 1rem 0.75rem 2.5rem;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    font-size: 0.875rem;
    transition: all 0.2s ease;
  }

  .search-input:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  .table-actions {
    display: flex;
    gap: 0.75rem;
  }

  .action-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border: none;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .action-btn svg {
    width: 16px;
    height: 16px;
  }

  .action-btn.primary {
    background: #667eea;
    color: white;
  }

  .action-btn.primary:hover {
    background: #5a67d8;
    transform: translateY(-1px);
  }

  .action-btn.secondary {
    background: #f3f4f6;
    color: #374151;
  }

  .action-btn.secondary:hover {
    background: #e5e7eb;
  }

  .table-wrapper {
    overflow-x: auto;
  }

  .data-table {
    width: 100%;
    border-collapse: collapse;
  }

  .table-header-cell {
    background: #f9fafb;
    padding: 1rem;
    text-align: left;
    font-weight: 600;
    font-size: 0.875rem;
    color: #374151;
    border-bottom: 1px solid #e5e7eb;
  }

  .table-header-cell.sortable {
    cursor: pointer;
    user-select: none;
  }

  .table-header-cell.sortable:hover {
    background: #f3f4f6;
  }

  .header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .sort-indicator svg {
    width: 16px;
    height: 16px;
    fill: #9ca3af;
  }

  .table-header-cell.sortable:hover .sort-indicator svg {
    fill: #667eea;
  }

  .checkbox-cell {
    width: 48px;
    text-align: center;
  }

  .checkbox-cell input[type="checkbox"] {
    width: 16px;
    height: 16px;
    cursor: pointer;
  }

  .table-row {
    transition: background-color 0.2s ease;
  }

  .table-row:hover {
    background: #f9fafb;
  }

  .table-cell {
    padding: 1rem;
    border-bottom: 1px solid #f3f4f6;
    font-size: 0.875rem;
    color: #374151;
  }

  .actions-cell {
    width: 120px;
    text-align: center;
  }

  .action-buttons {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
  }

  .action-btn-icon {
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .action-btn-icon svg {
    width: 16px;
    height: 16px;
  }

  .action-btn-icon.edit {
    background: #dbeafe;
    color: #1d4ed8;
  }

  .action-btn-icon.edit:hover {
    background: #bfdbfe;
  }

  .action-btn-icon.delete {
    background: #fee2e2;
    color: #dc2626;
  }

  .action-btn-icon.delete:hover {
    background: #fecaca;
  }

  .loading-cell,
  .empty-cell {
    text-align: center;
    padding: 3rem 1rem;
  }

  .loading-spinner {
    width: 24px;
    height: 24px;
    border: 2px solid #e5e7eb;
    border-top: 2px solid #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    color: #6b7280;
  }

  .empty-state svg {
    width: 48px;
    height: 48px;
    fill: #d1d5db;
    margin-bottom: 1rem;
  }

  .empty-state p {
    margin: 0;
    font-size: 1rem;
    font-weight: 500;
  }

  .empty-subtitle {
    font-size: 0.875rem !important;
    opacity: 0.7;
  }

  .pagination {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-top: 1px solid #e5e7eb;
  }

  .pagination-info {
    font-size: 0.875rem;
    color: #6b7280;
  }

  .pagination-controls {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .pagination-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border: 1px solid #d1d5db;
    background: white;
    color: #374151;
    border-radius: 6px;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .pagination-btn:hover:not(:disabled) {
    background: #f9fafb;
    border-color: #9ca3af;
  }

  .pagination-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .pagination-btn svg {
    width: 16px;
    height: 16px;
  }

  .page-numbers {
    display: flex;
    gap: 0.25rem;
  }

  .page-btn {
    width: 36px;
    height: 36px;
    border: 1px solid #d1d5db;
    background: white;
    color: #374151;
    border-radius: 6px;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .page-btn:hover {
    background: #f9fafb;
    border-color: #9ca3af;
  }

  .page-btn.active {
    background: #667eea;
    color: white;
    border-color: #667eea;
  }

  @media (max-width: 768px) {
    .table-header {
      flex-direction: column;
      gap: 1rem;
      align-items: stretch;
    }

    .search-container {
      max-width: none;
    }

    .table-actions {
      justify-content: center;
    }

    .pagination {
      flex-direction: column;
      gap: 1rem;
    }

    .pagination-controls {
      flex-wrap: wrap;
      justify-content: center;
    }
  }
</style>
