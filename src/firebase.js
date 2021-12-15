import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/auth';

const firebaseConfig = {
    apiKey: "AIzaSyDpwuyp3djrJWO0tlTFgBZxgVOyBk0kjB4",
    authDomain: "poligonalia.firebaseapp.com",
    projectId: "poligonalia",
    storageBucket: "poligonalia.appspot.com",
    messagingSenderId: "179145812681",
    appId: "1:179145812681:web:bf223f2d44a2700830fb18"
  };
  
  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);

  export const db = firebase.firestore();
  export const auth = firebase.auth();
  export default firebase;