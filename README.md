# Blog Personal - Daniel Luque

Un blog personal completo con base de datos, sistema de comentarios, notificaciones y panel de administración con funcionalidades IA powered by Grok.

## Características

- 📝 **Gestión de Posts**: Crear, editar y publicar posts con markdown
- 💬 **Sistema de Comentarios**: Comentarios anónimos o con registro, con aprobación y notificaciones
- 👥 **Usuarios Registrados**: Los usuarios pueden registrarse para personalizar sus respuestas de comentarios
- 🤖 **Agentes IA**: Sistema configurable de agentes IA para revisar, editar y sugerir mejoras
- 🔐 **Autenticación**: Panel de administración protegido con Supabase Auth (solo admin puede crear posts)
- 📊 **Dashboard**: Vista general de posts, comentarios y estadísticas
- 🎨 **UI Moderna**: Interfaz construida con shadcn/ui y Tailwind CSS

## Stack Tecnológico

- **Next.js 14** con App Router
- **TypeScript**
- **Supabase** (PostgreSQL + Auth) como base de datos y autenticación
- **xAI Grok API** para análisis y sugerencias IA
- **Tailwind CSS** + **shadcn/ui** para UI
- **React Markdown** para renderizado de contenido

## Configuración Inicial

### 1. Instalar Dependencias

```bash
npm install
```

### 2. Configurar Supabase

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Ve a Settings > API y copia:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Configurar Base de Datos

1. En Supabase, ve a **SQL Editor**
2. Ejecuta el contenido del archivo `supabase/migrations/001_initial_schema.sql`
   - Este archivo crea todas las tablas necesarias con soporte para Supabase Auth desde el inicio
   - **Nota**: Si ya tienes tablas creadas, primero elimínalas o usa un proyecto nuevo de Supabase

### 4. Configurar Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# xAI Grok API
XAI_API_KEY=tu_xai_api_key_aqui

# Email (opcional, para notificaciones)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=
```

### 5. Crear Usuario Administrador

Usa el script incluido para crear un usuario admin con Supabase Auth:

```bash
npm run create:admin [email] [password] [name]
```

Ejemplo:
```bash
npm run create:admin admin@example.com miPassword123 "Daniel Luque"
```

Si no proporcionas argumentos, se creará un usuario por defecto:
- Email: `admin@example.com`
- Password: `admin123`
- Name: `Admin`

**Nota**: El script crea el usuario en Supabase Auth y automáticamente crea el perfil en la tabla `user_profiles` con rol `admin`.

### 6. Iniciar Servidor de Desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## Uso

### Panel de Administración

Accede a `/admin` para gestionar tu blog. Necesitarás iniciar sesión con las credenciales del usuario administrador.

#### Gestión de Posts

- **Crear Post**: `/admin/posts/new`
- **Editar Post**: `/admin/posts/[slug]`
- **Listar Posts**: `/admin/posts`
- Solo usuarios con rol `admin` pueden crear/editar posts

#### Gestión de Comentarios

- **Aprobar/Rechazar**: `/admin/comments`
- Los comentarios requieren aprobación antes de publicarse
- Los comentarios pueden ser anónimos (con nickname y email) o de usuarios registrados

#### Agentes IA

- **Crear Agente**: `/admin/ai-agents/new`
- **Configurar Agentes**: Define prompts del sistema y plantillas de usuario
- **Tipos de Agentes**:
  - `spellcheck`: Verificación ortográfica
  - `grammar`: Corrección gramatical
  - `clarity`: Claridad en la idea
  - `critique`: Críticas constructivas
  - `questions`: Generación de preguntas
  - `intention`: Análisis de intención

### Usuarios Registrados

Los usuarios pueden registrarse para:
- Personalizar sus respuestas de comentarios
- Recibir notificaciones personalizadas
- Configurar preferencias de comentarios

**Nota**: Los usuarios registrados NO pueden crear posts, solo el administrador.

### Comentarios

- **Anónimos**: Cualquiera puede comentar con nickname y email
- **Registrados**: Usuarios registrados pueden comentar con su perfil
- Todos los comentarios requieren aprobación del admin antes de publicarse

## Estructura del Proyecto

```
/app
  /admin          # Panel de administración
  /api            # API routes
  /posts          # Páginas públicas de posts
  page.tsx        # Página principal del blog
/lib
  /supabase.ts    # Cliente de Supabase (base de datos)
  /supabase-auth.ts # Cliente de Supabase Auth
  /api-helpers.ts # Helpers para API routes
  /grok.ts        # Cliente de xAI Grok
  /ai-agents.ts   # Lógica de agentes IA
/supabase
  /migrations     # Migraciones SQL
```

## Scripts Disponibles

- `npm run dev` - Iniciar servidor de desarrollo
- `npm run build` - Construir para producción
- `npm run start` - Iniciar servidor de producción
- `npm run lint` - Ejecutar linter
- `npm run create:admin` - Crear usuario administrador

## Próximas Mejoras

- [ ] Sistema de registro de usuarios
- [ ] Sistema de notificaciones por email
- [ ] Editor de markdown mejorado con preview
- [ ] Sistema de tags y categorías avanzado
- [ ] Analytics y estadísticas de posts
- [ ] Exportación/importación de contenido
- [ ] Modo oscuro
- [ ] SEO optimizado
- [ ] Integración de agentes IA en el editor de posts

## Despliegue en Vercel

### 1. Preparar el Repositorio

```bash
# Inicializar git (si no está inicializado)
git init
git add .
git commit -m "Initial commit"

# Crear repositorio en GitHub y conectar
git remote add origin https://github.com/tu-usuario/blog_dlr1251.git
git branch -M main
git push -u origin main
```

### 2. Desplegar en Vercel

1. Ve a [Vercel](https://vercel.com) e inicia sesión con tu cuenta de GitHub
2. Haz clic en "New Project"
3. Importa tu repositorio de GitHub
4. Configura las variables de entorno:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Haz clic en "Deploy"

### 3. Configurar Variables de Entorno en Vercel

En el dashboard de Vercel, ve a tu proyecto > Settings > Environment Variables y agrega:

```
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
```

**Importante**: 
- `SUPABASE_SERVICE_ROLE_KEY` debe ser secreta (no se expone al cliente)
- Las variables con `NEXT_PUBLIC_` se exponen al cliente
- Después de agregar variables, necesitas hacer un nuevo deploy

### 4. Configurar Supabase para Producción

1. En Supabase, ve a **Settings > API**
2. Agrega tu dominio de Vercel a las **Allowed URLs** si es necesario
3. Verifica que las políticas RLS estén configuradas correctamente

### 5. Verificar el Despliegue

Una vez desplegado, verifica:
- ✅ La página principal carga correctamente
- ✅ Puedes iniciar sesión en `/admin/login`
- ✅ Puedes crear y publicar posts
- ✅ Los posts se muestran públicamente

## Troubleshooting

### Error: "Row Level Security policy violation"
- Verifica que las políticas RLS en Supabase permitan las operaciones necesarias
- Revisa que estés usando `createServiceRoleClient` para operaciones administrativas

### Error: "Invalid API key"
- Verifica que las variables de entorno estén configuradas correctamente en Vercel
- Asegúrate de hacer un nuevo deploy después de agregar variables

### Error: "Post not found" en producción
- Verifica que los posts tengan `published: true` y `published_at` configurado
- Revisa que las políticas RLS permitan leer posts publicados

## Licencia

Privado - Daniel Luque
