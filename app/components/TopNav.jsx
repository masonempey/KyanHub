import React, { useState } from "react";
import FilterBar from "./PropertyFilterBar";
import MonthSelection from "./MonthSelection";
import { Button, IconButton } from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import { useUser } from "../../contexts/UserContext";

const TopNav = ({
  filteredProperties,
  loading,
  handlePropertyChange,
  selectedMonth,
  currentPage,
  onMonthChange,
  mobileMenuOpen,
  setMobileMenuOpen,
  pathname,
}) => {
  const { logout, login, user } = useUser();
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState(null);

  const openMobileMenu = (event) => {
    setMobileMenuAnchor(event.currentTarget);
  };

  const closeMobileMenu = () => {
    setMobileMenuAnchor(null);
  };

  const hideFilters = pathname === "/reports";

  return (
    <header className="bg-secondary/95 border-b border-primary/10 p-4 flex items-center justify-between sticky top-0 z-10 md:static">
      {/* Logo and Toggle Button (mobile) */}
      <div className="md:hidden flex items-center">
        <IconButton
          onClick={() =>
            setMobileMenuOpen && setMobileMenuOpen(!mobileMenuOpen)
          }
          className="text-dark mr-2"
          aria-label="menu"
        >
          {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
        </IconButton>
        <h1 className="text-xl font-semibold text-dark">
          {currentPage || "Dashboard"}
        </h1>
      </div>

      {/* Page Title (desktop) */}
      <h1 className="hidden md:block text-xl font-semibold text-dark">
        {currentPage || "Dashboard"}
      </h1>

      {/* Mobile Actions */}
      <div className="md:hidden flex items-center">
        {!hideFilters && (
          <div className="w-36">
            <FilterBar
              properties={filteredProperties}
              loading={loading}
              onPropertySelect={handlePropertyChange}
              mobile={true}
            />
          </div>
        )}
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
        {!hideFilters && (
          <MenuItem sx={{ justifyContent: "center", py: 2 }}>
            <MonthSelection
              selectedMonth={selectedMonth}
              onMonthChange={onMonthChange}
              mobile={true}
            />
          </MenuItem>
        )}
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
        {!hideFilters && (
          <>
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
          </>
        )}
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
    </header>
  );
};

export default TopNav;
