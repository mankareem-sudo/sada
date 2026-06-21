import crypto from 'crypto'

// Use Node.js built-in scrypt for password hashing (no external deps)
const SCRYPT_KEYLEN = 64
const SCRYPT_SALT_LEN = 16
const SCRYPT_N = 16384 // CPU cost
const SCRYPT_R = 8 // Memory cost
const SCRYPT_P = 1 // Parallelism

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(SCRYPT_SALT_LEN)
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: 64 * 1024 * 1024,
  })
  // Format: scrypt$N$r$p$saltHex$hashHex
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('hex')}$${hash.toString('hex')}`
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const parts = stored.split('$')
    if (parts.length !== 6 || parts[0] !== 'scrypt') return false
    const N = parseInt(parts[1], 10)
    const r = parseInt(parts[2], 10)
    const p = parseInt(parts[3], 10)
    const salt = Buffer.from(parts[4], 'hex')
    const expectedHash = Buffer.from(parts[5], 'hex')
    const hash = crypto.scryptSync(password, salt, expectedHash.length, {
      N,
      r,
      p,
      maxmem: 64 * 1024 * 1024,
    })
    // Constant-time comparison
    return crypto.timingSafeEqual(hash, expectedHash)
  } catch {
    return false
  }
}
