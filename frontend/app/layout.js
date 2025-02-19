import "./styles/globals.css";
import SideBar from "./components/sideBar";
import React from "react";
import { UserProvider } from "../contexts/UserContext";
import { PropertyProvider } from "../contexts/PropertyContext";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="layout">
          <UserProvider>
            <PropertyProvider>
              <SideBar />
              <main className="main-content">{children}</main>
            </PropertyProvider>
          </UserProvider>
        </div>
      </body>
    </html>
  );
}
