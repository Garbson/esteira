import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";

// ============================================================
// 🔥 CONFIGURAÇÃO DO FIREBASE
// ============================================================
// Para configurar, siga estes passos:
//
// 1. Acesse https://console.firebase.google.com/
// 2. Clique em "Criar projeto" (ou "Add project")
// 3. Dê o nome "esteira" e clique em Continuar
// 4. Desative o Google Analytics (não precisa) e clique em Criar
// 5. No painel do projeto, clique no ícone "</>" (Web)
// 6. Dê o nome "esteira-web" e clique em Registrar
// 7. Copie o objeto firebaseConfig que aparece e cole aqui abaixo
// 8. No menu lateral, clique em "Firestore Database"
// 9. Clique em "Criar banco de dados"
// 10. Escolha "Iniciar no modo de teste" e selecione a região
// 11. Clique em Criar
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyBO0RglksXvjaakJW85V7N1xJkMrQxuHjY",
  authDomain: "esteiranfcom.firebaseapp.com",
  projectId: "esteiranfcom",
  storageBucket: "esteiranfcom.firebasestorage.app",
  messagingSenderId: "1014956060748",
  appId: "1:1014956060748:web:1e6f55978415b4d0c8c4e9",
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Inicializa o Firestore
const db = getFirestore(app);

// Referência da coleção de itens da esteira
const itemsCollection = collection(db, "esteira_items");

// ============================================================
// FUNÇÕES DO BANCO DE DADOS
// ============================================================

/**
 * Escuta mudanças em tempo real na coleção.
 * Quando alguém mover/adicionar/deletar, todos veem na hora.
 */
export const onItemsChange = (callback) => {
  const q = query(itemsCollection, orderBy("criadoEm", "desc"));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(items);
  });
};

/**
 * Busca todos os itens (usado no carregamento inicial)
 */
export const getItems = async () => {
  const q = query(itemsCollection, orderBy("criadoEm", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

/**
 * Adiciona um novo item na esteira
 */
export const addItem = async (item) => {
  const docRef = await addDoc(itemsCollection, {
    ...item,
    criadoEm: new Date().toISOString(),
  });
  return docRef.id;
};

/**
 * Atualiza um item existente (mover, editar, etc.)
 */
export const updateItem = async (itemId, data) => {
  const docRef = doc(db, "esteira_items", itemId);
  await updateDoc(docRef, data);
};

/**
 * Deleta um item da esteira
 */
export const removeItem = async (itemId) => {
  const docRef = doc(db, "esteira_items", itemId);
  await deleteDoc(docRef);
};

export { db };
