"use client";

import { useProperties } from "../../contexts/PropertyContext";
import styles from "./dashboard.module.css";
import BackgroundContainer from "../components/backgroundContainer";
import FilterBar from "../components/propertyFilterBar";

const dashboardPage = () => {
  const { properties, loading } = useProperties();

  return (
    <div className={styles.DashboardContainer}>
      <div className={styles.topNav}>
        <h1>Dashboard</h1>
        <div className={styles.filterBarContainer}>
          <FilterBar properties={properties} loading={loading} />
        </div>
      </div>
      <div className={styles.topLine}></div>
      <div className={styles.viewContainer}>
        <div className={styles.smallRevenueContainer}>
          <BackgroundContainer width="100%" height="100%" />
        </div>
        <div className={styles.largeExpenseContainer}>
          <BackgroundContainer width="100%" height="100%" />
        </div>
        <div className={styles.smallRevenueContainer}>
          <BackgroundContainer width="100%" height="100%" />
        </div>
        <div className={styles.largeExpenseContainer}>
          <BackgroundContainer width="100%" height="100%" />
        </div>
      </div>
    </div>
  );
};

export default dashboardPage;
