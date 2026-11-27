# NovaLab CONALEP Tlalpan I — GitHub Pages + Firebase

Versión web de NovaLab, migrada de Flask/SQLite a HTML, CSS, JavaScript y Firebase.

## Incluye
- Inicio de sesión con Firebase Authentication (correo y contraseña).
- Perfiles con roles Superusuario, Administrador y Usuario.
- Dashboard, inventario, alta/edición de materiales, ajustes de existencias.
- Préstamos y devoluciones con transacciones en Cloud Functions.
- Historial de movimientos.
- Administración de cuentas desde el panel Superusuario.
- Exportación de respaldo JSON.
- Reglas de Firestore y Cloud Functions.

## A. Configurar Firebase (una sola vez)
1. En https://console.firebase.google.com crea un proyecto.
2. En Authentication > Get started > Sign-in method habilita **Email/Password**.
3. En Firestore Database crea la base de datos en modo producción.
4. En Project settings > General > Your apps registra una aplicación web.
5. Copia el objeto de configuración web en `js/firebase-config.js`, sustituyendo todos los valores `REEMPLAZAR_...`.
6. En la configuración del proyecto copia el **Project ID** y reemplaza `REEMPLAZAR_PROJECT_ID` en `.firebaserc`.
7. Para Cloud Functions, cambia el proyecto al plan Blaze si Firebase lo solicita. Configura facturación y límites/alertas de presupuesto antes de desplegar.

## B. Publicar reglas y funciones en Firebase
Se necesita Node.js 20 o superior y Firebase CLI.

```bash
npm install -g firebase-tools
firebase login
firebase use --add
```
Selecciona el proyecto que creaste y asígnale el alias `default`.

Después ejecuta desde esta carpeta:

```bash
cd functions
npm install
cd ..
firebase deploy --only firestore:rules,functions
```

No es necesario desplegar Firebase Hosting: la interfaz se publicará en GitHub Pages.

## C. Crear el primer Superusuario (paso de seguridad)
1. En Firebase Console > Authentication > Users > Add user, crea manualmente la primera cuenta con correo y contraseña segura.
2. En Firebase Console > Project settings > Service accounts > Generate new private key descarga el JSON de cuenta de servicio. Guárdalo fuera de esta carpeta del proyecto.
3. En la terminal, desde la raíz del proyecto ejecuta (ajusta la ruta, correo y nombre):

```bash
node functions/scripts/bootstrap-admin.mjs "C:/RUTA_SEGURA/servicio-firebase.json" "correo@dominio.com" "Nombre del responsable"
```

4. El script asigna el rol Superusuario y crea su perfil en Firestore. **Nunca subas el JSON de cuenta de servicio a GitHub, ni lo compartas.**
5. Inicia sesión en NovaLab. Para que se actualicen los permisos, cierra sesión y vuelve a entrar si la cuenta ya estaba abierta.

## D. Publicar interfaz en GitHub Pages
1. Crea un repositorio GitHub, por ejemplo `NovaLab-CONALEP-Tlalpan-I`.
2. Sube el contenido de esta carpeta a la raíz del repositorio (incluidos `index.html`, `css/`, `js/` y `assets/`).
3. En GitHub abre Settings > Pages.
4. En Build and deployment selecciona `Deploy from a branch`, rama `main` y carpeta `/ (root)`.
5. Guarda y espera a que GitHub publique la dirección del sitio.

## E. Orden recomendado de puesta en marcha
1. Configurar Firebase y `js/firebase-config.js`.
2. Desplegar reglas y funciones.
3. Crear el primer Superusuario con el script.
4. Publicar los archivos en GitHub Pages.
5. Iniciar sesión y crear las cuentas de Administrador y Usuario desde NovaLab.
6. Registrar materiales y validar préstamos/devoluciones con datos de prueba antes de cargar el inventario real.

## Roles
- **Superusuario:** administra cuentas, roles, inventario, ajustes, préstamos, devoluciones e historial.
- **Administrador:** administra inventario, ajustes, préstamos, devoluciones e historial.
- **Usuario:** consulta inventario y registra préstamos/devoluciones; no puede modificar el catálogo ni ajustar existencias manualmente.

## Modelo de datos Firestore
- `users`: perfil, correo, nombre, rol, estado y fechas.
- `materials`: código, nombre, categoría, descripción, unidad, existencias, mínimo, ubicación y estado.
- `loans`: material, persona responsable, grupo, cantidad, fechas, observaciones y estado de devolución.
- `movements`: historial inmutable de altas, entradas, salidas, préstamos y devoluciones.

Las contraseñas nunca se guardan en Firestore: las administra Firebase Authentication. Los roles se validan mediante custom claims asignados por Cloud Functions/Admin SDK.

## Respaldo
Desde NovaLab, Superusuario y Administrador pueden descargar un respaldo JSON de los datos accesibles. Para una estrategia institucional, configura además exportaciones programadas de Firestore desde Google Cloud/Firebase.

## Notas
- La configuración web de Firebase incluida en `js/firebase-config.js` identifica el proyecto; no es una clave privada. La protección real está en Authentication, reglas de Firestore y Cloud Functions.
- No publiques claves de cuenta de servicio ni archivos `.env`.
- Cloud Functions puede generar cargos. Revisa el plan, cuotas y presupuesto de Google Cloud antes de habilitarlo.
- Este proyecto usa Firebase SDK desde CDN; requiere conexión a internet y un navegador moderno.
- La versión actual no migra automáticamente la base SQLite local. El inventario existente deberá importarse mediante una herramienta de migración preparada después de validar la estructura y los datos.
