const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Load environment variables
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
} else {
  console.error('❌ Error: No se encontró el archivo .env.local');
  console.error('   Crea el archivo .env.local en la raíz del proyecto con:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL=tu_url');
  console.error('   SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key');
  process.exit(1);
}

// Verify required environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL no está definido en .env.local');
  process.exit(1);
}

// Support both variable names
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY o NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY no está definido en .env.local');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  serviceRoleKey
);

async function createAdmin() {
  const email = process.argv[2] || 'admin@example.com';
  const password = process.argv[3] || 'admin123';
  const name = process.argv[4] || 'Daniel Luque';
  
  if (!email || !password) {
    console.error('❌ Error: Email y password son requeridos');
    console.error('   Uso: npm run create:admin <email> <password> [name]');
    process.exit(1);
  }
  
  console.log('🔐 Creando usuario admin en Supabase Auth...');
  console.log('   Email:', email);
  console.log('   Name:', name);
  console.log('');
  
  // Create user in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm email
    user_metadata: {
      name,
      role: 'admin'
    }
  });
  
  if (authError) {
    if (authError.message.includes('already registered')) {
      console.log('⚠️  El usuario ya existe en Supabase Auth.');
      console.log('');
      console.log('Opciones:');
      console.log('   1. Inicia sesión con las credenciales existentes');
      console.log('   2. Elimina el usuario desde Supabase Dashboard > Authentication > Users');
      console.log('   3. Usa otro email para crear un nuevo admin');
      console.log('');
      console.log('Si quieres actualizar el perfil del usuario existente, puedes hacerlo desde Supabase Dashboard.');
      process.exit(0);
    }
    console.error('❌ Error creando usuario en Auth:', authError.message);
    process.exit(1);
  }
  
  console.log('✅ Usuario creado en Auth:', authData.user.id);
  
  // Create or update profile in user_profiles table
  // Use upsert in case the trigger already created the profile
  const { data: profileData, error: profileError } = await supabase
    .from('user_profiles')
    .upsert({
      id: authData.user.id,
      name,
      role: 'admin'
    }, {
      onConflict: 'id'
    })
    .select()
    .single();
  
  if (profileError) {
    // If upsert fails, try update (profile might already exist from trigger)
    console.log('⚠️  Error con upsert, intentando actualizar perfil existente...');
    const { data: updatedProfile, error: updateError } = await supabase
      .from('user_profiles')
      .update({ name, role: 'admin' })
      .eq('id', authData.user.id)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ Error actualizando perfil:', updateError.message);
      console.log('   El usuario fue creado en Auth, pero el perfil necesita ser creado manualmente.');
      console.log('   Puedes hacerlo desde Supabase Dashboard o ejecutar: npm run check:user', email);
    } else {
      console.log('✅ Perfil actualizado en user_profiles');
    }
  } else {
    console.log('✅ Perfil creado/actualizado en user_profiles');
  }
  console.log('');
  console.log('🎉 ¡Admin creado exitosamente!');
  console.log('');
  console.log('Puedes iniciar sesión en /admin/login con:');
  console.log('   Email:', email);
  console.log('   Password:', password);
}

createAdmin()
  .catch((error) => {
    console.error('❌ Error inesperado:', error.message);
    process.exit(1);
  });
