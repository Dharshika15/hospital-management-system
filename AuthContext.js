import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const docRef = doc(db, 'users', firebaseUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) setUserData(docSnap.data());
        setUser(firebaseUser);
      } else {
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = (email, password) => signInWithEmailAndPassword(auth, email, password);
  const logout = () => signOut(auth);
  const getToken = async () => user ? user.getIdToken() : null;

  return (
    <AuthContext.Provider value={{ user, userData, loading, login, logout, getToken }}>
      {children}
    </AuthContext.Provider>
  );
};
