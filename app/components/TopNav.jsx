import React from "react";
import FilterBar from "./PropertyFilterBar";
import MonthSelection from "./monthSelection";
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
  const { logout, login, user } = useUser();

  return (
    <div className="w-full bg-transparent py-4 px-6 flex items-center">
      <h1 className="text-dark text-2xl font-bold mr-8">{currentPage}</h1>

      <div className="flex items-center gap-4 flex-grow">
        <div className="w-72">
          <FilterBar
            properties={filteredProperties}
            loading={loading}
            onPropertySelect={handlePropertyChange}
          />
        </div>
        <div className="w-48">
          <MonthSelection
            selectedMonth={selectedMonth}
            onMonthChange={onMonthChange}
          />
        </div>
      </div>

      <Button
        variant="contained"
        onClick={user ? logout : login}
        className="ml-auto bg-primary hover:bg-secondary hover:text-primary text-secondary"
      >
        {user ? "Logout" : "Login"}
      </Button>
    </div>
  );
};

export default TopNav;
