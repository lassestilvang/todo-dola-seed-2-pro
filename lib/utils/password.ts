import bcrypt from 'bcryptjs';

export async function hashPassword(password: string): Promise<string> {
  const salt = typeof bcrypt.genSalt === 'function'
    ? await bcrypt.genSalt(10)
    : '10';
  return typeof bcrypt.hash === 'function'
    ? await bcrypt.hash(password, salt)
    : '';
}

export async function comparePasswords(password: string, hash: string): Promise<boolean> {
  return typeof bcrypt.compare === 'function'
    ? await bcrypt.compare(password, hash)
    : false;
}