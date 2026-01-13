# 💰 Finance Analyzer Pro

## 🔑 IMPORTANTE: Configuración del Asistente IA

Para que el asistente de IA funcione, necesitas configurar tu API key de Anthropic:

### En Vercel (producción):
1. Ve a tu proyecto → **Settings → Environment Variables**
2. Agrega: `ANTHROPIC_API_KEY` = `sk-ant-api03-xxx` (tu key)
3. Redespliega el proyecto

### Cómo funciona:
```
Usuario → /api/chat.js (serverless) → API de Anthropic → Respuesta
```

El archivo `/api/chat.js` actúa como proxy seguro. Tu API key **nunca** se expone al navegador.

---

Aplicación completa de análisis financiero con:
- ✅ Login y registro de usuarios
- ✅ Upload de extractos bancarios (PDF/CSV)
- ✅ Selector de moneda
- ✅ Análisis con IA
- ✅ Dashboard interactivo

---

## 🚀 GUÍA COMPLETA DE DEPLOYMENT

### Paso 1: Crear cuenta en Supabase (Base de datos + Auth) - 5 min

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta gratis

2. Click en **"New Project"**
   - Nombre: `finance-analyzer`
   - Password: genera uno seguro (guárdalo)
   - Region: elige la más cercana a tus usuarios

3. Espera 2 minutos a que se cree el proyecto

4. Ve a **Settings → API** y copia:
   - `Project URL` (ejemplo: `https://abc123.supabase.co`)
   - `anon public` key (empieza con `eyJ...`)

5. (Opcional) Habilitar confirmación de email:
   - Ve a **Authentication → Providers → Email**
   - Desactiva "Confirm email" si quieres registro instantáneo

---

### Paso 2: Configurar el proyecto localmente - 3 min

```bash
# 1. Descomprime el ZIP y entra a la carpeta
cd finance-app-full

# 2. Crea el archivo de configuración
cp .env.example .env

# 3. Edita .env con tus credenciales de Supabase
# Abre .env y reemplaza:
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui

# 4. Instala dependencias
npm install

# 5. Prueba localmente
npm run dev

# 6. Abre http://localhost:3000
```

---

### Paso 3: Desplegar en Vercel (GRATIS) - 5 min

#### Opción A: Desde GitHub (Recomendado)

1. **Sube el código a GitHub:**
```bash
# En la carpeta del proyecto
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/finance-analyzer.git
git push -u origin main
```

