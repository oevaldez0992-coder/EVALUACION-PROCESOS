# EVALUACION-PROCESOS
REPORTE DE EVALUACIÓN DE PROCESOS ADMINISTRATIVOS DEL ALMACÉN

## Generador de reportes (`index.html`)
Abre `index.html` en el navegador (la carpeta `js/` debe estar junto a él). Tiene dos pestañas:

### RUTAS PENDIENTES EN BEETRACK
Sube el Excel del mes y obtén el reporte: solo órdenes en estado Pendiente, folio solo con números y cuadro de
cumplimiento por sucursal (gerente 16.66 %, administrativo 20 %; con órdenes pendientes el cumplimiento es "No" y el ponderado 0 %).
Los pesos, sucursales y alias de nombres están al inicio del script (`PESOS`, `SUCURSALES`, `ALIAS`).

Calificación de auditoría del gerente, en este orden de prioridad:
1. La que se captura a mano en el reporte.
2. La que trae el archivo en el cuadro de resultados.
3. La de la **Auditoría de Colaboración** de esa sucursal y mes, si se marcó "Considerar en la evaluación de procesos".

### Auditoría de Colaboración
Checklist de cumplimiento por sucursal y mes. Genera el informe ejecutivo en Excel y la imagen PNG con el mismo formato.
- `js/auditoria.js`: checklists, umbrales (`UMBRALES`) y cálculo.
- `js/colab.js`: pantalla del checklist y sincronización con Supabase.
- `js/xlsxw.js`: escritor del Excel con estilos, fórmulas y formato condicional.
- `js/informe.js`: imagen PNG del informe.
- Las sucursales sin checklist propio usan el de Kuroda Mosaikos; se puede importar el suyo desde un Excel con el formato del informe ejecutivo.

## Base de datos (Supabase)
- Esquema: `supabase/migrations/`.
- Tablas de rutas: `reporte_periodos`, `rutas_pendientes`, `rutas_resultado`. El botón **Guardar en Supabase** reemplaza los datos del mes detectado en el nombre del archivo (por ejemplo `..._SEP-2026.xlsx`).
- Tablas de la auditoría: `auditorias_colab` (una fila por sucursal y mes, con respuestas, hallazgos, % y estatus) y `auditoria_checklists` (checklist importado por sucursal).
  Cada cambio en el checklist se guarda solo en Supabase; al iniciar sesión se cargan los datos guardados y gana la versión más reciente.
- Requiere iniciar sesión: las tablas tienen RLS y solo leen/escriben usuarios autenticados. Los usuarios se crean en Supabase › Authentication › Users.
- No subas los Excel de operación al repositorio.
