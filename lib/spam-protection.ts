import { createServiceRoleClient } from './supabase-auth';
import crypto from 'crypto';

export interface SpamCheckResult {
  isSpam: boolean;
  reason?: string;
  score: number;
}

// Rate limiting configuration
const RATE_LIMITS = {
  perIP: {
    maxComments: 5,
    windowMinutes: 60,
  },
  perEmail: {
    maxComments: 3,
    windowMinutes: 60,
  },
  perPost: {
    maxComments: 2,
    windowMinutes: 10,
  },
};

// Spam detection rules
const SPAM_RULES = {
  minLength: 10,
  maxLength: 5000,
  maxLinks: 3,
  suspiciousWords: [
    'viagra', 'casino', 'poker', 'loan', 'mortgage', 'credit',
    'click here', 'buy now', 'limited time', 'act now',
  ],
};

/**
 * Check if a comment submission should be blocked due to rate limiting
 */
export async function checkRateLimit(
  ipAddress: string,
  email: string | null,
  postId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const supabase = createServiceRoleClient();
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - RATE_LIMITS.perIP.windowMinutes * 60 * 1000);
  const tenMinutesAgo = new Date(now.getTime() - RATE_LIMITS.perPost.windowMinutes * 60 * 1000);

  // Check IP-based rate limit
  const { count: ipCount } = await supabase
    .from('comment_submissions')
    .select('*', { count: 'exact', head: true })
    .eq('ip_address', ipAddress)
    .gte('created_at', oneHourAgo.toISOString());

  if (ipCount && ipCount >= RATE_LIMITS.perIP.maxComments) {
    return {
      allowed: false,
      reason: `Has excedido el límite de ${RATE_LIMITS.perIP.maxComments} comentarios por hora desde esta IP. Por favor, intenta más tarde.`,
    };
  }

  // Check email-based rate limit
  if (email) {
    const { count: emailCount } = await supabase
      .from('comment_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('email', email)
      .gte('created_at', oneHourAgo.toISOString());

    if (emailCount && emailCount >= RATE_LIMITS.perEmail.maxComments) {
      return {
        allowed: false,
        reason: `Has excedido el límite de ${RATE_LIMITS.perEmail.maxComments} comentarios por hora con este email. Por favor, intenta más tarde.`,
      };
    }
  }

  // Check post-specific rate limit
  const { count: postCount } = await supabase
    .from('comment_submissions')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId)
    .eq('ip_address', ipAddress)
    .gte('created_at', tenMinutesAgo.toISOString());

  if (postCount && postCount >= RATE_LIMITS.perPost.maxComments) {
    return {
      allowed: false,
      reason: `Has excedido el límite de ${RATE_LIMITS.perPost.maxComments} comentarios por post cada 10 minutos. Por favor, espera un momento.`,
    };
  }

  return { allowed: true };
}

/**
 * Check if comment content looks like spam
 */
export function checkContentSpam(content: string): SpamCheckResult {
  let score = 0;
  const reasons: string[] = [];

  // Length checks
  if (content.length < SPAM_RULES.minLength) {
    score += 10;
    reasons.push('Comentario muy corto');
  }
  if (content.length > SPAM_RULES.maxLength) {
    score += 5;
    reasons.push('Comentario muy largo');
  }

  // Link count
  const linkRegex = /https?:\/\/[^\s]+/gi;
  const links = content.match(linkRegex) || [];
  if (links.length > SPAM_RULES.maxLinks) {
    score += 15;
    reasons.push(`Demasiados enlaces (${links.length})`);
  }

  // Suspicious words
  const lowerContent = content.toLowerCase();
  const foundSuspiciousWords = SPAM_RULES.suspiciousWords.filter(word =>
    lowerContent.includes(word)
  );
  if (foundSuspiciousWords.length > 0) {
    score += foundSuspiciousWords.length * 10;
    reasons.push(`Palabras sospechosas detectadas`);
  }

  // Repeated characters (like "aaaaaa" or "!!!!!!")
  const repeatedCharRegex = /(.)\1{5,}/;
  if (repeatedCharRegex.test(content)) {
    score += 10;
    reasons.push('Caracteres repetidos');
  }

  // All caps check
  const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
  if (capsRatio > 0.7 && content.length > 20) {
    score += 5;
    reasons.push('Demasiadas mayúsculas');
  }

  return {
    isSpam: score >= 20,
    reason: reasons.join(', '),
    score,
  };
}

/**
 * Check for duplicate content (same content from same IP/email recently)
 */
export async function checkDuplicateContent(
  content: string,
  ipAddress: string,
  email: string | null
): Promise<{ isDuplicate: boolean; reason?: string }> {
  const supabase = createServiceRoleClient();
  const contentHash = crypto
    .createHash('sha256')
    .update(content.trim().toLowerCase())
    .digest('hex');

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  // Check for duplicate content from same IP
  const { data: ipDuplicates } = await supabase
    .from('comment_submissions')
    .select('id')
    .eq('ip_address', ipAddress)
    .eq('content_hash', contentHash)
    .gte('created_at', oneHourAgo.toISOString())
    .limit(1);

  if (ipDuplicates && ipDuplicates.length > 0) {
    return {
      isDuplicate: true,
      reason: 'Ya has enviado un comentario idéntico recientemente',
    };
  }

  // Check for duplicate content from same email
  if (email) {
    const { data: emailDuplicates } = await supabase
      .from('comment_submissions')
      .select('id')
      .eq('email', email)
      .eq('content_hash', contentHash)
      .gte('created_at', oneHourAgo.toISOString())
      .limit(1);

    if (emailDuplicates && emailDuplicates.length > 0) {
      return {
        isDuplicate: true,
        reason: 'Ya has enviado un comentario idéntico recientemente',
      };
    }
  }

  return { isDuplicate: false };
}

/**
 * Record a comment submission for rate limiting tracking
 */
export async function recordCommentSubmission(
  ipAddress: string,
  email: string | null,
  postId: string,
  content: string
): Promise<void> {
  const supabase = createServiceRoleClient();
  const contentHash = crypto
    .createHash('sha256')
    .update(content.trim().toLowerCase())
    .digest('hex');

  await supabase.from('comment_submissions').insert({
    ip_address: ipAddress,
    email,
    post_id: postId,
    content_hash: contentHash,
  });
}

/**
 * Get client IP address from request headers
 */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  return forwarded
    ? forwarded.split(',')[0].trim()
    : realIP || 'unknown';
}

