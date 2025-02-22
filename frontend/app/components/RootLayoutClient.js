"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import SideBar from "./sideBar";
import TopNav from "./topNav";
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
    console.log("PROPERTYNAME: ", name);
    setPropertyId(uid);
    setSelectedPropertyName(name);
  };

  const handleMonthChange = (month) => {
    setCurrentMonth(month);
  };

  useEffect(() => {
    setIsLoginPage(pathname === "/login");
  }, [pathname]);

  return (
    <div className={`layout ${isLoginPage ? "no-sidebar" : ""}`}>
      {!isLoginPage && <SideBar />}
      {!isLoginPage && (
        <TopNav
          filteredProperties={allProperties}
          loading={loading}
          handlePropertyChange={handlePropertyChange}
          selectedMonth={currentMonth}
          currentPage="Analytics"
          onMonthChange={handleMonthChange}
        />
      )}
      <main className={`main-content ${isLoginPage ? "no-sidebar" : ""}`}>
        {children}
      </main>
    </div>
  );
}
