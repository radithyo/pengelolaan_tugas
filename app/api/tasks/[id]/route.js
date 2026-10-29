import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getDatabaseFailure } from '@/lib/database-error';
import {
  invalidJsonResponse,
  parseId,
  parseTaskInput,
} from '@/lib/task-validation';

const taskSelect = `
  SELECT
    t.id,
    t.title,
    t.description,
    t.category_id AS categoryId,
    c.name AS categoryName,
    c.color AS categoryColor,
    t.due_date AS dueDate,
    t.priority,
    t.status,
    t.created_at AS createdAt,
    t.updated_at AS updatedAt
  FROM tasks t
  LEFT JOIN task_categories c ON c.id = t.category_id
`;

export async function GET(request, { params }) {
  const id = parseId(params.id);
  if (!id) return NextResponse.json({ error: 'ID tugas tidak valid.' }, { status: 400 });

  try {
    const [rows] = await getPool().query(`${taskSelect} WHERE t.id = ?`, [id]);
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Tugas tidak ditemukan.' }, { status: 404 });
    }
    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error('Gagal memuat detail tugas:', error);
    const failure = getDatabaseFailure(error, 'Detail tugas gagal dimuat.');
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}

export async function PUT(request, { params }) {
  const id = parseId(params.id);
  if (!id) return NextResponse.json({ error: 'ID tugas tidak valid.' }, { status: 400 });

  try {
    const body = await request.json();
    const result = parseTaskInput(body);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const pool = getPool();
    if (result.data.categoryId !== null) {
      const [categories] = await pool.query(
        'SELECT id FROM task_categories WHERE id = ?',
        [result.data.categoryId]
      );
      if (categories.length === 0) {
        return NextResponse.json({ error: 'Kategori tidak ditemukan.' }, { status: 400 });
      }
    }

    const [existing] = await pool.query('SELECT id FROM tasks WHERE id = ?', [id]);
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Tugas tidak ditemukan.' }, { status: 404 });
    }

    await pool.query(
      `UPDATE tasks
       SET title = ?, description = ?, category_id = ?, due_date = ?,
           priority = ?, status = ?
       WHERE id = ?`,
      [
        result.data.title,
        result.data.description,
        result.data.categoryId,
        result.data.dueDate,
        result.data.priority,
        result.data.status,
        id,
      ]
    );
    const [rows] = await pool.query(`${taskSelect} WHERE t.id = ?`, [id]);
    return NextResponse.json(rows[0]);
  } catch (error) {
    const invalidJson = invalidJsonResponse(error);
    if (invalidJson) {
      return NextResponse.json({ error: invalidJson.error }, { status: invalidJson.status });
    }
    console.error('Gagal memperbarui tugas:', error);
    const failure = getDatabaseFailure(error, 'Tugas gagal diperbarui.');
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}

export async function DELETE(request, { params }) {
  const id = parseId(params.id);
  if (!id) return NextResponse.json({ error: 'ID tugas tidak valid.' }, { status: 400 });

  try {
    const [result] = await getPool().query('DELETE FROM tasks WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Tugas tidak ditemukan.' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Gagal menghapus tugas:', error);
    const failure = getDatabaseFailure(error, 'Tugas gagal dihapus.');
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
