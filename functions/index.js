const {onCall, HttpsError} = require('firebase-functions/v2/https');
const {initializeApp} = require('firebase-admin/app');
const {getAuth} = require('firebase-admin/auth');
const {getFirestore, FieldValue} = require('firebase-admin/firestore');
initializeApp();
const auth=getAuth(), db=getFirestore();
const ROLES=['Superusuario','Administrador','Usuario'];
function requireAuth(req){if(!req.auth)throw new HttpsError('unauthenticated','Debes iniciar sesión.');return req.auth;}
function requireRole(req,allowed){const a=requireAuth(req);if(!allowed.includes(a.token.role))throw new HttpsError('permission-denied','No tienes permisos para realizar esta operación.');return a;}
exports.createUser=onCall(async(req)=>{
 const caller=requireRole(req,['Superusuario']);const {email,password,full_name,role}=req.data||{};
 if(!email||!/^\S+@\S+\.\S+$/.test(email)||!password||password.length<8||!full_name||!ROLES.includes(role))throw new HttpsError('invalid-argument','Verifica correo, nombre, rol y contraseña (mínimo 8 caracteres).');
 try{const user=await auth.createUser({email,emailVerified:false,password,displayName:full_name,disabled:false});await auth.setCustomUserClaims(user.uid,{role});await db.doc(`users/${user.uid}`).set({uid:user.uid,email,full_name,role,active:true,created_at:FieldValue.serverTimestamp()});return {uid:user.uid};}catch(e){if(e.code==='auth/email-already-exists')throw new HttpsError('already-exists','Ese correo ya está registrado.');throw new HttpsError('internal',e.message);}
});
exports.setUserActive=onCall(async(req)=>{
 const caller=requireRole(req,['Superusuario']);const {uid,active}=req.data||{};if(!uid||typeof active!=='boolean')throw new HttpsError('invalid-argument','Datos incompletos.');if(uid===caller.uid)throw new HttpsError('failed-precondition','No puedes desactivar tu propia cuenta.');
 const user=await auth.getUser(uid);await auth.updateUser(uid,{disabled:!active});await db.doc(`users/${uid}`).update({active,updated_at:FieldValue.serverTimestamp()});return {ok:true};
});
exports.createLoan=onCall(async(req)=>{
 const caller=requireRole(req,['Superusuario','Administrador','Usuario']);const d=req.data||{};const {material_id,quantity,borrower,group_name,due_date,notes}=d;const qty=Number(quantity);
 if(!material_id||!Number.isInteger(qty)||qty<=0||!String(borrower||'').trim()||!due_date)throw new HttpsError('invalid-argument','Verifica material, cantidad, responsable y fecha.');
 const userSnap=await db.doc(`users/${caller.uid}`).get();const full=userSnap.data()?.full_name||caller.token.email||'Usuario';
 const result=await db.runTransaction(async tx=>{const mr=db.doc(`materials/${material_id}`),ms=await tx.get(mr);if(!ms.exists)throw new HttpsError('not-found','Material no encontrado.');const m=ms.data();if(m.status==='Inactivo'||qty>Number(m.quantity))throw new HttpsError('failed-precondition','No hay existencias suficientes o el material está inactivo.');const lr=db.collection('loans').doc(),vr=db.collection('movements').doc();tx.update(mr,{quantity:Number(m.quantity)-qty,updated_at:FieldValue.serverTimestamp()});tx.set(lr,{material_id,material_name:m.name,code:m.code,borrower:String(borrower).trim(),group_name:String(group_name||''),quantity:qty,loan_date:new Date().toISOString().slice(0,10),due_date,returned_at:null,notes:String(notes||''),created_by:caller.uid,created_at:FieldValue.serverTimestamp()});tx.set(vr,{material_id,material_name:m.name,code:m.code,movement_type:'Préstamo',quantity:qty,detail:`Préstamo a ${String(borrower).trim()}`,responsible:full,created_at:FieldValue.serverTimestamp(),user_id:caller.uid});return {id:lr.id};});return result;
});
exports.returnLoan=onCall(async(req)=>{
 const caller=requireRole(req,['Superusuario','Administrador','Usuario']);const {loan_id}=req.data||{};if(!loan_id)throw new HttpsError('invalid-argument','Falta el identificador del préstamo.');const userSnap=await db.doc(`users/${caller.uid}`).get();const full=userSnap.data()?.full_name||caller.token.email||'Usuario';
 await db.runTransaction(async tx=>{const lr=db.doc(`loans/${loan_id}`),ls=await tx.get(lr);if(!ls.exists||ls.data().returned_at)throw new HttpsError('failed-precondition','El préstamo ya fue devuelto o no existe.');const l=ls.data(),mr=db.doc(`materials/${l.material_id}`),ms=await tx.get(mr);if(!ms.exists)throw new HttpsError('not-found','No se encontró el material asociado.');const m=ms.data(),now=FieldValue.serverTimestamp(),vr=db.collection('movements').doc();tx.update(lr,{returned_at:now});tx.update(mr,{quantity:Number(m.quantity)+Number(l.quantity),updated_at:now});tx.set(vr,{material_id:l.material_id,material_name:l.material_name,code:l.code,movement_type:'Devolución',quantity:l.quantity,detail:`Devolución de préstamo ${loan_id}`,responsible:full,created_at:now,user_id:caller.uid});});return {ok:true};
});
exports.adjustStock=onCall(async(req)=>{
 const caller=requireRole(req,['Superusuario','Administrador']);const {material_id,kind,quantity,detail}=req.data||{};const qty=Number(quantity);if(!material_id||!['Entrada','Salida'].includes(kind)||!Number.isInteger(qty)||qty<=0)throw new HttpsError('invalid-argument','Datos de ajuste no válidos.');const userSnap=await db.doc(`users/${caller.uid}`).get();const full=userSnap.data()?.full_name||caller.token.email||'Usuario';
 await db.runTransaction(async tx=>{const mr=db.doc(`materials/${material_id}`),ms=await tx.get(mr);if(!ms.exists)throw new HttpsError('not-found','Material no encontrado.');const m=ms.data(),next=Number(m.quantity)+(kind==='Entrada'?qty:-qty);if(next<0)throw new HttpsError('failed-precondition','No hay existencias suficientes.');const vr=db.collection('movements').doc();tx.update(mr,{quantity:next,updated_at:FieldValue.serverTimestamp()});tx.set(vr,{material_id,material_name:m.name,code:m.code,movement_type:kind,quantity:qty,detail:String(detail||''),responsible:full,created_at:FieldValue.serverTimestamp(),user_id:caller.uid});});return {ok:true};
});
