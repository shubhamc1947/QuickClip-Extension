document.addEventListener('DOMContentLoaded', function() {
  // DOM elements
  const addBtn = document.getElementById('add-btn');
  const modal = document.getElementById('add-edit-modal');
  const saveBtn = document.getElementById('save-btn');
  const cancelBtn = document.getElementById('cancel-btn');
  const itemsContainer = document.getElementById('items-container');
  const titleInput = document.getElementById('item-title');
  const valueInput = document.getElementById('item-value');
  const successMessage = document.getElementById('success-message');
  const typeSelect = document.getElementById('item-type');
  const templateOptionsDiv = document.getElementById('template-options');
  const importExportBtn = document.getElementById('import-export-btn');
  const importExportModal = document.getElementById('import-export-modal');
  const exportDataBtn = document.getElementById('export-data-btn');
  const importDataBtn = document.getElementById('import-data-btn');
  const importInput = document.getElementById('import-input');
  const closeImportExportBtn = document.getElementById('close-import-export-btn');
  
  let editingItemId = null;
  let draggedElement = null;
  let draggedItemId = null;
  const STORAGE_KEY = 'quickClipItems';

  // Load items from localStorage
  function loadItems() {
    const storedData = localStorage.getItem(STORAGE_KEY);
    const items = storedData ? JSON.parse(storedData) : [];
    renderItems(items);
  }

  // Save items to localStorage
  function saveItems(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  // Render all items
  function renderItems(items) {
    itemsContainer.innerHTML = '';
    
    if (items.length === 0) {
      itemsContainer.innerHTML = '<div class="no-items">No items yet. Click "Add New" to create your first item.</div>';
      return;
    }
    
    items.forEach((item, index) => {
      const itemElement = document.createElement('div');
      itemElement.className = 'item';
      itemElement.draggable = true;
      itemElement.setAttribute('data-id', item.id);
      itemElement.setAttribute('data-index', index);
      
      // Add a badge for templates
      const typeBadge = item.type === 'template' 
        ? `<span class="type-badge template-badge">Template</span>` 
        : '';
      
      // Show preview of content
      let displayValue = escapeHtml(item.value);
      if (item.type === 'template') {
        // Highlight template placeholders in the preview
        displayValue = displayValue.replace(/\{([^{}]+)\}/g, '<span class="placeholder">{$1}</span>');
      }
      
      itemElement.innerHTML = `
        <div class="drag-handle" title="Drag to reorder">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </div>
        <div class="item-content">
          <div class="item-title">${escapeHtml(item.title)} ${typeBadge}</div>
          <div class="item-value">${displayValue}</div>
        </div>
        <div class="item-actions">
          <button class="copy-btn" data-id="${item.id}" title="${item.type === 'template' ? 'Fill template' : 'Copy to clipboard'}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
            </svg>
          </button>
          <button class="edit-btn" data-id="${item.id}" title="Edit">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 3a2.85 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
            </svg>
          </button>
          <button class="delete-btn" data-id="${item.id}" title="Delete">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
            </svg>
          </button>
        </div>
      `;
      itemsContainer.appendChild(itemElement);
    });

    // Add event listeners to buttons
    document.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', handleCopy);
    });
    
    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', handleEdit);
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', handleDelete);
    });

    // Add drag and drop event listeners
    addDragAndDropListeners();
  }

  // Add drag and drop event listeners
  function addDragAndDropListeners() {
    const draggableItems = document.querySelectorAll('.item[draggable="true"]');
    
    draggableItems.forEach(item => {
      item.addEventListener('dragstart', handleDragStart);
      item.addEventListener('dragover', handleDragOver);
      item.addEventListener('dragenter', handleDragEnter);
      item.addEventListener('dragleave', handleDragLeave);
      item.addEventListener('drop', handleDrop);
      item.addEventListener('dragend', handleDragEnd);
    });
  }

  // Drag and drop handlers
  function handleDragStart(e) {
    draggedElement = this;
    draggedItemId = this.getAttribute('data-id');
    this.classList.add('dragging');
    
    // Set drag effect
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.outerHTML);
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (this !== draggedElement) {
      this.classList.add('drag-over');
      
      // Determine if we should insert above or below
      const rect = this.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const mouseY = e.clientY;
      
      if (mouseY < midY) {
        this.classList.add('drag-over-top');
        this.classList.remove('drag-over-bottom');
      } else {
        this.classList.add('drag-over-bottom');
        this.classList.remove('drag-over-top');
      }
    }
  }

  function handleDragEnter(e) {
    e.preventDefault();
  }

  function handleDragLeave(e) {
    // Only remove classes if we're actually leaving the element
    if (!this.contains(e.relatedTarget)) {
      this.classList.remove('drag-over', 'drag-over-top', 'drag-over-bottom');
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    
    if (this !== draggedElement && draggedElement) {
      const rect = this.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const mouseY = e.clientY;
      
      // Get current items order
      const storedData = localStorage.getItem(STORAGE_KEY);
      let items = storedData ? JSON.parse(storedData) : [];
      
      // Find the dragged item and target item
      const draggedIndex = items.findIndex(item => item.id === draggedItemId);
      const targetIndex = items.findIndex(item => item.id === this.getAttribute('data-id'));
      
      if (draggedIndex !== -1 && targetIndex !== -1) {
        // Remove the dragged item from its current position
        const draggedItem = items.splice(draggedIndex, 1)[0];
        
        // Determine new position
        let newIndex;
        if (mouseY < midY) {
          // Insert above target
          newIndex = targetIndex > draggedIndex ? targetIndex - 1 : targetIndex;
        } else {
          // Insert below target
          newIndex = targetIndex > draggedIndex ? targetIndex : targetIndex + 1;
        }
        
        // Insert at new position
        items.splice(newIndex, 0, draggedItem);
        
        // Save and re-render
        saveItems(items);
        loadItems();
        showSuccessMessage('Items reordered successfully!');
      }
    }
    
    // Clean up classes
    this.classList.remove('drag-over', 'drag-over-top', 'drag-over-bottom');
  }

  function handleDragEnd(e) {
    // Clean up all drag-related classes
    document.querySelectorAll('.item').forEach(item => {
      item.classList.remove('dragging', 'drag-over', 'drag-over-top', 'drag-over-bottom');
    });
    
    draggedElement = null;
    draggedItemId = null;
  }

  // Handle copying item to clipboard
  function handleCopy(e) {
    const itemId = e.currentTarget.getAttribute('data-id');
    const storedData = localStorage.getItem(STORAGE_KEY);
    const items = storedData ? JSON.parse(storedData) : [];
    const item = items.find(item => item.id === itemId);
    
    if (!item) return;
    
    if (item.type === 'template') {
      // For templates, open a fill-in dialog
      openTemplateFillDialog(item);
    } else {
      // For regular items, directly copy to clipboard
      navigator.clipboard.writeText(item.value).then(() => {
        showSuccessMessage(`${item.title} copied to clipboard!`);
      });
    }
  }
  
  // Open dialog to fill in template placeholders
  function openTemplateFillDialog(template) {
    // Extract all placeholders from the template
    const placeholders = [...new Set(template.value.match(/\{([^{}]+)\}/g) || [])];
    
    if (placeholders.length === 0) {
      // If no placeholders found, just copy the template as is
      navigator.clipboard.writeText(template.value).then(() => {
        showSuccessMessage(`${template.title} copied to clipboard!`);
      });
      return;
    }
    
    // Create modal for filling in placeholders
    const fillModal = document.createElement('div');
    fillModal.className = 'modal';
    fillModal.style.display = 'block';
    
    let formContent = '<div class="modal-content"><h3>Fill in template values</h3>';
    
    // Create input field for each placeholder
    placeholders.forEach(placeholder => {
      const placeholderName = placeholder.substring(1, placeholder.length - 1);
      formContent += `
        <div class="form-group">
          <label for="placeholder-${placeholderName}">${placeholderName}:</label>
          <input type="text" id="placeholder-${placeholderName}" placeholder="Enter ${placeholderName}">
        </div>
      `;
    });
    
    formContent += `
      <div class="modal-buttons">
        <button class="cancel-btn" id="cancel-fill-btn">Cancel</button>
        <button class="save-btn" id="apply-template-btn">Copy to Clipboard</button>
      </div>
    </div>`;
    
    fillModal.innerHTML = formContent;
    document.body.appendChild(fillModal);
    
    // Add event listeners
    document.getElementById('cancel-fill-btn').addEventListener('click', () => {
      document.body.removeChild(fillModal);
    });
    
    document.getElementById('apply-template-btn').addEventListener('click', () => {
      let filledTemplate = template.value;
      
      // Replace each placeholder with the input value
      placeholders.forEach(placeholder => {
        const placeholderName = placeholder.substring(1, placeholder.length - 1);
        const inputValue = document.getElementById(`placeholder-${placeholderName}`).value;
        filledTemplate = filledTemplate.replace(new RegExp(placeholder, 'g'), inputValue);
      });
      
      // Copy to clipboard
      navigator.clipboard.writeText(filledTemplate).then(() => {
        document.body.removeChild(fillModal);
        showSuccessMessage(`Filled template copied to clipboard!`);
      });
    });
  }

  // Show success message
  function showSuccessMessage(message) {
    successMessage.textContent = message;
    successMessage.style.opacity = '1';
    
    setTimeout(() => {
      successMessage.style.opacity = '0';
    }, 2000);
  }

  // Handle item edit
  function handleEdit(e) {
    const itemId = e.currentTarget.getAttribute('data-id');
    editingItemId = itemId;
    
    const storedData = localStorage.getItem(STORAGE_KEY);
    const items = storedData ? JSON.parse(storedData) : [];
    const item = items.find(item => item.id === itemId);
    
    if (item) {
      titleInput.value = item.title;
      valueInput.value = item.value;
      typeSelect.value = item.type || 'text';
      
      // Show/hide template options based on type
      templateOptionsDiv.style.display = typeSelect.value === 'template' ? 'block' : 'none';
      
      modal.style.display = 'block';
    }
  }

  // Handle item delete
  function handleDelete(e) {
    const itemId = e.currentTarget.getAttribute('data-id');
    
    if (confirm('Are you sure you want to delete this item?')) {
      const storedData = localStorage.getItem(STORAGE_KEY);
      let items = storedData ? JSON.parse(storedData) : [];
      items = items.filter(item => item.id !== itemId);
      
      saveItems(items);
      loadItems();
      showSuccessMessage('Item deleted successfully!');
    }
  }

  // Handle type change to show/hide template options
  typeSelect.addEventListener('change', function() {
    templateOptionsDiv.style.display = this.value === 'template' ? 'block' : 'none';
  });

  // Open modal for adding new item
  addBtn.addEventListener('click', function() {
    editingItemId = null;
    titleInput.value = '';
    valueInput.value = '';
    typeSelect.value = 'text';
    templateOptionsDiv.style.display = 'none';
    modal.style.display = 'block';
  });

  // Close modal
  cancelBtn.addEventListener('click', function() {
    modal.style.display = 'none';
  });

  // Open import/export modal
  importExportBtn.addEventListener('click', function() {
    importExportModal.style.display = 'block';
  });

  // Close import/export modal
  closeImportExportBtn.addEventListener('click', function() {
    importExportModal.style.display = 'none';
  });

  // Export data
  exportDataBtn.addEventListener('click', function() {
    const storedData = localStorage.getItem(STORAGE_KEY);
    const items = storedData ? JSON.parse(storedData) : [];
    
    const dataStr = JSON.stringify(items, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'quickclip-backup.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    showSuccessMessage('Data exported successfully!');
  });

  // Import data
  importDataBtn.addEventListener('click', function() {
    importInput.click();
  });

  // Handle file selection for import
  importInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const importedData = JSON.parse(e.target.result);
        
        if (Array.isArray(importedData)) {
          if (confirm(`Import ${importedData.length} items? This will replace your current data.`)) {
            saveItems(importedData);
            loadItems();
            importExportModal.style.display = 'none';
            showSuccessMessage('Data imported successfully!');
          }
        } else {
          alert('Invalid data format. Please select a valid QuickClip backup file.');
        }
      } catch (error) {
        alert('Error importing data: ' + error.message);
      }
      
      // Reset the file input
      importInput.value = '';
    };
    reader.readAsText(file);
  });

  // Save item (create or update)
  saveBtn.addEventListener('click', function() {
    const title = titleInput.value.trim();
    const value = valueInput.value.trim();
    const type = typeSelect.value;
    
    if (!title || !value) {
      alert('Please fill in all required fields');
      return;
    }
    
    const storedData = localStorage.getItem(STORAGE_KEY);
    let items = storedData ? JSON.parse(storedData) : [];
    
    if (editingItemId) {
      // Update existing item
      items = items.map(item => {
        if (item.id === editingItemId) {
          return { ...item, title, value, type };
        }
        return item;
      });
      showSuccessMessage('Item updated successfully!');
    } else {
      // Create new item
      const newItem = {
        id: generateId(),
        title,
        value,
        type,
        createdAt: new Date().toISOString()
      };
      items.push(newItem);
      showSuccessMessage('Item added successfully!');
    }
    
    saveItems(items);
    modal.style.display = 'none';
    loadItems();
  });

  // Generate unique ID
  function generateId() {
    return 'id_' + Math.random().toString(36).substr(2, 9);
  }
  
  // Escape HTML to prevent XSS
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Click outside modal to close
  window.addEventListener('click', function(e) {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
    if (e.target === importExportModal) {
      importExportModal.style.display = 'none';
    }
  });

  // Initial load
  loadItems();
});