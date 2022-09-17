export * from './ipfs.js';
export * from './trpc.js';
export * from './network.js';
export * from './protocol.js';
export * from './db.js';

export const GENESIS_UNIT_HASH: string = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' as const;
export const BINARY_ZERO_STRING: '\x00' = '\x00' as const;
export const SIGNATURE_BYTE_LENGTH: 64 = 64;
export const ADDRESS_BYTE_LENGTH: 32 = 32;
export const PUBKEY_BYTE_LENGTH: 33 = 33;
export const TOKEN_BYTE_LENGTH: 32 = 32;
export const EMPTY_BUFFER: Uint8Array = new Uint8Array([]);
export const BINARY_ZERO: Uint8Array = new Uint8Array([0]);