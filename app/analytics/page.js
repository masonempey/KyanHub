"use client";

import { useState, useEffect } from "react";
import AdminProtected from "@/app/components/AdminProtected";
import styles from "./analytics.module.css";
import BackgroundContainer from "../components/backgroundContainer";
import MonthlyRevenueChart from "./monthlyRevenueChart";
import MonthlyMaintenanceChart from "./monthlyMaintenanceChart";
import { useProperties } from "../../contexts/PropertyContext";
import { useUser } from "../../contexts/UserContext";
import CircularProgress from "@mui/material/CircularProgress";
import fetchWithAuth from "@/lib/fetchWithAuth";

const AnalyticsPage = () => {
  const { user, loading: userLoading } = useUser();
  const {
    properties: allProperties,
    loading: propertiesLoading,
    propertyId,
    selectedPropertyName,
    currentMonth,
    setCurrentMonth,
  } = useProperties();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const verifyAdmin = async () => {
      const response = await fetchWithAuth("/api/admin");
      const data = await response.json();
      console.log("Admin verification:", data);
    };

    if (user) {
      verifyAdmin();
    }
  }, [user]);

  if (userLoading || propertiesLoading || isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <CircularProgress sx={{ color: "#eccb34" }} />
      </div>
    );
  }

  if (!user) return <div>Please log in to access this page.</div>;

  return (
    <AdminProtected>
      <div className={styles.DashboardContainer}>
        <div className={styles.viewContainer}>
          <div className={styles.smallRevenueContainer}>
            <BackgroundContainer width="100%" height="100%" />
            <MonthlyRevenueChart propertyId={propertyId} month={currentMonth} />
          </div>
          <div className={styles.largeExpenseContainer}>
            <BackgroundContainer width="100%" height="100%" />
          </div>
          <div className={styles.smallRevenueContainer}>
            <BackgroundContainer width="100%" height="100%" />
            <MonthlyMaintenanceChart
              propertyId={propertyId}
              month={currentMonth}
            />
          </div>
          <div className={styles.largeExpenseContainer}>
            <BackgroundContainer width="100%" height="100%" />
          </div>
        </div>
      </div>
    </AdminProtected>
  );
};

export default AnalyticsPage;
