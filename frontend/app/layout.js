import "./styles/globals.css";
import { UserProvider } from "../contexts/UserContext";
import { PropertyProvider } from "../contexts/PropertyContext";
import RootLayoutClient from "./components/RootLayoutClient";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <UserProvider>
          <PropertyProvider>
            <RootLayoutClient>{children}</RootLayoutClient>
          </PropertyProvider>
        </UserProvider>
      </body>
    </html>
  );
}
