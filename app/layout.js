// In app/layout.js
import "./styles/globals.css";
import { UserProvider } from "@/contexts/UserContext";
import { PropertyProvider } from "@/contexts/PropertyContext";
import RootLayoutClient from "./components/RootLayoutClient";
import UserProtected from "./components/UserProtected";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <UserProvider>
          <PropertyProvider>
            <RootLayoutClient>
              <UserProtected>{children}</UserProtected>
            </RootLayoutClient>
          </PropertyProvider>
        </UserProvider>
      </body>
    </html>
  );
}
