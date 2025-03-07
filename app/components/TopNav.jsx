import React from "react";
import FilterBar from "./PropertyFilterBar";
import MonthSelection from "./MonthSelection";
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
    <div className="w-full bg-transparent py-6 px-8 flex items-center border-b border-primary/10">
      <h1 className="text-dark text-4xl font-bold mr-20">{currentPage}</h1>

      <div className="flex items-center gap-6">
        <div className="w-64 ml-20">
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
        className="bg-primary hover:bg-secondary hover:text-primary text-dark font-medium px-6 py-2 rounded-lg shadow-md transition-colors duration-300 ml-auto"
        sx={{
          textTransform: "none",
          fontSize: "1rem",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          "&:hover": {
            boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
          },
        }}
      >
        {user ? "Logout" : "Login"}
      </Button>
    </div>
  );
};

export default TopNav;
