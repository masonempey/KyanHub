import React from "react";
import styles from "../styles/topNav.module.css";
import FilterBar from "../components/propertyFilterBar";
import MonthSelection from "../components/monthSelection";

const TopNav = ({
  filteredProperties,
  loading,
  handlePropertyChange,
  selectedMonth,
  currentPage,
  onMonthChange,
}) => {
  return (
    <div>
      <div className={styles.topNav}>
        <h1>{currentPage}</h1>
        <div className={styles.filterContainer}>
          <div className={styles.propertyBarContainer}>
            <FilterBar
              properties={filteredProperties}
              loading={loading}
              onPropertySelect={handlePropertyChange}
            />
          </div>
          <div className={styles.monthSelectionContainer}>
            <MonthSelection
              selectedMonth={selectedMonth}
              onMonthChange={onMonthChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopNav;
