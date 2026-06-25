declare module "bun:test" {
  export function describe(name: string, fn: () => void): void;
  export function test(name: string, fn: () => void): void;

  export interface Matcher<T> {
    toBe(expected: T): void;
    toEqual(expected: T): void;
    toContain(expected: unknown): void;
  }

  export function expect<T>(actual: T): Matcher<T>;
}
