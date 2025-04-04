"use client";

import React, { useState, useEffect, useRef } from "react";
import DashboardIcon from "@mui/icons-material/Dashboard";
import AddCircleSharpIcon from "@mui/icons-material/AddCircleSharp";
import SummarizeSharpIcon from "@mui/icons-material/SummarizeSharp";
import NotificationsNoneSharpIcon from "@mui/icons-material/NotificationsNoneSharp";
import PersonOutlineSharpIcon from "@mui/icons-material/PersonOutlineSharp";
import MapsHomeWorkIcon from "@mui/icons-material/MapsHomeWork";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import Badge from "@mui/material/Badge";
import { useRouter } from "next/navigation";
import NotificationsPanel from "./NotificationsPanel";
import fetchWithAuth from "@/lib/fetchWithAuth";
import { useUser } from "@/contexts/UserContext";

const SideBar = () => {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const [hoveredIcon, setHoveredIcon] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const notificationsRef = useRef(null);
  const sidebarRef = useRef(null);

  // Handle clicks outside sidebar to close mobile menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target) &&
        mobileMenuOpen
      ) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mobileMenuOpen]);

  const handleMouseOver = (iconName) => setHoveredIcon(iconName);
  const handleMouseOut = () => setHoveredIcon(null);

  // Fetch unread notification count with client-side caching
  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (!user || userLoading) return;

      // Check localStorage cache first
      const cachedData = localStorage.getItem("unreadNotifications");
      const now = Date.now();
      if (cachedData) {
        const { count, timestamp } = JSON.parse(cachedData);
        if (now - timestamp < 60000) {
          // 1 minute cache
          setUnreadCount(count);
          return;
        }
      }

      try {
        const response = await fetchWithAuth("/api/notifications/unread-count");
        if (response.ok) {
          const data = await response.json();
          setUnreadCount(data.count || 0);

          // Update cache
          localStorage.setItem(
            "unreadNotifications",
            JSON.stringify({
              count: data.count || 0,
              timestamp: now,
            })
          );
        }
      } catch (err) {
        console.error("Error fetching unread count:", err);
      }
    };

    if (user && !userLoading) {
      fetchUnreadCount();

      // Reduced polling frequency to every 2 minutes
      const interval = setInterval(fetchUnreadCount, 120000);
      return () => clearInterval(interval);
    }
  }, [user, userLoading]);

  const toggleNotifications = () => {
    setShowNotifications((prev) => !prev);
    if (mobileMenuOpen) setMobileMenuOpen(false);
  };

  const closeNotifications = () => {
    setShowNotifications(false);
  };

  const navigateTo = (path) => {
    router.push(path);
    setMobileMenuOpen(false);
  };

  const getIconClasses = (iconName) => {
    let classes = "text-primary transition-transform duration-300";

    // Adjust icon size for different screens
    classes += " text-4xl sm:text-5xl md:text-6xl";

    if (hoveredIcon === iconName) {
      classes += " transform scale-125";
    }
    return classes;
  };

  const getContainerClasses = (iconName) => {
    let classes =
      "p-3 sm:p-4 md:p-5 rounded-full transition-all duration-300 flex items-center justify-center";
    if (hoveredIcon === iconName) {
      classes += " bg-secondary/10";
    }
    return classes;
  };

  // Mobile menu toggle button
  const MobileMenuButton = () => (
    <div className="fixed top-4 left-4 z-50 md:hidden">
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="bg-primary/90 text-dark p-2 rounded-full shadow-lg"
        aria-label="Toggle menu"
      >
        {mobileMenuOpen ? (
          <CloseIcon fontSize="medium" />
        ) : (
          <MenuIcon fontSize="medium" />
        )}
      </button>
    </div>
  );

  const sidebarClasses = `
    ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"} 
    fixed md:static top-0 left-0 z-40
    h-full bg-white/80 backdrop-blur-md md:bg-transparent
    transition-transform duration-300 ease-in-out
    flex flex-col py-6 md:py-6
    w-64 md:w-20
    shadow-lg md:shadow-none
    px-6 md:px-16
  `;

  return (
    <>
      <MobileMenuButton />

      <div ref={sidebarRef} className={sidebarClasses}>
        {/* Mobile header */}
        <div className="md:hidden flex justify-between items-center mb-8">
          <h2 className="text-xl font-bold text-dark">KyanHub</h2>
        </div>

        {/* Navigation icons */}
        <div className="flex flex-col items-center gap-6 my-auto">
          {/* Mobile labels beside icons */}
          <div
            className={getContainerClasses("DashboardIcon")}
            onMouseOver={() => handleMouseOver("DashboardIcon")}
            onMouseOut={handleMouseOut}
            onClick={() => navigateTo("/analytics")}
          >
            <DashboardIcon className={getIconClasses("DashboardIcon")} />
            <span className="ml-3 text-dark md:hidden">Analytics</span>
          </div>

          <div
            className={getContainerClasses("AddCircleSharpIcon")}
            onMouseOver={() => handleMouseOver("AddCircleSharpIcon")}
            onMouseOut={handleMouseOut}
            onClick={() => navigateTo("/property-management")}
          >
            <AddCircleSharpIcon
              className={getIconClasses("AddCircleSharpIcon")}
            />
            <span className="ml-3 text-dark md:hidden">Management</span>
          </div>

          <div
            className={getContainerClasses("SummarizeSharpIcon")}
            onMouseOver={() => handleMouseOver("SummarizeSharpIcon")}
            onMouseOut={handleMouseOut}
            onClick={() => navigateTo("/reports")}
          >
            <SummarizeSharpIcon
              className={getIconClasses("SummarizeSharpIcon")}
            />
            <span className="ml-3 text-dark md:hidden">Reports</span>
          </div>

          <div
            className={getContainerClasses("MapsHomeWorkIcon")}
            onMouseOver={() => handleMouseOver("MapsHomeWorkIcon")}
            onMouseOut={handleMouseOut}
            onClick={() => navigateTo("/property-view")}
          >
            <MapsHomeWorkIcon className={getIconClasses("MapsHomeWorkIcon")} />
            <span className="ml-3 text-dark md:hidden">Properties</span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-6 mt-auto">
          <div
            className={getContainerClasses("NotificationsNoneSharpIcon")}
            onMouseOver={() => handleMouseOver("NotificationsNoneSharpIcon")}
            onMouseOut={handleMouseOut}
            onClick={toggleNotifications}
            ref={notificationsRef}
          >
            <Badge
              badgeContent={unreadCount}
              color="error"
              sx={{
                "& .MuiBadge-badge": {
                  backgroundColor: "#eccb34",
                  color: "#333",
                },
              }}
            >
              <NotificationsNoneSharpIcon
                className={getIconClasses("NotificationsNoneSharpIcon")}
              />
            </Badge>
            <span className="ml-3 text-dark md:hidden">Notifications</span>
          </div>

          <div
            className={getContainerClasses("PersonOutlineSharpIcon")}
            onMouseOver={() => handleMouseOver("PersonOutlineSharpIcon")}
            onMouseOut={handleMouseOut}
            onClick={() => navigateTo("/profile")}
          >
            <PersonOutlineSharpIcon
              className={getIconClasses("PersonOutlineSharpIcon")}
            />
            <span className="ml-3 text-dark md:hidden">Profile</span>
          </div>
        </div>

        {/* Notifications Panel */}
        <NotificationsPanel
          open={showNotifications}
          anchorEl={notificationsRef.current}
          onClose={closeNotifications}
        />
      </div>

      {/* Overlay when mobile menu is open */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </>
  );
};

export default SideBar;
