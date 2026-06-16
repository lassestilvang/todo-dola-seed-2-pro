import { NextRequest, NextResponse } from 'next/server';
import { initDb } from '@/lib/db';
import { generateToken } from '@/server/src/auth';
import { hashPassword } from '@/lib/utils/password';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const db = await initDb();
    if (!db) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 500 }
      );
    }

    // Check if user exists
    const existingResult = db.exec('SELECT id FROM users WHERE email = ?', [email]);
    if (existingResult.length > 0 && existingResult[0].values[0]) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);
    const userId = crypto.randomUUID();
    const now = Date.now();

    db.exec(
      'INSERT INTO users (id, email, name, password, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, email, name ?? null, hashedPassword, now, now]
    );

    // Create default inbox list
    db.exec(
      'INSERT INTO lists (id, name, emoji, color, is_inbox, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, 1, 0, ?, ?)',
      ['inbox', 'Inbox', '📥', '#3b82f6', now, now]
    );

    const token = generateToken({ id: userId, email, name: name ?? undefined });

    return NextResponse.json({
      data: {
        user: { id: userId, email, name },
        token,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}