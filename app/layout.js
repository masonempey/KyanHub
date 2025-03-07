// In app/layout.js
import "../styles/global.css";
import { Lato } from "next/font/google";
import { UserProvider } from "@/contexts/UserContext";
import { PropertyProvider } from "@/contexts/PropertyContext";
import RootLayoutClient from "./components/RootLayoutClient";
import UserProtected from "./components/UserProtected";

const lato = Lato({
  subsets: ["latin"],
  weight: ["100", "300", "400", "700", "900"],
  style: ["normal", "italic"],
  display: "swap",
});

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={lato.className}>
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
