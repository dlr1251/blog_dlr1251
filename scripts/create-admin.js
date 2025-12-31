const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createAdmin() {
  const email = 'daniel.luque@gmail.com'; // Cambia esto
  const password = '%Medellin1251'; // Cambia esto
  const name = 'Daniel Luque'; // Cambia esto
  
  const passwordHash = await bcrypt.hash(password, 10);
  
  console.log('Creando usuario admin...');
  console.log('Email:', email);
  console.log('Password hash:', passwordHash);
  
  const { data, error } = await supabase
    .from('users')
    .insert({
      email,
      name,
      password_hash: passwordHash,
      role: 'admin'
    });
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('✅ Admin creado exitosamente!');
    console.log('Puedes iniciar sesión con:');
    console.log('Email:', email);
    console.log('Password:', password);
  }
}

createAdmin();