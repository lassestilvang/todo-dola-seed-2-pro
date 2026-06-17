import { exportDb } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function createBackup(name?: string): Promise<string> {
  const data = await exportDb();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupName = name || `backup-${timestamp}`;
  const backupDir = join(process.cwd(), 'backups');
  const backupPath = join(backupDir, `${backupName}.json`);

  // Ensure backup directory exists
  await mkdir(backupDir, { recursive: true });

  // Write backup file
  await writeFile(backupPath, JSON.stringify(data, null, 2));

  return backupPath;
}

export async function listBackups(): Promise<string[]> {
  const backupDir = join(process.cwd(), 'backups');
  try {
    const { readdir } = await import('fs/promises');
    const files = await readdir(backupDir);
    return files.filter(f => f.endsWith('.json')).map(f => join(backupDir, f));
  } catch {
    return [];
  }
}

export async function restoreBackup(backupPath: string): Promise<void> {
  const { readFile } = await import('fs/promises');
  const { importDb } = await import('@/lib/db');
  const data = JSON.parse(await readFile(backupPath, 'utf-8'));
  await importDb(data);
}