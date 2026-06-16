import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaces, createWorkspace, getWorkspaceById, updateWorkspace, deleteWorkspace, getWorkspaceMembers, addWorkspaceMember, removeWorkspaceMember, getUserWorkspaces } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (userId) {
      const workspaces = await getUserWorkspaces(userId);
      return NextResponse.json({ data: workspaces });
    }

    const workspaces = await getWorkspaces();
    return NextResponse.json({ data: workspaces });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch workspaces' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const workspace = await createWorkspace(body);
    return NextResponse.json({ data: workspace }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create workspace' },
      { status: 500 }
    );
  }
}