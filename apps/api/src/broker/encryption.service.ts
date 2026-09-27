import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor() {
    const rawKey = process.env.BROKER_ENCRYPTION_KEY;
    if (!rawKey) {
      if (process.env.NODE_ENV === 'test') {
        console.warn('BROKER_ENCRYPTION_KEY not set! Using insecure fallback for testing only.');
        this.key = crypto.scryptSync('insecure-test-key', 'salt', 32);
      } else {
        throw new Error('BROKER_ENCRYPTION_KEY environment variable is required in production.');
      }
    } else {
      if (Buffer.from(rawKey, 'hex').length !== 32) {
        throw new Error('BROKER_ENCRYPTION_KEY must be a 64-character hex string (32 bytes).');
      }
      this.key = Buffer.from(rawKey, 'hex');
    }
  }

  encrypt(text: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');
    
    // Format: iv:encrypted:authTag
    return `${iv.toString('hex')}:${encrypted}:${authTag}`;
  }

  decrypt(encryptedText: string): string {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new InternalServerErrorException('Invalid encrypted text format');
    }
    
    const [ivHex, encryptedHex, authTagHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
