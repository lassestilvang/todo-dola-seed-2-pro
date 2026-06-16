import { NextRequest, NextResponse } from 'next/server';
import { initDb } from '@/lib/db';
import { generateToken } from '@/server/src/auth';
import { comparePasswords, hashPassword } from '@/lib/utils/password';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
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

    const result = db.exec(
      'SELECT id, email, name, password FROM users WHERE email = ?',
      [email]
    );

    if (result.length === 0 || !result[0].values[0]) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const user = result[0].values[0];
    const [id, userEmail, name, hashedPassword] = user as [string, string, string | null, string];

    const isValid = await comparePasswords(password, hashedPassword);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const token = generateToken({ id, email: userEmail, name: name ?? undefined });

    return NextResponse.json({
      data: {
        user: { id, email: userEmail, name },
        token,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}