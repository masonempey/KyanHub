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
  const [initWatchCalled, setInitWatchCalled] = useState(false);

  // Auth state listener - optimized to not depend on user
  useEffect(() => {
    let isMounted = true;
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Only fetch user data if we don't have it yet or it's for a different user
          if (!user || user.uid !== firebaseUser.uid) {
            // Use Promise.race with a timeout to prevent this from hanging
            const userDataPromise = Promise.race([
              fetch(`/api/users/${firebaseUser.uid}`).then((res) => res.json()),
              new Promise((_, reject) =>
                setTimeout(
                  () => reject(new Error("User data fetch timeout")),
                  5000
                )
              ),
            ]);

            try {
              const userData = await userDataPromise;

              if (isMounted) {
                const userWithRole = {
                  email: firebaseUser.email,
                  uid: firebaseUser.uid,
                  role: userData.role,
                };

                setUser(userWithRole);
              }
            } catch (error) {
              console.error("Error fetching user data:", error);
              if (isMounted) {
                // Still set basic user info even if role fetch fails
                setUser({
                  email: firebaseUser.email,
                  uid: firebaseUser.uid,
                  role: "unknown",
                });
              }
            }
          }
        } else {
          if (isMounted) {
            setUser(null);
          }
        }
      } catch (error) {
        console.error("Error in onAuthStateChanged:", error);
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Separate non-blocking effect for admin initialization
  useEffect(() => {
    if (user?.role === "admin" && !initWatchCalled) {
      console.log("Admin user authenticated, calling init-watch API");
      setInitWatchCalled(true);

      // Make this non-blocking with fetch
      fetch("/api/init/init-watch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Init watch failed: ${response.status}`);
          }
          console.log("Init watch completed successfully");
        })
        .catch((err) => {
          console.error("Init watch error:", err);
          // Reset flag after some time to allow retry
          setTimeout(() => setInitWatchCalled(false), 60000);
        });
    }
  }, [user, initWatchCalled]);

  // Optimized redirect logic
  useEffect(() => {
    if (loading) return; // Don't redirect while loading

    const currentPath = pathname || "";

    // Handle redirects based on auth state
    if (user) {
      // User is logged in
      if (currentPath === "/login") {
        console.log("User signed in, redirecting to /property-management");
        router.push("/property-management");
      }
    } else {
      // User not logged in
      if (currentPath !== "/login") {
        console.log("No user, redirecting to /login");
        router.push("/login");
      }
    }
  }, [user, loading, pathname, router]);

  // Memoized context value to prevent unnecessary re-renders
  const contextValue = React.useMemo(
    () => ({
      user,
      loading,
      logout: async () => {
        try {
          await signOut(auth);
          setUser(null);
          router.push("/login");
        } catch (error) {
          console.error("Error signing out:", error);
        }
      },
      login: () => router.push("/login"),
    }),
    [user, loading, router]
  );

  return (
    <UserContext.Provider value={contextValue}>{children}</UserContext.Provider>
  );
};
