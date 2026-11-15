'use client';

let revision = 0;

// Previously visited searches/pages must not stay fresh after a replacement or restore.
export function foodResourceKey(key: string) {
  return revision ? `${key}:foods:${revision}` : key;
}

export function invalidateFoodResources() {
  revision++;
}
