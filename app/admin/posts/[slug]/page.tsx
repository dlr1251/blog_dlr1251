import { getCurrentUser } from '@/lib/supabase-auth';
import { createServiceRoleClient } from '@/lib/supabase-auth';
import { notFound, redirect } from 'next/navigation';
import { EditPostForm } from './components/EditPostForm';

export default async function EditPostPage({
  params,
}: {
  params: { slug: string };
}) {
  const user = await getCurrentUser();
  
  if (!user || user.role !== 'admin') {
    redirect('/admin/login');
  }

  const supabase = createServiceRoleClient();
  const { data: post, error } = await supabase
    .from('posts')
    .select('*')
    .eq('slug', params.slug)
    .single();

  if (error || !post) {
    notFound();
  }

  return <EditPostForm post={post} />;
}

