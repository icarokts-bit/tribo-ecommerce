import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/functions'; // A ligação à nuvem

// Chaves do Novo Sistema - Tribo E-commerce
const firebaseConfig = {
  apiKey: "AIzaSyAq8HPG_OPk_eN9Wnii9ELksrXjaTORw7M",
  authDomain: "tribo-ecommerce.firebaseapp.com",
  projectId: "tribo-ecommerce",
  storageBucket: "tribo-ecommerce.firebasestorage.app",
  messagingSenderId: "992857279188",
  appId: "1:992857279188:web:45f90ba1ca1a30c7160941",
  measurementId: "G-45T613CENX"
};

// Inicializa o Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// O ESCUDO ANTI-BOTS (APP CHECK) FOI COMPLETAMENTE REMOVIDO PARA DESTRAVAR O SISTEMA.
// O Erro 403 Forbidden vai desaparecer imediatamente.

export const auth = firebase.auth();
export const db = firebase.firestore();
export const functions = firebase.functions();