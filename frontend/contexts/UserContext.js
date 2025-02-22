"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../app/firebase/config";
import { useRouter } from "next/navigation";

const UserContext = createContext();

export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/${firebaseUser.uid}`
          );
          const userData = await response.json();
          const userWithRole = {
            email: userData.email,
            uid: firebaseUser.uid,
            role: userData.role,
          };
          setUser(userWithRole);
          console.log("User details:", userWithRole);
          if (userWithRole.role === "admin") {
            router.push("/add");
          } else {
            router.push("/add"); //IF NOT ADMIN PUSH HERE
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  return (
    <UserContext.Provider value={{ user, loading }}>
      {children}
    </UserContext.Provider>
  );
};
