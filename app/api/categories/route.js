import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getDatabaseFailure } from '@/lib/database-error';
import { invalidJsonResponse, parseCategoryInput } from '@/lib/task-validation';

export async function GET() {
  try {
    const [rows] = await getPool().query(
      `SELECT c.id, c.name, c.color, c.created_at AS createdAt,
              COUNT(t.id) AS taskCount
       FROM task_categories c
       LEFT JOIN tasks t ON t.category_id = c.id
       GROUP BY c.id, c.name, c.color, c.created_at
       ORDER BY c.name ASC`
    );
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Gagal memuat kategori:', error);
    const failure = getDatabaseFailure(error, 'Daftar kategori gagal dimuat.');
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const result = parseCategoryInput(body);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const pool = getPool();
    const [insertResult] = await pool.query(
      'INSERT INTO task_categories (name, color) VALUES (?, ?)',
      [result.data.name, result.data.color]
    );
    const [rows] = await pool.query(
      'SELECT id, name, color, created_at AS createdAt FROM task_categories WHERE id = ?',
      [insertResult.insertId]
    );
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    const invalidJson = invalidJsonResponse(error);
    if (invalidJson) {
      return NextResponse.json({ error: invalidJson.error }, { status: invalidJson.status });
    }
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'Nama kategori sudah digunakan.' }, { status: 409 });
    }
    console.error('Gagal membuat kategori:', error);
    const failure = getDatabaseFailure(error, 'Kategori gagal disimpan.');
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
