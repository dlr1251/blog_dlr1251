# Migraciones de Base de Datos

## Migración Inicial

### `001_initial_schema.sql`

Esta es la migración única que necesitas ejecutar para configurar toda la base de datos desde cero con soporte para Supabase Auth.

**Instrucciones:**
1. Ve a Supabase Dashboard > SQL Editor
2. Copia y pega el contenido completo de `001_initial_schema.sql`
3. Ejecuta la migración

Esta migración crea:
- Tabla `user_profiles` (extiende `auth.users`)
- Tabla `posts`
- Tabla `comments`
- Tabla `ai_agents`
- Tabla `ai_executions`
- Tabla `notifications`
- Tabla `user_comment_preferences`
- Todos los índices, triggers y políticas RLS necesarios

**Nota**: Si ya tienes tablas en tu base de datos, primero elimínalas o crea un proyecto nuevo de Supabase.

## Archivos de Backup

Los archivos en la carpeta `backup/` son migraciones antiguas que usaban NextAuth.js. Ya no son necesarios si empiezas de cero con Supabase Auth.

