import { expect, test, describe } from 'vitest';
import { cn } from '@/lib/utils';

describe('Utility Functions', () => {
  describe('cn', () => {
    test('merges class names', () => {
      expect(cn('text-red-500', 'bg-blue-500')).toBe('text-red-500 bg-blue-500');
    });

    test('merges Tailwind CSS classes', () => {
      expect(cn('px-2 py-4', 'px-4')).toBe('py-4 px-4');
    });

    test('handles conditional classes', () => {
      const condition = true;
      expect(cn('text-red-500', condition && 'font-bold')).toBe('text-red-500 font-bold');
      const condition2 = false;
      expect(cn('text-red-500', condition2 && 'font-bold')).toBe('text-red-500');
    });

    test('handles null and undefined', () => {
      expect(cn('text-red-500', null, 'bg-blue-500')).toBe('text-red-500 bg-blue-500');
      expect(cn('text-red-500', undefined, 'bg-blue-500')).toBe('text-red-500 bg-blue-500');
    });

    test('handles empty input', () => {
      expect(cn()).toBe('');
    });

    test('handles arrays', () => {
      expect(cn(['text-red-500', 'bg-blue-500'])).toBe('text-red-500 bg-blue-500');
    });

    test('handles objects', () => {
      expect(cn({ 'text-red-500': true, 'bg-blue-500': false })).toBe('text-red-500');
    });
  });
});