2. **Conecta con Vercel:**
   - Ve a [vercel.com](https://vercel.com) y crea cuenta con GitHub
   - Click en **"Add New Project"**
   - Selecciona tu repositorio `finance-analyzer`
   - En **Environment Variables** agrega:
     - `VITE_SUPABASE_URL` = tu URL de Supabase
     - `VITE_SUPABASE_ANON_KEY` = tu anon key
   - Click en **Deploy**

3. **¡Listo!** Tu app estará en `https://finance-analyzer.vercel.app`

#### Opción B: Desde terminal

```bash
# Instala Vercel CLI
npm install -g vercel

# Despliega (te pedirá login)
vercel

# Agrega variables de entorno
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY

# Redespliega con las variables
vercel --prod
```

---

### Paso 4: Configurar dominio personalizado (Opcional)

1. En Vercel, ve a tu proyecto → **Settings → Domains**
2. Agrega tu dominio: `finanzas.tudominio.com`
3. Configura los DNS en tu proveedor:
   - Tipo: `CNAME`
   - Nombre: `finanzas`
   - Valor: `cname.vercel-dns.com`

---

## 📱 ALTERNATIVAS DE HOSTING

### Railway.app (con backend)
```bash
# Instala Railway CLI
npm install -g @railway/cli

# Login y deploy
railway login
railway init
railway up
```

### Netlify
```bash
# Build
npm run build

# Arrastra la carpeta 'dist' a netlify.com/drop
```

### DigitalOcean App Platform
1. Conecta tu repo de GitHub
2. Selecciona "Static Site"
3. Build command: `npm run build`
4. Output directory: `dist`

---

## 🔐 SEGURIDAD EN PRODUCCIÓN

### Para la API de Claude (Recomendado)

En producción, NO expongas tu API key en el frontend. Crea una función serverless:

**Archivo: `/api/analyze.js`** (Vercel Serverless Function)
```javascript
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Error processing request' });
  }
}
```

Luego en tu frontend, cambia las llamadas de:
```javascript
fetch('https://api.anthropic.com/v1/messages', ...)
```
A:
```javascript
fetch('/api/analyze', ...)
```

---

## 💾 BASE DE DATOS (Opcional)

Para guardar transacciones en Supabase:

1. Ve a **SQL Editor** en Supabase y ejecuta:

```sql
-- Tabla de transacciones
create table transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  date date not null,
  description text,
  amount decimal(10,2) not null,
  category text,
  merchant text,
  created_at timestamp with time zone default now()
);

-- Habilitar RLS (Row Level Security)
alter table transactions enable row level security;

-- Política: usuarios solo ven sus propias transacciones
create policy "Users can view own transactions"
  on transactions for select
  using (auth.uid() = user_id);

create policy "Users can insert own transactions"
  on transactions for insert
  with check (auth.uid() = user_id);

-- Tabla de configuración de usuario
create table user_settings (
  user_id uuid references auth.users(id) on delete cascade primary key,
  name text,
  income decimal(10,2),
  savings decimal(10,2),
  display_currency text default 'USD',
  created_at timestamp with time zone default now()
);

alter table user_settings enable row level security;

create policy "Users can manage own settings"
  on user_settings for all
  using (auth.uid() = user_id);
```

---

## 🌐 MONEDAS SOPORTADAS

| Código | Moneda | Símbolo |
|--------|--------|---------|
| USD | Dólar estadounidense | $ |
| EUR | Euro | € |
| COP | Peso colombiano | $ |
| MXN | Peso mexicano | $ |
| ARS | Peso argentino | $ |
| CLP | Peso chileno | $ |
| PEN | Sol peruano | S/ |
| BRL | Real brasileño | R$ |

---

## 🛠 ESTRUCTURA DEL PROYECTO

```
finance-app-full/
├── src/
│   ├── App.jsx          # Aplicación principal
│   └── main.jsx         # Entry point
├── api/                  # Serverless functions (opcional)
│   └── analyze.js
├── index.html
├── package.json
├── vite.config.js
├── .env.example
└── README.md
```

---

## 📋 CHECKLIST DE DEPLOYMENT

- [ ] Crear proyecto en Supabase
- [ ] Copiar URL y anon key
- [ ] Crear archivo `.env` con credenciales
- [ ] Probar localmente con `npm run dev`
- [ ] Subir a GitHub
- [ ] Conectar con Vercel
- [ ] Agregar variables de entorno en Vercel
- [ ] Desplegar
- [ ] (Opcional) Configurar dominio personalizado
- [ ] (Opcional) Configurar función serverless para API

---

## 🆘 TROUBLESHOOTING

### "Error de autenticación"
- Verifica que las credenciales de Supabase estén correctas
- Revisa que el proyecto de Supabase esté activo

### "No se cargan los archivos PDF"
- El PDF.js worker se carga desde CDN, verifica conexión a internet
- Algunos PDFs protegidos no se pueden leer

### "La IA no responde"
- Verifica que la API key de Anthropic sea válida
- Revisa los logs en la consola del navegador

### "No puedo registrarme"
- Si habilitaste confirmación de email, revisa tu bandeja de spam
- O desactiva la confirmación en Supabase → Authentication → Providers

---

## 📄 LICENCIA

MIT - Úsalo libremente para proyectos personales o comerciales.

---

Hecho con ❤️ usando React + Supabase + Claude AI
