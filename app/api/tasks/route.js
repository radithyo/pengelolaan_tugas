import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getDatabaseFailure } from '@/lib/database-error';
import { invalidJsonResponse, parseTaskInput } from '@/lib/task-validation';

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

export async function GET() {
  try {
    const [rows] = await getPool().query(`${taskSelect} ORDER BY
      CASE WHEN t.status = 'done' THEN 1 ELSE 0 END,
      t.due_date IS NULL,
      t.due_date ASC,
      t.created_at DESC`);
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Gagal memuat daftar tugas:', error);
    const failure = getDatabaseFailure(error, 'Daftar tugas gagal dimuat.');
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}

export async function POST(request) {
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

    const [insertResult] = await pool.query(
      `INSERT INTO tasks (title, description, category_id, due_date, priority, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        result.data.title,
        result.data.description,
        result.data.categoryId,
        result.data.dueDate,
        result.data.priority,
        result.data.status,
      ]
    );
    const [rows] = await pool.query(`${taskSelect} WHERE t.id = ?`, [insertResult.insertId]);
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    const invalidJson = invalidJsonResponse(error);
    if (invalidJson) {
      return NextResponse.json({ error: invalidJson.error }, { status: invalidJson.status });
    }
    console.error('Gagal membuat tugas:', error);
    const failure = getDatabaseFailure(error, 'Tugas gagal disimpan.');
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
