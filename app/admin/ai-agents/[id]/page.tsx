import { getCurrentUser } from '@/lib/supabase-auth';
import { createServiceRoleClient } from '@/lib/supabase-auth';
import { notFound, redirect } from 'next/navigation';
import { EditAIAgentForm } from './components/EditAIAgentForm';

export default async function EditAIAgentPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  
  if (!user || user.role !== 'admin') {
    redirect('/admin/login');
  }

  const supabase = createServiceRoleClient();
  const { data: agent, error } = await supabase
    .from('ai_agents')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !agent) {
    notFound();
  }

  return <EditAIAgentForm agent={agent} />;
}

