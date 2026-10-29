import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getDatabaseFailure } from '@/lib/database-error';
import {
  invalidJsonResponse,
  parseCategoryInput,
  parseId,
} from '@/lib/task-validation';

export async function PUT(request, { params }) {
  const id = parseId(params.id);
  if (!id) return NextResponse.json({ error: 'ID kategori tidak valid.' }, { status: 400 });

  try {
    const body = await request.json();
    const result = parseCategoryInput(body);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const pool = getPool();
    const [existing] = await pool.query('SELECT id FROM task_categories WHERE id = ?', [id]);
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Kategori tidak ditemukan.' }, { status: 404 });
    }

    await pool.query(
      'UPDATE task_categories SET name = ?, color = ? WHERE id = ?',
      [result.data.name, result.data.color, id]
    );
    const [rows] = await pool.query(
      'SELECT id, name, color, created_at AS createdAt FROM task_categories WHERE id = ?',
      [id]
    );
    return NextResponse.json(rows[0]);
  } catch (error) {
    const invalidJson = invalidJsonResponse(error);
    if (invalidJson) {
      return NextResponse.json({ error: invalidJson.error }, { status: invalidJson.status });
    }
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'Nama kategori sudah digunakan.' }, { status: 409 });
    }
    console.error('Gagal memperbarui kategori:', error);
    const failure = getDatabaseFailure(error, 'Kategori gagal diperbarui.');
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}

export async function DELETE(request, { params }) {
  const id = parseId(params.id);
  if (!id) return NextResponse.json({ error: 'ID kategori tidak valid.' }, { status: 400 });

  try {
    const [result] = await getPool().query(
      'DELETE FROM task_categories WHERE id = ?',
      [id]
    );
    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Kategori tidak ditemukan.' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Gagal menghapus kategori:', error);
    const failure = getDatabaseFailure(error, 'Kategori gagal dihapus.');
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
