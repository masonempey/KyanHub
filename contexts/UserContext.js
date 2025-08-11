// contexts/UserContext.js
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getCurrentUser, signOut } from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";

const UserContext = createContext();

export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // Check for authenticated user
    const checkUser = async () => {
      try {
        const cognitoUser = await getCurrentUser();
        const userAttributes = cognitoUser.signInDetails?.loginId
          ? { email: cognitoUser.signInDetails.loginId }
          : {};

        if (isMounted) {
          const userWithRole = {
            email: userAttributes.email || cognitoUser.username,
            uid: cognitoUser.username,
            role: cognitoUser.attributes?.["custom:role"] || "user",
          };
          setUser(userWithRole);
        }
      } catch (error) {
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Listen for auth events
    const hubListener = Hub.listen("auth", ({ payload: { event, data } }) => {
      switch (event) {
        case "signInWithRedirect":
          checkUser();
          break;
        case "signOut":
          setUser(null);
          router.push("/login");
          break;
        case "customOAuthState":
          break;
      }
    });

    checkUser();

    return () => {
      isMounted = false;
      hubListener(); // Calling the function returned by hub.listen to unsubscribe
    };
  }, [router]);

  // Redirect logic
  useEffect(() => {
    if (loading) return;

    const currentPath = pathname || "";

    if (user) {
      if (currentPath === "/login") {
        router.push("/property-management");
      }
    } else {
      if (currentPath !== "/login") {
        router.push("/login");
      }
    }
  }, [user, loading, pathname, router]);

  const contextValue = React.useMemo(
    () => ({
      user,
      loading,
      logout: async () => {
        try {
          await signOut();
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
