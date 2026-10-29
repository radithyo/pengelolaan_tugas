'use client';

import { useEffect, useMemo, useState } from 'react';

const emptyForm = {
  title: '',
  description: '',
  categoryId: '',
  dueDate: '',
  priority: 'medium',
  status: 'todo',
};

const statusLabels = {
  todo: 'Belum dikerjakan',
  in_progress: 'Sedang dikerjakan',
  done: 'Selesai',
};

const priorityLabels = {
  low: 'Rendah',
  medium: 'Sedang',
  high: 'Tinggi',
};

async function readResponse(response) {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Terjadi kesalahan. Coba lagi.');
  return data;
}

function formatDueDate(value) {
  if (!value) return 'Tanpa tenggat';
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`));
}

export default function Home() {
  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [categoryName, setCategoryName] = useState('');
  const [categoryColor, setCategoryColor] = useState('#718b69');
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [formOpen, setFormOpen] = useState(false);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [taskData, categoryData] = await Promise.all([
        fetch('/api/tasks').then(readResponse),
        fetch('/api/categories').then(readResponse),
      ]);
      setTasks(taskData);
      setCategories(categoryData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const counts = useMemo(
    () => ({
      all: tasks.length,
      todo: tasks.filter((task) => task.status === 'todo').length,
      in_progress: tasks.filter((task) => task.status === 'in_progress').length,
      done: tasks.filter((task) => task.status === 'done').length,
    }),
    [tasks]
  );

  const visibleTasks = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('id-ID');
    return tasks.filter((task) => {
      const matchesStatus = activeFilter === 'all' || task.status === activeFilter;
      const matchesCategory =
        selectedCategory === 'all' || String(task.categoryId || '') === selectedCategory;
      const matchesSearch =
        !query ||
        `${task.title} ${task.description || ''} ${task.categoryName || ''}`
          .toLocaleLowerCase('id-ID')
          .includes(query);
      return matchesStatus && matchesCategory && matchesSearch;
    });
  }, [tasks, activeFilter, selectedCategory, search]);

  function openCreateForm() {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
    setNotice('');
  }

  function startEdit(task) {
    setEditingId(task.id);
    setForm({
      title: task.title,
      description: task.description || '',
      categoryId: task.categoryId ? String(task.categoryId) : '',
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
      priority: task.priority,
      status: task.status,
    });
    setFormOpen(true);
    setNotice('');
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch(
        editingId ? `/api/tasks/${editingId}` : '/api/tasks',
        {
          method: editingId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...form,
            categoryId: form.categoryId || null,
            dueDate: form.dueDate || null,
          }),
        }
      );
      await readResponse(response);
      closeForm();
      setNotice(editingId ? 'Tugas berhasil diperbarui.' : 'Tugas baru berhasil ditambahkan.');
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(task, status) {
    setError('');
    setNotice('');
    try {
      await readResponse(
        await fetch(`/api/tasks/${task.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: task.title,
            description: task.description || '',
            categoryId: task.categoryId || null,
            dueDate: task.dueDate ? task.dueDate.slice(0, 10) : null,
            priority: task.priority,
            status,
          }),
        })
      );
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteTask(task) {
    if (!window.confirm(`Hapus tugas "${task.title}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    setError('');
    setNotice('');
    try {
      await readResponse(
        await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' })
      );
      setNotice('Tugas berhasil dihapus.');
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function addCategory(event) {
    event.preventDefault();
    if (!categoryName.trim()) return;
    setError('');
    setNotice('');
    try {
      await readResponse(
        await fetch(editingCategoryId ? `/api/categories/${editingCategoryId}` : '/api/categories', {
          method: editingCategoryId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: categoryName, color: categoryColor }),
        })
      );
      setCategoryName('');
      setCategoryColor('#718b69');
      setEditingCategoryId(null);
      setNotice(editingCategoryId ? 'Kategori berhasil diperbarui.' : 'Kategori berhasil ditambahkan.');
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  function startEditCategory(category) {
    setEditingCategoryId(category.id);
    setCategoryName(category.name);
    setCategoryColor(category.color);
    setError('');
    setNotice('');
  }

  function cancelCategoryEdit() {
    setEditingCategoryId(null);
    setCategoryName('');
    setCategoryColor('#718b69');
  }

  async function deleteCategory(category) {
    if (
      !window.confirm(
        `Hapus kategori "${category.name}"? Tugas di dalamnya tetap ada tanpa kategori.`
      )
    ) return;
    setError('');
    setNotice('');
    try {
      await readResponse(
        await fetch(`/api/categories/${category.id}`, { method: 'DELETE' })
      );
      if (selectedCategory === String(category.id)) setSelectedCategory('all');
      if (editingCategoryId === category.id) cancelCategoryEdit();
      setNotice('Kategori berhasil dihapus.');
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  const filters = [
    { id: 'all', label: 'Semua tugas' },
    { id: 'todo', label: 'Belum dikerjakan' },
    { id: 'in_progress', label: 'Berlangsung' },
    { id: 'done', label: 'Selesai' },
  ];

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" aria-label="RuangTugas beranda">
          <span className="brand-mark">r.</span>
          <span>ruangtugas</span>
        </a>

        <div className="side-label">RUANG KERJA</div>
        <nav className="side-nav" aria-label="Navigasi tugas">
          <button
            className={`side-link ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            <span className="nav-icon">▦</span> Ikhtisar
          </button>
          <button
            className={`side-link ${activeFilter === 'in_progress' ? 'active' : ''}`}
            onClick={() => setActiveFilter('in_progress')}
          >
            <span className="nav-icon">◷</span> Sedang dikerjakan
          </button>
          <button
            className={`side-link ${activeFilter === 'done' ? 'active' : ''}`}
            onClick={() => setActiveFilter('done')}
          >
            <span className="nav-icon">✓</span> Sudah selesai
          </button>
        </nav>

        <div className="category-heading">
          <span className="side-label">KATEGORI</span>
          <span className="category-total">{categories.length}</span>
        </div>
        <div className="category-list">
          {categories.map((category) => (
            <div className="category-item" key={category.id}>
              <button
                className={`category-link ${selectedCategory === String(category.id) ? 'selected' : ''}`}
                onClick={() => setSelectedCategory(
                  selectedCategory === String(category.id) ? 'all' : String(category.id)
                )}
              >
                <span className="category-dot" style={{ backgroundColor: category.color }} />
                <span className="category-name">{category.name}</span>
                <span className="category-count">
                  {tasks.filter((task) => task.categoryId === category.id).length}
                </span>
              </button>
              <button
                className="category-edit"
                aria-label={`Edit kategori ${category.name}`}
                title="Edit kategori"
                onClick={() => startEditCategory(category)}
              >
                ↗
              </button>
              <button
                className="category-remove"
                aria-label={`Hapus kategori ${category.name}`}
                title="Hapus kategori"
                onClick={() => deleteCategory(category)}
              >
                ×
              </button>
            </div>
          ))}
          {categories.length === 0 && <p className="sidebar-empty">Belum ada kategori.</p>}
        </div>

        <form className="category-form" onSubmit={addCategory}>
          <label htmlFor="categoryName">{editingCategoryId ? 'Edit kategori' : 'Tambah kategori'}</label>
          <div className="category-input-row">
            <input
              id="categoryName"
              value={categoryName}
              onChange={(event) => setCategoryName(event.target.value)}
              placeholder="Contoh: Kuliah"
              maxLength={80}
              required
            />
            <input
              className="color-input"
              type="color"
              value={categoryColor}
              onChange={(event) => setCategoryColor(event.target.value)}
              aria-label="Warna kategori"
            />
          </div>
          <div className="category-form-actions">
            <button className="add-category-button" type="submit">
              {editingCategoryId ? 'Simpan perubahan' : '+ Buat kategori'}
            </button>
            {editingCategoryId && (
              <button className="cancel-category-button" type="button" onClick={cancelCategoryEdit}>
                Batal
              </button>
            )}
          </div>
        </form>

        <div className="sidebar-bottom">
          <div className="avatar">RT</div>
          <div>
            <strong>Ruang pribadimu</strong>
            <span>Kelola hari ini, satu per satu.</span>
          </div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="breadcrumb"><span>Ruang kerja</span><span className="crumb-slash">/</span> Ikhtisar</div>
          <div className="topbar-right">
            <span className="today-label">
              {new Intl.DateTimeFormat('id-ID', {
                weekday: 'long', day: 'numeric', month: 'long',
              }).format(new Date())}
            </span>
            <button className="top-add-button" onClick={openCreateForm}>
              <span>+</span> Tugas baru
            </button>
          </div>
        </header>

        <div className="page-content">
          <section className="welcome-row">
            <div>
              <p className="eyebrow">RUANG KERJAMU</p>
              <h1>Rencanakan dengan tenang<span>.</span></h1>
              <p className="welcome-copy">Tugas yang tertata membuat hari terasa lebih ringan.</p>
            </div>
            <div className="welcome-stamp" aria-hidden="true">
              <span>✳</span>
              <small>PELAN-PELAN<br />ASAL SELESAI</small>
            </div>
          </section>

          <section className="stats-grid" aria-label="Ringkasan tugas">
            <article className="stat-card stat-total">
              <div className="stat-top"><span>Total tugas</span><span className="stat-icon">▤</span></div>
              <strong>{counts.all.toString().padStart(2, '0')}</strong>
              <span className="stat-foot">Semua yang perlu kamu urus</span>
            </article>
            <article className="stat-card stat-progress">
              <div className="stat-top"><span>Sedang berjalan</span><span className="stat-icon">◷</span></div>
              <strong>{counts.in_progress.toString().padStart(2, '0')}</strong>
              <span className="stat-foot">Langkah demi langkah</span>
            </article>
            <article className="stat-card stat-complete">
              <div className="stat-top"><span>Sudah selesai</span><span className="stat-icon">✓</span></div>
              <strong>{counts.done.toString().padStart(2, '0')}</strong>
              <span className="stat-foot">Kecil atau besar, tetap berarti</span>
            </article>
          </section>

          <section className="task-section">
            <div className="task-heading">
              <div>
                <p className="eyebrow">DAFTAR AKTIVITAS</p>
                <h2>Daftar tugas <span className="task-count">{visibleTasks.length}</span></h2>
              </div>
              <button className="create-button" onClick={openCreateForm}>
                <span>+</span> Tambah tugas
              </button>
            </div>

            <div className="toolbar">
              <div className="filter-tabs" role="tablist" aria-label="Filter status">
                {filters.map((filter) => (
                  <button
                    key={filter.id}
                    role="tab"
                    aria-selected={activeFilter === filter.id}
                    className={activeFilter === filter.id ? 'filter-tab active' : 'filter-tab'}
                    onClick={() => setActiveFilter(filter.id)}
                  >
                    {filter.label}
                    <span>{counts[filter.id]}</span>
                  </button>
                ))}
              </div>
              <label className="search-box">
                <span aria-hidden="true">⌕</span>
                <input
                  type="search"
                  placeholder="Cari tugas..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  aria-label="Cari tugas"
                />
              </label>
            </div>

            {error && <div className="feedback error-box" role="alert">{error}</div>}
            {notice && <div className="feedback success-box" role="status">{notice}</div>}

            <div className="task-list">
              {loading ? (
                <div className="list-message"><span className="loader" /> Memuat daftar tugas...</div>
              ) : visibleTasks.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-illustration">✳</div>
                  <h3>{tasks.length === 0 ? 'Mulai dari satu hal kecil.' : 'Tidak ada tugas di sini.'}</h3>
                  <p>{tasks.length === 0
                    ? 'Tambahkan tugas pertamamu, lalu kerjakan dengan ritmemu sendiri.'
                    : 'Coba ubah pencarian atau filter yang kamu pilih.'}</p>
                  {tasks.length === 0 && (
                    <button className="create-button" onClick={openCreateForm}>+ Buat tugas pertama</button>
                  )}
                </div>
              ) : visibleTasks.map((task) => (
                <article className={`task-card ${task.status === 'done' ? 'is-done' : ''}`} key={task.id}>
                  <button
                    className={`task-check ${task.status === 'done' ? 'checked' : ''}`}
                    aria-label={task.status === 'done' ? 'Tandai belum selesai' : 'Tandai selesai'}
                    onClick={() => updateStatus(task, task.status === 'done' ? 'todo' : 'done')}
                  >
                    {task.status === 'done' ? '✓' : ''}
                  </button>
                  <div className="task-main">
                    <div className="task-title-row">
                      <h3>{task.title}</h3>
                      <span className={`priority-pill priority-${task.priority}`}>
                        <span /> Prioritas {priorityLabels[task.priority]}
                      </span>
                    </div>
                    {task.description && <p className="task-description">{task.description}</p>}
                    <div className="task-meta">
                      {task.categoryName && (
                        <span className="task-category">
                          <span className="category-dot" style={{ backgroundColor: task.categoryColor }} />
                          {task.categoryName}
                        </span>
                      )}
                      <span className="task-due"><span>◷</span> {formatDueDate(task.dueDate)}</span>
                      <span className={`status-pill status-${task.status}`}>
                        <span /> {statusLabels[task.status]}
                      </span>
                    </div>
                  </div>
                  <div className="task-actions">
                    {task.status !== 'done' && (
                      <select
                        className="status-select"
                        aria-label={`Ubah status tugas ${task.title}`}
                        value={task.status}
                        onChange={(event) => updateStatus(task, event.target.value)}
                      >
                        <option value="todo">Belum dikerjakan</option>
                        <option value="in_progress">Sedang dikerjakan</option>
                      </select>
                    )}
                    <button className="icon-button" aria-label={`Edit ${task.title}`} onClick={() => startEdit(task)}>
                      ↗
                    </button>
                    <button className="icon-button delete-icon" aria-label={`Hapus ${task.title}`} onClick={() => deleteTask(task)}>
                      ×
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <div className="list-footer">
              <span>Menampilkan {visibleTasks.length} dari {tasks.length} tugas</span>
              <span><i /> Tersimpan di ruang kerjamu</span>
            </div>
          </section>

          <footer className="page-footer">Dibuat untuk hari-hari yang lebih teratur <span>✳</span></footer>
        </div>
      </section>

      {formOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !saving) closeForm();
        }}>
          <section className="task-modal" role="dialog" aria-modal="true" aria-labelledby="formTitle">
            <div className="modal-heading">
              <div>
                <p className="eyebrow">{editingId ? 'PERBARUI RENCANA' : 'MULAI DARI SINI'}</p>
                <h2 id="formTitle">{editingId ? 'Edit tugas' : 'Buat tugas baru'}</h2>
              </div>
              <button className="modal-close" onClick={closeForm} disabled={saving} aria-label="Tutup">×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <label className="field-label" htmlFor="title">Nama tugas</label>
              <input
                id="title"
                name="title"
                className="form-control"
                value={form.title}
                onChange={handleChange}
                placeholder="Apa yang ingin kamu selesaikan?"
                maxLength={200}
                required
              />
              <label className="field-label" htmlFor="description">Catatan <span>OPSIONAL</span></label>
              <textarea
                id="description"
                name="description"
                className="form-control"
                rows={3}
                value={form.description}
                onChange={handleChange}
                placeholder="Tambahkan detail kecil agar lebih mudah dikerjakan"
                maxLength={2000}
              />
              <div className="form-grid">
                <div>
                  <label className="field-label" htmlFor="categoryId">Kategori</label>
                  <select
                    id="categoryId"
                    name="categoryId"
                    className="form-control"
                    value={form.categoryId}
                    onChange={handleChange}
                  >
                    <option value="">Tanpa kategori</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="field-label" htmlFor="dueDate">Tenggat waktu</label>
                  <input
                    id="dueDate"
                    name="dueDate"
                    className="form-control"
                    type="date"
                    value={form.dueDate}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="priority">Prioritas</label>
                  <select id="priority" name="priority" className="form-control" value={form.priority} onChange={handleChange}>
                    <option value="low">Rendah</option>
                    <option value="medium">Sedang</option>
                    <option value="high">Tinggi</option>
                  </select>
                </div>
                <div>
                  <label className="field-label" htmlFor="status">Status</label>
                  <select id="status" name="status" className="form-control" value={form.status} onChange={handleChange}>
                    <option value="todo">Belum dikerjakan</option>
                    <option value="in_progress">Sedang dikerjakan</option>
                    <option value="done">Selesai</option>
                  </select>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="cancel-button" onClick={closeForm} disabled={saving}>Batal</button>
                <button type="submit" className="create-button" disabled={saving}>
                  {saving ? 'Menyimpan...' : editingId ? 'Simpan perubahan' : 'Simpan tugas'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
