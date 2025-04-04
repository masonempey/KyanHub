import React, { useState } from "react";
import FilterBar from "./PropertyFilterBar";
import MonthSelection from "./MonthSelection";
import { Button, IconButton } from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
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
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState(null);

  const openMobileMenu = (event) => {
    setMobileMenuAnchor(event.currentTarget);
  };

  const closeMobileMenu = () => {
    setMobileMenuAnchor(null);
  };

  return (
    <div className="w-full bg-transparent py-3 md:py-6 px-4 md:px-8 flex flex-col md:flex-row md:items-center border-b border-primary/10">
      {/* Page Title */}
      <h1 className="text-dark text-2xl md:text-4xl font-bold mb-4 md:mb-0 md:mr-6">
        {currentPage}
      </h1>

      {/* Mobile Menu Button (only visible on small screens) */}
      <div className="md:hidden flex justify-between items-center">
        <div className="flex-1">
          <FilterBar
            properties={filteredProperties}
            loading={loading}
            onPropertySelect={handlePropertyChange}
            mobile={true}
          />
        </div>
        <IconButton
          onClick={openMobileMenu}
          className="ml-2 text-dark"
          aria-label="more options"
        >
          <MoreVertIcon />
        </IconButton>
      </div>

      {/* Mobile Menu */}
      <Menu
        anchorEl={mobileMenuAnchor}
        open={Boolean(mobileMenuAnchor)}
        onClose={closeMobileMenu}
        PaperProps={{
          sx: {
            width: "200px",
            mt: 1,
            borderRadius: "8px",
            bgcolor: "#fafafa",
          },
        }}
      >
        <MenuItem sx={{ justifyContent: "center", py: 2 }}>
          <MonthSelection
            selectedMonth={selectedMonth}
            onMonthChange={onMonthChange}
            mobile={true}
          />
        </MenuItem>
        <MenuItem
          onClick={() => {
            user ? logout() : login();
            closeMobileMenu();
          }}
          sx={{
            justifyContent: "center",
            py: 2,
            color: "#333",
            "&:hover": { bgcolor: "rgba(236, 203, 52, 0.1)" },
          }}
        >
          {user ? "Logout" : "Login"}
        </MenuItem>
      </Menu>

      {/* Desktop Controls (hidden on mobile) */}
      <div className="hidden md:flex items-center gap-6 flex-1">
        <div className="w-64 ml-6">
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

      {/* Login/Logout Button (hidden on mobile) */}
      <Button
        variant="contained"
        onClick={user ? logout : login}
        className="hidden md:flex bg-primary hover:bg-secondary hover:text-primary text-dark font-medium px-6 py-2 rounded-lg shadow-md transition-colors duration-300 ml-auto"
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
