/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL del proyecto de Supabase. Pública: viaja dentro de la aplicación. */
  readonly VITE_SUPABASE_URL?: string;
  /** Clave publicable de Supabase. Pública por diseño; la protección es RLS. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
