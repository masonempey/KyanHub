"use client";

import styles from "./analytics.module.css";
import BackgroundContainer from "../components/backgroundContainer";
import MonthlyRevenueChart from "./monthlyRevenueChart";
import MonthlyMaintenanceChart from "./monthlyMaintenanceChart";
import { useProperties } from "../../contexts/PropertyContext";
import { useUser } from "../../contexts/UserContext";

const AnalyticsPage = () => {
  const { user, loading: userLoading } = useUser();
  const { propertyId, currentMonth } = useProperties();

  if (userLoading || propertiesLoading) return <div>Loading...</div>;
  if (!user) return <div>Please log in to access this page.</div>;

  return (
    <div className={styles.DashboardContainer}>
      <div className={styles.topLine}></div>
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
  );
};

export default AnalyticsPage;
