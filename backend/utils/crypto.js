const crypto = require("crypto");

/**
 * Encrypts text using AES-256-GCM algorithm
 * @param {string} text - The text to encrypt
 * @param {string} secret - The encryption key (defaults to process.env.ENCRYPTION_KEY)
 * @returns {string} - Encrypted text in format: iv:authTag:encrypted
 */
const encrypt = (text, secret = process.env.ENCRYPTION_KEY) => {
  if (!text) {
    return null;
  }

  if (!secret) {
    throw new Error(
      "Encryption key is required. Set ENCRYPTION_KEY environment variable.",
    );
  }

  try {
    // Create a 256-bit key from the secret
    const key = crypto.scryptSync(secret, "salt", 32);

    // Generate a random initialization vector (12 bytes for GCM)
    const iv = crypto.randomBytes(12);

    // Create cipher
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

    // Encrypt the text
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    // Get the authentication tag
    const authTag = cipher.getAuthTag();

    // Return iv:authTag:encrypted format
    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
  } catch (error) {
    throw new Error(`Encryption failed: ${error.message}`);
  }
};

/**
 * Decrypts text that was encrypted with the encrypt function
 * @param {string} encrypted - The encrypted text in format: iv:authTag:encrypted
 * @param {string} secret - The decryption key (defaults to process.env.ENCRYPTION_KEY)
 * @returns {string} - Decrypted text
 */
const decrypt = (encrypted, secret = process.env.ENCRYPTION_KEY) => {
  if (!encrypted) {
    return null;
  }

  if (!secret) {
    throw new Error(
      "Decryption key is required. Set ENCRYPTION_KEY environment variable.",
    );
  }

  try {
    // Split the encrypted string into parts
    const parts = encrypted.split(":");
    if (parts.length !== 3) {
      throw new Error(
        "Invalid encrypted format. Expected iv:authTag:encrypted",
      );
    }

    const [ivHex, authTagHex, encryptedData] = parts;

    // Convert hex strings back to buffers
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");

    // Create a 256-bit key from the secret
    const key = crypto.scryptSync(secret, "salt", 32);

    // Create decipher
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt the data
    let decrypted = decipher.update(encryptedData, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
};

/**
 * Generates a secure random encryption key
 * @returns {string} - A secure 64-character hex string suitable for ENCRYPTION_KEY
 */
const generateEncryptionKey = () => {
  return crypto.randomBytes(32).toString("hex");
};

/**
 * Validates if an encryption key is properly formatted
 * @param {string} key - The key to validate
 * @returns {boolean} - True if key is valid format
 */
const validateEncryptionKey = (key) => {
  if (!key || typeof key !== "string") {
    return false;
  }

  // Should be at least 32 characters for good security
  return key.length >= 32;
};

module.exports = {
  encrypt,
  decrypt,
  generateEncryptionKey,
  validateEncryptionKey,
};
