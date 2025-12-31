const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Load environment variables
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUser() {
  const email = process.argv[2] || 'daniel.luqx@gmail.com';
  
  console.log('🔍 Verificando usuario:', email);
  console.log('');
  
  // Check in auth.users
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error('❌ Error listando usuarios:', listError);
    return;
  }
  
  const user = users.find(u => u.email === email);
  
  if (!user) {
    console.log('❌ Usuario no encontrado en auth.users');
    console.log('');
    console.log('Usuarios existentes:');
    users.forEach(u => {
      console.log(`  - ${u.email} (${u.id})`);
    });
    return;
  }
  
  console.log('✅ Usuario encontrado en auth.users:');
  console.log('   ID:', user.id);
  console.log('   Email:', user.email);
  console.log('   Email confirmado:', user.email_confirmed_at ? 'Sí' : 'No');
  console.log('   Metadata:', JSON.stringify(user.user_metadata, null, 2));
  console.log('');
  
  // Check in user_profiles
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  
  if (profileError) {
    if (profileError.code === 'PGRST116') {
      console.log('⚠️  Perfil no encontrado en user_profiles');
      console.log('   Creando perfil...');
      
      const { data: newProfile, error: insertError } = await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          name: user.email,
          role: 'admin',
        }, {
          onConflict: 'id'
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('❌ Error creando perfil:', insertError);
      } else {
        console.log('✅ Perfil creado:', newProfile);
      }
    } else {
      console.error('❌ Error buscando perfil:', profileError);
    }
  } else {
    console.log('✅ Perfil encontrado en user_profiles:');
    console.log('   Name:', profile.name);
    console.log('   Role:', profile.role);
    console.log('');
    
    if (profile.role !== 'admin') {
      console.log('⚠️  El usuario NO tiene rol admin');
      console.log('   Actualizando a admin...');
      
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ role: 'admin' })
        .eq('id', user.id);
      
      if (updateError) {
        console.error('❌ Error actualizando rol:', updateError);
      } else {
        console.log('✅ Rol actualizado a admin');
      }
    } else {
      console.log('✅ El usuario ya tiene rol admin');
    }
  }
}

checkUser()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

