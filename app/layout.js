"use client";

import "./styles/globals.css";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation"; // Add usePathname
import { UserProvider, useUser } from "../contexts/UserContext";
import { PropertyProvider, useProperties } from "../contexts/PropertyContext";
import RootLayoutClient from "./components/RootLayoutClient";

const AuthWrapper = ({ children }) => {
  const { user, loading: userLoading } = useUser();
  const { properties, loading: propertiesLoading } = useProperties();
  const router = useRouter();
  const pathname = usePathname(); // Get current path

  useEffect(() => {
    if (!userLoading && !propertiesLoading) {
      if (!user && pathname !== "/login") {
        router.push("/login"); // Unauthenticated -> force to /login
      } else if (user && pathname === "/login") {
        router.push("/property-management"); // Authenticated -> redirect from /login
      }
    }
  }, [user, userLoading, propertiesLoading, router, pathname]);

  if (userLoading || propertiesLoading) {
    return <div>Loading...</div>;
  }

  return children;
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <UserProvider>
          <PropertyProvider>
            <RootLayoutClient>
              <AuthWrapper>{children}</AuthWrapper>
            </RootLayoutClient>
          </PropertyProvider>
        </UserProvider>
      </body>
    </html>
  );
}
