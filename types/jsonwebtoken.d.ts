declare module 'jsonwebtoken' {
  export interface SignOptions {
    expiresIn?: string | number;
    issuer?: string;
    subject?: string;
    audience?: string | string[];
    algorithm?: string;
  }

  export interface VerifyOptions {
    expiresIn?: string | number;
    issuer?: string;
    subject?: string;
    audience?: string | string[];
    algorithms?: string[];
  }

  export function sign(payload: object, secret: string, options?: SignOptions): string;
  export function verify<T = object>(token: string, secret: string, options?: VerifyOptions): T;
  export function decode(token: string, options?: VerifyOptions): any;
}
