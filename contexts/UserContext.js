// contexts/UserContext.js
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { useRouter, usePathname } from "next/navigation";

const UserContext = createContext();

export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          if (!user || user.uid !== firebaseUser.uid) {
            const response = await fetch(`/api/users/${firebaseUser.uid}`);
            const userData = await response.json();
            console.log("User data fetched:", userData);

            const userWithRole = {
              ...firebaseUser,
              email: firebaseUser.email,
              uid: firebaseUser.uid,
              role: userData.role,
            };

            console.log("Setting user:", userWithRole);
            setUser(userWithRole);

            // Initialize watches for admin users via API
            if (userWithRole.role === "admin") {
              console.log("Admin user authenticated, calling init-watch API");
              await fetch("/api/init/init-watch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
              });
            }
          }
        } else {
          console.log("No Firebase user, clearing user state");
          setUser(null);
        }
      } catch (error) {
        console.error("Error in onAuthStateChanged:", error);
        setUser(null);
      } finally {
        console.log("Setting loading false");
        setLoading(false);
      }
    });

    return () => {
      console.log("Unsubscribing from onAuthStateChanged");
      unsubscribe();
    };
  }, [user]);

  // Redirect logic
  useEffect(() => {
    console.log(
      "Redirect effect - User:",
      user,
      "Loading:",
      loading,
      "Path:",
      pathname
    );
    if (!loading) {
      if (user && pathname === "/login") {
        console.log("User signed in, redirecting to /property-management");
        router.push("/property-management");
      } else if (!user && pathname !== "/login") {
        console.log("No user, redirecting to /login");
        router.push("/login");
      }
    }
  }, [user, loading, pathname, router]);

  const contextValue = React.useMemo(
    () => ({
      user,
      loading,
      logout: async () => {
        console.log("Logging out...");
        await signOut(auth);
        setUser(null);
        router.push("/login");
      },
      login: () => router.push("/login"),
    }),
    [user, loading, router]
  );

  return (
    <UserContext.Provider value={contextValue}>{children}</UserContext.Provider>
  );
};
