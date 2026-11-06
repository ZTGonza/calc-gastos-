/** Configuración de Vite: integra React y Tailwind durante desarrollo y compilación. */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// import react, { reactCompilerPreset } from '@vitejs/plugin-react'
// import babel from '@rolldown/plugin-babel'
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
});
