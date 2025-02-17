"use client";

import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import { useProperties } from "../../contexts/PropertyContext";
import styles from "./analytics.module.css";
import BackgroundContainer from "../components/backgroundContainer";
import TopNav from "../components/topNav";

const AnalyticsPage = () => {
  const { properties: allProperties, loading } = useProperties();
  const [filteredProperties, setFilteredProperties] = useState({});
  const [currentMonth, setCurrentMonth] = useState(dayjs().format("MMMM"));
  const [selectedPropertyName, setSelectedPropertyName] = useState();

  const excludedProperties = ["Windsor 95/96 Combo", "Windsor 97/98 Combo"];

  useEffect(() => {
    // Filter out excluded properties
    const filtered = Object.entries(allProperties)
      .filter(([_, name]) => !excludedProperties.includes(name))
      .reduce((acc, [uid, name]) => {
        acc[uid] = name;
        return acc;
      }, {});

    setFilteredProperties(filtered);
  }, [allProperties]);

  const handlePropertyChange = (propertyId, propertyName) => {
    console.log("Property selected:", { id: propertyId, name: propertyName });
    setSelectedPropertyName(propertyName);
  };

  const handleMonthChange = (newMonth) => {
    setCurrentMonth(newMonth);
  };

  return (
    <div className={styles.DashboardContainer}>
      <TopNav
        filteredProperties={filteredProperties}
        loading={loading}
        handlePropertyChange={handlePropertyChange}
        selectedMonth={currentMonth}
        currentPage="Analytics"
        onMonthChange={handleMonthChange}
      />
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

export default AnalyticsPage;
