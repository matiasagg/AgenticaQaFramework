/**
 * Utilitario de encriptación para API keys de usuarios
 *
 * Sirve para almacenar la clave de Gemini de cada usuario (BYO key)
 * de forma encriptada en la base de datos, evitando que quede en texto plano.
 *
 * Usa AES-256-GCM con una clave derivada del JWT_SECRET (server-side).
 *
 * @example
 * // Cifrar una key antes de guardarla
 * const encrypted = encryptApiKey('sk-abc123...');
 *
 * // Descifrar al usar la key
 * const key = decryptApiKey(encrypted);
 */
import crypto from 'crypto';
import { config } from '../config';

// Algoritmo de encriptación
const ALGORITHM = 'aes-256-gcm';
// Longitud de etiquetas e IVs
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
// Prefijo para identificar el formato encriptado
const PREFIX = 'enc1:';

/**
 * Deriva una clave de 32 bytes (AES-256) a partir del JWT_SECRET.
 * Usa SHA-256 para garantizar longitud fija sin importar el secret usado.
 *
 * @returns Buffer de 32 bytes con la clave derivada
 */
function getEncryptionKey(): Buffer {
  return crypto.createHash('sha256').update(config.jwt.secret).digest();
}

/**
 * Encripta un texto (API key) usando AES-256-GCM.
 *
 * El resultado tiene el formato: `enc1:<iv_hex>:<tag_hex>:<content_hex>`
 * El prefijo `enc1:` permite identificar el formato encriptado.
 *
 * @param text - El texto a encriptar (ej: API key de Gemini)
 * @returns String encriptado con prefijo `enc1:`
 */
export function encryptApiKey(text: string): string {
  if (!text) return text;

  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Desencripta un texto previamente encriptado con `encryptApiKey`.
 *
 * Si el texto no tiene el prefijo `enc1:`, se devuelve tal cual
 * (para compatibilidad con valores que no fueron encriptados).
 *
 * @param encryptedText - El texto encriptado con prefijo `enc1:`
 * @returns El texto original desencriptado
 */
export function decryptApiKey(encryptedText: string): string {
  if (!encryptedText) return encryptedText;
  if (!encryptedText.startsWith(PREFIX)) return encryptedText;

  const parts = encryptedText.slice(PREFIX.length).split(':');
  if (parts.length !== 3) return encryptedText;

  const [ivHex, tagHex, contentHex] = parts;

  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const encrypted = Buffer.from(contentHex, 'hex');

  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}
