/* ============================================================
   TrainHub — Firebase Configuration
   Projeto: treinamentosJCA
   ============================================================ */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, doc, getDoc, getDocs, setDoc, deleteDoc, collection, query, where }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey:            "AIzaSyBMXEFXJ-Ar4cXuhWjBis05HYdqz2ucSi0",
  authDomain:        "treinamentosjca-cce6a.firebaseapp.com",
  projectId:         "treinamentosjca-cce6a",
  storageBucket:     "treinamentosjca-cce6a.firebasestorage.app",
  messagingSenderId: "33377343225",
  appId:             "1:33377343225:web:53ccce313cb67f145d7428"
};

const app      = initializeApp(firebaseConfig);
const auth     = getAuth(app);
const db       = getFirestore(app);
const provider = new GoogleAuthProvider();

// ─── Auth ─────────────────────────────────────────────────────

// Login simples para admin — sem verificar coleção de instrutores
async function loginWithGoogleAdmin() {
  try {
    const result = await signInWithPopup(auth, provider);
    return { user: result.user };
  } catch (err) {
    if (err.code === 'auth/popup-closed-by-user') return { error: null };
    return { error: 'Falha no login. Tente novamente.' };
  }
}

async function loginWithGoogle() {
  try {
    const result     = await signInWithPopup(auth, provider);
    const user       = result.user;
    const instructor = await getInstructorByEmail(user.email);
    if (!instructor) {
      await signOut(auth);
      return { error: `E-mail "${user.email}" não está cadastrado. Fale com o administrador.` };
    }
    return { user, instructor };
  } catch (err) {
    if (err.code === 'auth/popup-closed-by-user') return { error: null };
    return { error: 'Falha no login. Tente novamente.' };
  }
}

async function logout() {
  await signOut(auth);
  window.location.href = 'index.html';
}

function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

function getCurrentUser() {
  return auth.currentUser;
}

// ─── Instrutores ──────────────────────────────────────────────

async function getInstructorByEmail(email) {
  try {
    const q    = query(collection(db, 'instrutores'), where('email', '==', email.toLowerCase()));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() };
  } catch { return null; }
}

async function getAllInstructors() {
  try {
    const snap = await getDocs(collection(db, 'instrutores'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch { return []; }
}

async function saveInstructor(inst) {
  const id = inst.matricula.toUpperCase();
  await setDoc(doc(db, 'instrutores', id), {
    matricula: inst.matricula.toUpperCase(),
    nome:      inst.nome,
    email:     inst.email.toLowerCase(),
    empresaId: inst.empresaId,
    ativo:     inst.ativo !== false,
    criadoEm:  inst.criadoEm || new Date().toISOString(),
  }, { merge: true });
}

async function deleteInstructor(matricula) {
  await deleteDoc(doc(db, 'instrutores', matricula.toUpperCase()));
}

async function importInstructors(list) {
  const results = { ok: 0, err: 0 };
  for (const inst of list) {
    try { await saveInstructor(inst); results.ok++; }
    catch { results.err++; }
  }
  return results;
}

// ─── Empresas ─────────────────────────────────────────────────

async function getCompanies() {
  try {
    const snap = await getDocs(collection(db, 'empresas'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch { return []; }
}

async function saveCompany(company) {
  await setDoc(doc(db, 'empresas', company.id), company, { merge: true });
}

async function deleteCompany(id) {
  await deleteDoc(doc(db, 'empresas', id));
}

// ─── Treinamentos ─────────────────────────────────────────────

async function getTrainings(companyId) {
  try {
    const q    = companyId
      ? query(collection(db, 'treinamentos'), where('companyId', '==', companyId))
      : collection(db, 'treinamentos');
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch { return []; }
}

async function saveTraining(training) {
  await setDoc(doc(db, 'treinamentos', training.id), training, { merge: true });
}

async function deleteTraining(id) {
  await deleteDoc(doc(db, 'treinamentos', id));
}

// ─── Progresso ────────────────────────────────────────────────

async function saveProgress(userId, trainingId, data) {
  await setDoc(doc(db, 'progresso', `${userId}_${trainingId}`), {
    userId, trainingId, ...data, atualizadoEm: new Date().toISOString()
  }, { merge: true });
}

async function getProgress(userId, trainingId) {
  try {
    const snap = await getDoc(doc(db, 'progresso', `${userId}_${trainingId}`));
    return snap.exists() ? snap.data() : null;
  } catch { return null; }
}

export {
  auth, db,
  loginWithGoogle, loginWithGoogleAdmin, logout, onAuthChange, getCurrentUser,
  getInstructorByEmail, getAllInstructors, saveInstructor, deleteInstructor, importInstructors,
  getCompanies, saveCompany, deleteCompany,
  getTrainings, saveTraining, deleteTraining,
  saveProgress, getProgress,
};
