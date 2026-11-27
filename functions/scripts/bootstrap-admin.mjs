// Ejecutar UNA sola vez en una computadora de confianza.
// Nunca subas el archivo JSON de cuenta de servicio a GitHub.
import fs from 'node:fs';
import admin from 'firebase-admin';
const [keyPath,email,fullName] = process.argv.slice(2);
if(!keyPath||!email||!fullName){console.error('Uso: node scripts/bootstrap-admin.mjs RUTA_CUENTA_SERVICIO.json correo@dominio.com "Nombre completo"');process.exit(1);}
const serviceAccount=JSON.parse(fs.readFileSync(keyPath,'utf8'));
admin.initializeApp({credential:admin.credential.cert(serviceAccount)});
const auth=admin.auth(),db=admin.firestore();
const user=await auth.getUserByEmail(email);
await auth.setCustomUserClaims(user.uid,{role:'Superusuario'});
await db.collection('users').doc(user.uid).set({uid:user.uid,email,full_name:fullName,role:'Superusuario',active:true,created_at:admin.firestore.FieldValue.serverTimestamp()});
console.log(`Superusuario configurado: ${email} (${user.uid}). Cierra y vuelve a iniciar sesión para actualizar permisos.`);
process.exit(0);
