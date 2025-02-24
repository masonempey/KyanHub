import React from "react";
import styles from "../styles/topNav.module.css";
import FilterBar from "../components/propertyFilterBar";
import MonthSelection from "../components/monthSelection";
import { Button } from "@mui/material";
import { useUser } from "../../contexts/UserContext";

const TopNav = ({
  filteredProperties,
  loading,
  handlePropertyChange,
  selectedMonth,
  currentPage,
  onMonthChange,
}) => {
  const { logout } = useUser();

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
        <Button
          variant="contained"
          color="secondary"
          onClick={logout}
          sx={{
            marginLeft: "auto",
            backgroundColor: "#eccb34",
            color: "#fafafa",
            "&:hover": {
              backgroundColor: "#fafafa",
              color: "#eccb34",
            },
          }}
        >
          Logout
        </Button>
      </div>
    </div>
  );
};

export default TopNav;
