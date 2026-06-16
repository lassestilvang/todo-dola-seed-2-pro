import { NextRequest, NextResponse } from 'next/server';
import { removeWorkspaceMember } from '@/lib/db/queries';

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string; userId: string }> }) {
  try {
    const { id, userId } = await context.params;
    await removeWorkspaceMember(id, userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove member' },
      { status: 500 }
    );
  }
}