import { createServiceRoleClient } from '../supabase';

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .substring(0, 100); // Limit length
}

export async function ensureUniqueSlug(
  baseSlug: string,
  existingSlug?: string
): Promise<string> {
  const supabase = createServiceRoleClient();
  
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const { data: existing } = await supabase
      .from('posts')
      .select('slug')
      .eq('slug', slug)
      .single();

    // If this is an update and the slug matches the existing one, it's fine
    if (existing && existing.slug === existingSlug) {
      return slug;
    }

    // If slug doesn't exist, use it
    if (!existing) {
      return slug;
    }

    // Otherwise, try with a counter
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}
