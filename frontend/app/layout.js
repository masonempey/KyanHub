"use client";

import "./styles/globals.css";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { UserProvider, useUser } from "../contexts/UserContext";
import { PropertyProvider } from "../contexts/PropertyContext";
import RootLayoutClient from "./components/RootLayoutClient";

const AuthWrapper = ({ children }) => {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      if (router.pathname !== "/login") {
        router.push("/login");
      }
    }
  }, [user, loading, router]);

  if (loading) {
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
