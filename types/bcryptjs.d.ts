declare module 'bcryptjs' {
  export function genSalt(rounds?: number | string, callback?: (err: Error | null, salt: string) => void): string | Promise<string>;
  export function hash(password: string, salt: string | number, callback?: (err: Error | null, hash: string) => void): string | Promise<string>;
  export function compare(password: string, hash: string, callback?: (err: Error | null, same: boolean) => void): boolean | Promise<boolean>;
}
