import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Centralized configuration for the QA SaaS Platform API
 * All environment variables are loaded and validated here
 */
const defaultCorsOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
];

const parseCorsOrigins = () => {
  const raw = process.env.CORS_ALLOWED_ORIGINS || process.env.FRONTEND_URL || defaultCorsOrigins.join(',');

  return Array.from(new Set(
    raw
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
  ));
};

export const config = {
  // Server configuration
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database configuration
  databaseUrl: process.env.DATABASE_URL || '',

  // CORS configuration
  corsOrigins: parseCorsOrigins(),
  
  // JWT configuration
  // NOTE: In production, JWT_SECRET is REQUIRED (validateConfig enforces it).
  // The insecure fallback only applies to local development to ease onboarding.
  jwt: {
    secret: process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'dev-only-secret-change-in-production'),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  
  // Gemini configuration (único proveedor de IA)
  // Nota: GEMINI_API_KEY global es el fallback. Cada usuario también puede
  // configurar su propia key (BYO) que se almacena en su perfil (ver User.geminiApiKey).
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
  },
  
  // AWS S3 configuration
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    s3Bucket: process.env.AWS_S3_BUCKET || 'qa-saas-evidence-storage',
  },
  
  // Frontend URL for CORS
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  
  // GitHub integration
  get github() {
    return {
      token: process.env.GITHUB_TOKEN || '',
    };
  },
  
  // Jira integration
  jira: {
    host: process.env.JIRA_HOST || '',
    email: process.env.JIRA_EMAIL || '',
    apiToken: process.env.JIRA_API_TOKEN || '',
  },
};

/**
 * Validate that all required environment variables are set
 * Throws an error if any required variable is missing
 * Note: GEMINI_API_KEY is optional at startup — each user can configure their own
 * BYO key (Bring Your Own) which is stored encrypted in their profile.
 */
export function validateConfig(): void {
  // In production, an explicit strong JWT_SECRET is mandatory: the API must not
  // start with a well-known default secret (would allow token forgery).
  const requiredVars = process.env.NODE_ENV === 'production'
    ? ['DATABASE_URL', 'JWT_SECRET']
    : ['DATABASE_URL'];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    );
  }
}

export default config;