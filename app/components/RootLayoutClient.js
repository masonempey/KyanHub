"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import SideBar from "./SideBar";
import TopNav from "./TopNav";
import { useProperties } from "../../contexts/PropertyContext";

export default function RootLayoutClient({ children }) {
  const pathname = usePathname();
  const [isLoginPage, setIsLoginPage] = useState(false);
  const {
    properties: allProperties,
    loading,
    propertyId,
    setPropertyId,
    selectedPropertyName,
    setSelectedPropertyName,
    currentMonth,
    setCurrentMonth,
  } = useProperties();

  const handlePropertyChange = (uid, name) => {
    setPropertyId(uid);
    setSelectedPropertyName(name);
  };

  const handleMonthChange = (month) => {
    setCurrentMonth(month);
  };

  useEffect(() => {
    setIsLoginPage(pathname === "/login");
  }, [pathname]);

  const setPageName = (pathname) => {
    if (pathname === "/analytics") {
      return "Analytics";
    }
    if (pathname === "/property-management") {
      return "Property Management";
    }
    if (pathname === "/reports") {
      return "Reports";
    }
    if (pathname === "/profile") {
      return "Profile";
    }
  };

  return (
    <div className={`layout ${isLoginPage ? "no-sidebar" : ""}`}>
      {!isLoginPage && <SideBar />}
      <div className="content-container">
        {!isLoginPage && (
          <TopNav
            filteredProperties={allProperties}
            loading={loading}
            handlePropertyChange={handlePropertyChange}
            selectedMonth={currentMonth}
            currentPage={setPageName(pathname)}
            onMonthChange={handleMonthChange}
          />
        )}
        <main className={`main-content ${isLoginPage ? "no-sidebar" : ""}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
