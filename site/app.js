/**
 * Claude Plugins Marketplace - Frontend Application
 */

class PluginMarketplace {
  constructor() {
    this.plugins = [];
    this.filteredPlugins = [];
    this.init();
  }

  async init() {
    await this.loadPlugins();
    this.setupEventListeners();
    this.render();
  }

  async loadPlugins() {
    try {
      const response = await fetch('./api/plugins.json');
      const data = await response.json();
      this.plugins = data.plugins || [];
      this.filteredPlugins = [...this.plugins];
    } catch (error) {
      console.error('Failed to load plugins:', error);
      this.plugins = [];
      this.filteredPlugins = [];
    }
  }

  setupEventListeners() {
    // Search
    const searchInput = document.getElementById('search');
    searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));

    // Filters
    document.getElementById('filter-type').addEventListener('change', () => this.applyFilters());
    document.getElementById('filter-category').addEventListener('change', () => this.applyFilters());

    // Modal
    document.querySelector('.modal-backdrop').addEventListener('click', () => this.closeModal());
    document.querySelector('.modal-close').addEventListener('click', () => this.closeModal());
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeModal();
    });
  }

  handleSearch(query) {
    this.applyFilters(query);
  }

  applyFilters(searchQuery = document.getElementById('search').value) {
    const typeFilter = document.getElementById('filter-type').value;
    const categoryFilter = document.getElementById('filter-category').value;
    const query = searchQuery.toLowerCase().trim();

    this.filteredPlugins = this.plugins.filter(plugin => {
      // Type filter
      if (typeFilter && plugin.type !== typeFilter) return false;

      // Category filter
      if (categoryFilter && (!plugin.categories || !plugin.categories.includes(categoryFilter))) return false;

      // Search query
      if (query) {
        const searchable = [
          plugin.name,
          plugin.description,
          plugin.id,
          ...(plugin.tags || []),
          ...(plugin.categories || [])
        ].join(' ').toLowerCase();

        if (!searchable.includes(query)) return false;
      }

      return true;
    });

    this.render();
  }

  render() {
    const container = document.getElementById('plugins-container');
    const countEl = document.getElementById('result-count');

    countEl.textContent = `${this.filteredPlugins.length} plugin${this.filteredPlugins.length !== 1 ? 's' : ''}`;

    if (this.filteredPlugins.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>No plugins found</h3>
          <p>Try adjusting your search or filters</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.filteredPlugins.map(plugin => this.renderCard(plugin)).join('');

    // Add click handlers
    container.querySelectorAll('.plugin-card').forEach((card, index) => {
      card.addEventListener('click', () => this.openModal(this.filteredPlugins[index]));
    });
  }

  renderCard(plugin) {
    const categories = (plugin.categories || []).slice(0, 3);

    return `
      <article class="plugin-card" data-id="${plugin.id}">
        <div class="plugin-header">
          <h3 class="plugin-name">${this.escapeHtml(plugin.name)}</h3>
          <span class="plugin-type">${plugin.type}</span>
        </div>
        <p class="plugin-description">${this.escapeHtml(plugin.description)}</p>
        <div class="plugin-meta">
          <span>v${plugin.version}</span>
          <span>by ${this.escapeHtml(plugin.author?.name || 'Unknown')}</span>
        </div>
        ${categories.length ? `
          <div class="plugin-tags">
            ${categories.map(cat => `<span class="tag">${cat}</span>`).join('')}
          </div>
        ` : ''}
      </article>
    `;
  }

  openModal(plugin) {
    const modal = document.getElementById('plugin-modal');
    const body = document.getElementById('modal-body');

    body.innerHTML = this.renderModalContent(plugin);
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Setup copy button
    const copyBtn = body.querySelector('.copy-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => this.copyToClipboard(copyBtn));
    }
  }

  closeModal() {
    const modal = document.getElementById('plugin-modal');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  renderModalContent(plugin) {
    const installConfig = this.getInstallConfig(plugin);

    return `
      <div class="modal-header">
        <h2>${this.escapeHtml(plugin.name)}</h2>
        <div class="meta">
          <span class="plugin-type">${plugin.type}</span>
          <span>v${plugin.version}</span>
          <span>by ${this.escapeHtml(plugin.author?.name || 'Unknown')}</span>
        </div>
      </div>

      <div class="modal-description">
        ${this.formatDescription(plugin.longDescription || plugin.description)}
      </div>

      ${plugin.categories?.length ? `
        <div class="modal-section">
          <h3>Categories</h3>
          <div class="plugin-tags">
            ${plugin.categories.map(cat => `<span class="tag">${cat}</span>`).join('')}
          </div>
        </div>
      ` : ''}

      ${plugin.tags?.length ? `
        <div class="modal-section">
          <h3>Tags</h3>
          <div class="plugin-tags">
            ${plugin.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
          </div>
        </div>
      ` : ''}

      <div class="modal-section">
        <h3>Installation</h3>
        <p style="margin-bottom: 12px; color: var(--color-text-secondary);">
          ${this.escapeHtml(plugin.installation?.instructions || 'Add the following to your Claude Code settings:')}
        </p>
        <div class="install-code">
          <button class="copy-btn" data-code="${this.escapeHtml(installConfig)}">Copy</button>
          <pre><code>${this.escapeHtml(installConfig)}</code></pre>
        </div>
      </div>

      ${plugin.requirements?.dependencies?.length ? `
        <div class="modal-section">
          <h3>Requirements</h3>
          <ul style="margin-left: 20px; color: var(--color-text-secondary);">
            ${plugin.requirements.dependencies.map(dep => `<li>${this.escapeHtml(dep)}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      ${plugin.repository ? `
        <div class="modal-section">
          <h3>Links</h3>
          <a href="${plugin.repository}" target="_blank">${plugin.repository}</a>
        </div>
      ` : ''}
    `;
  }

  getInstallConfig(plugin) {
    if (plugin.installation?.config) {
      return JSON.stringify(plugin.installation.config, null, 2);
    }
    return '// See plugin documentation for installation instructions';
  }

  formatDescription(text) {
    if (!text) return '';

    // Simple markdown-like formatting
    return text
      .split('\n\n')
      .map(para => {
        // Headers
        if (para.startsWith('## ')) {
          return `<h4 style="margin: 16px 0 8px; color: var(--color-accent);">${this.escapeHtml(para.slice(3))}</h4>`;
        }
        // Lists
        if (para.startsWith('- ')) {
          const items = para.split('\n').map(line =>
            `<li>${this.escapeHtml(line.replace(/^- /, ''))}</li>`
          ).join('');
          return `<ul style="margin-left: 20px; margin-bottom: 12px;">${items}</ul>`;
        }
        // Regular paragraph
        return `<p style="margin-bottom: 12px;">${this.escapeHtml(para)}</p>`;
      })
      .join('');
  }

  async copyToClipboard(button) {
    const code = button.dataset.code;
    try {
      await navigator.clipboard.writeText(code);
      button.textContent = 'Copied!';
      button.classList.add('copied');
      setTimeout(() => {
        button.textContent = 'Copy';
        button.classList.remove('copied');
      }, 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new PluginMarketplace();
});
