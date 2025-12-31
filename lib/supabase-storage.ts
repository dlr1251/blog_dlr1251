import { createBrowserClient } from './supabase-client';

const BUCKET_NAME = 'dlr1251_blog_images';

export async function uploadImage(file: File): Promise<string> {
  const supabase = createBrowserClient();
  
  // Generate unique filename
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = fileName;

  // Upload file
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Upload error:', error);
    throw new Error(`Error uploading image: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  if (!urlData?.publicUrl) {
    throw new Error('Failed to get public URL for uploaded image');
  }

  return urlData.publicUrl;
}

export async function deleteImage(filePath: string): Promise<void> {
  const supabase = createBrowserClient();
  
  // Extract filename from URL
  const fileName = filePath.split('/').pop() || '';
  
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([fileName]);

  if (error) {
    throw new Error(`Error deleting image: ${error.message}`);
  }
}

