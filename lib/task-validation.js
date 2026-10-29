const priorities = new Set(['low', 'medium', 'high']);
const statuses = new Set(['todo', 'in_progress', 'done']);

export function parseTaskInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Data tugas tidak valid.' };
  }

  if (typeof body.title !== 'string' || !body.title.trim()) {
    return { error: 'Nama tugas wajib diisi.' };
  }
  if (body.title.trim().length > 200) {
    return { error: 'Nama tugas maksimal 200 karakter.' };
  }
  if (body.description != null && typeof body.description !== 'string') {
    return { error: 'Catatan tugas tidak valid.' };
  }
  if (body.description && body.description.length > 2000) {
    return { error: 'Catatan maksimal 2.000 karakter.' };
  }

  let categoryId = null;
  if (body.categoryId !== undefined && body.categoryId !== null && body.categoryId !== '') {
    categoryId = Number(body.categoryId);
    if (!Number.isSafeInteger(categoryId) || categoryId < 1) {
      return { error: 'Kategori tidak valid.' };
    }
  }

  const dueDate = body.dueDate || null;
  if (dueDate !== null) {
    if (typeof dueDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      return { error: 'Tanggal tenggat tidak valid.' };
    }
    const parsedDate = new Date(`${dueDate}T00:00:00.000Z`);
    if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== dueDate) {
      return { error: 'Tanggal tenggat tidak valid.' };
    }
  }

  const priority = body.priority || 'medium';
  const status = body.status || 'todo';
  if (!priorities.has(priority)) return { error: 'Prioritas tidak valid.' };
  if (!statuses.has(status)) return { error: 'Status tugas tidak valid.' };

  return {
    data: {
      title: body.title.trim(),
      description: body.description?.trim() || null,
      categoryId,
      dueDate,
      priority,
      status,
    },
  };
}

export function parseId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function parseCategoryInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Data kategori tidak valid.' };
  }
  if (typeof body.name !== 'string' || !body.name.trim()) {
    return { error: 'Nama kategori wajib diisi.' };
  }
  if (body.name.trim().length > 80) {
    return { error: 'Nama kategori maksimal 80 karakter.' };
  }
  const color = body.color || '#718b69';
  if (typeof color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(color)) {
    return { error: 'Warna kategori tidak valid.' };
  }
  return { data: { name: body.name.trim(), color } };
}

export function invalidJsonResponse(error) {
  if (error instanceof SyntaxError) {
    return { error: 'Format data tidak valid.', status: 400 };
  }
  return null;
}
