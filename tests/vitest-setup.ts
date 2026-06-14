import '@testing-library/jest-dom';

// Mock window and localStorage for Node.js environment
if (typeof window === 'undefined') {
  global.window = {
    localStorage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
    },
  } as unknown as typeof window;
}

// Mock global fetch
if (typeof global.fetch === 'undefined') {
  global.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
}