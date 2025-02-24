// layout.js
"use client";

import "./styles/globals.css";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { UserProvider, useUser } from "../contexts/UserContext";
import { PropertyProvider, useProperties } from "../contexts/PropertyContext";
import RootLayoutClient from "./components/RootLayoutClient";

const AuthWrapper = ({ children }) => {
  const { user, loading: userLoading } = useUser();
  const { properties, loading: propertiesLoading } = useProperties();
  const router = useRouter();

  useEffect(() => {
    if (!userLoading && !propertiesLoading) {
      if (!user && router.pathname !== "/login") {
        router.push("/login");
      }
    }
  }, [user, userLoading, propertiesLoading, router]);

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
