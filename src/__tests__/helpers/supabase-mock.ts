/**
 * Shared Supabase mock utilities for tests.
 * Provides chainable query mocks that resolve to configured responses.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Create a chainable Supabase query mock that resolves to `resolvedValue`.
 * Every method returns the same chain, so any `.select().eq().single()` works.
 */
export function createChain(resolvedValue: any) {
  const chain: any = {};
  chain.then = (resolve: any, reject?: any) =>
    Promise.resolve(resolvedValue).then(resolve, reject);
  [
    "select",
    "eq",
    "neq",
    "lt",
    "gt",
    "gte",
    "lte",
    "not",
    "in",
    "is",
    "limit",
    "or",
    "order",
    "single",
    "range",
    "insert",
    "update",
    "upsert",
    "delete",
    "maybeSingle",
  ].forEach((m) => {
    chain[m] = jest.fn().mockReturnValue(chain);
  });
  return chain;
}

/**
 * Create a mock Supabase client where `from(tableName)` returns a chain
 * that resolves to `responses[tableName]`.
 *
 * Optionally pass `rpcResponses` for `supabase.rpc(name)` calls and
 * `authResponse` for `supabase.auth.getUser()`.
 */
export function createSupabaseMock(
  responses: Record<string, any>,
  options?: {
    rpcResponses?: Record<string, any>;
    authResponse?: any;
  }
) {
  return {
    from: jest.fn((table: string) =>
      createChain(responses[table] || { data: null })
    ),
    rpc: jest.fn((name: string) =>
      Promise.resolve(
        options?.rpcResponses?.[name] || { data: null, error: null }
      )
    ),
    auth: {
      getUser: jest.fn().mockResolvedValue(
        options?.authResponse || { data: { user: null }, error: null }
      ),
    },
  };
}
