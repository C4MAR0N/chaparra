# Plan de ejecución

Pliego leído íntegro antes de modificar código. Se conserva React 18, TypeScript estricto, Vite, Lucide y Recharts. Sin servidor ni datos iniciales.

1. Fundamentos visuales: Tailwind 3.4, PostCSS, paleta, CSS global e impresión; puerto 5180 estricto; primitivos `components/ui/index.tsx` y `Modal.tsx`.
2. Dominio: `types/index.ts`, `lib/domain.ts` (fechas, adaptación, GMD, importes), `lib/validation.ts`, `lib/constants.ts`.
3. Persistencia: `services/storage.ts` (fallback en memoria y avisos), `auth.ts` (PBKDF2 y sesiones), `db.ts` (claves por usuario), `backup.ts` (validación y exportación), `images.ts` (compresión).
4. Estado React: `context/FarmContext.tsx`, sin gestores externos. `App.tsx` controla acceso, encuesta y sesión; `ErrorBoundary.tsx` protege la raíz.
5. Acceso y alta: `AuthScreen.tsx`, `Onboarding.tsx`, privacidad y borrado con doble confirmación. Encuesta editable.
6. Navegación: `AppShell.tsx`, barra lateral y barra inferior; reemplaza Header y BottomNav.
7. Pantallas existentes reescritas sobre los primitivos: CrotalList, AnimalFormModal, AnimalDetailModal, ProductionModule, InvoiceModule, AnalyticsDashboard, FarmSettingsModal y SecurityPrivacyModal. `Charts.tsx` y `SaleInvoiceEditor.tsx` separan piezas compartidas.
8. Verificación incremental mediante compilación; pruebas de servicios y flujos, CSS, datos iniciales, aislamiento y adaptación; revisión responsive si el navegador de pruebas está disponible.
9. Informe `docs/INFORME-CODEX.md` con inventario, evidencias de los diez criterios, instrucciones, decisiones y limitaciones.

Se reutilizan los modelos de líneas de factura, suma de importes y retención, filtrado del ganado, cálculo de edad y distribuciones para las gráficas, corrigiendo valores inventados y errores detectados. Las funciones críticas de autenticación, aislamiento, importación y cálculo tendrán pruebas ejecutables sin incorporar dependencias a la aplicación.
