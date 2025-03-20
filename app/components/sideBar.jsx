"use client";

import React, { useState, useEffect, useRef } from "react";
import DashboardIcon from "@mui/icons-material/Dashboard";
import AddCircleSharpIcon from "@mui/icons-material/AddCircleSharp";
import SummarizeSharpIcon from "@mui/icons-material/SummarizeSharp";
import NotificationsNoneSharpIcon from "@mui/icons-material/NotificationsNoneSharp";
import PersonOutlineSharpIcon from "@mui/icons-material/PersonOutlineSharp";
import MapsHomeWorkIcon from "@mui/icons-material/MapsHomeWork";
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
  const notificationsRef = useRef(null);

  const handleMouseOver = (iconName) => setHoveredIcon(iconName);
  const handleMouseOut = () => setHoveredIcon(null);

  // Fetch unread notification count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (!user || userLoading) return; // Skip if no user or still loading

      try {
        const response = await fetchWithAuth("/api/notifications/unread-count");
        if (response.ok) {
          const data = await response.json();
          setUnreadCount(data.count || 0);
        }
      } catch (err) {
        console.error("Error fetching unread count:", err);
      }
    };

    // Only run when we have a user and auth is done loading
    if (user && !userLoading) {
      fetchUnreadCount();

      // Set up interval to check for new notifications every 30 seconds
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user, userLoading]);

  const toggleNotifications = () => {
    setShowNotifications((prev) => !prev);
  };

  const closeNotifications = () => {
    setShowNotifications(false);
  };

  const getIconClasses = (iconName) => {
    let classes =
      "text-primary text-6xl cursor-pointer transition-transform duration-300";
    if (hoveredIcon === iconName) {
      classes += " transform scale-125";
    }
    return classes;
  };

  const getContainerClasses = (iconName) => {
    let classes =
      "p-5 rounded-full transition-all duration-300 flex items-center justify-center";
    if (hoveredIcon === iconName) {
      classes += " bg-secondary/10";
    }
    return classes;
  };

  return (
    <div className="w-20 bg-transparent flex flex-col h-full py-6 px-16">
      <div className="flex flex-col items-center gap-6 my-auto">
        <div
          className={getContainerClasses("DashboardIcon")}
          onMouseOver={() => handleMouseOver("DashboardIcon")}
          onMouseOut={handleMouseOut}
          onClick={() => router.push("/analytics")}
        >
          <DashboardIcon className={getIconClasses("DashboardIcon")} />
        </div>

        <div
          className={getContainerClasses("AddCircleSharpIcon")}
          onMouseOver={() => handleMouseOver("AddCircleSharpIcon")}
          onMouseOut={handleMouseOut}
          onClick={() => router.push("/property-management")}
        >
          <AddCircleSharpIcon
            className={getIconClasses("AddCircleSharpIcon")}
          />
        </div>

        <div
          className={getContainerClasses("SummarizeSharpIcon")}
          onMouseOver={() => handleMouseOver("SummarizeSharpIcon")}
          onMouseOut={handleMouseOut}
          onClick={() => router.push("/reports")}
        >
          <SummarizeSharpIcon
            className={getIconClasses("SummarizeSharpIcon")}
          />
        </div>

        <div
          className={getContainerClasses("MapsHomeWorkIcon")}
          onMouseOver={() => handleMouseOver("MapsHomeWorkIcon")}
          onMouseOut={handleMouseOut}
          onClick={() => router.push("/property-view")}
        >
          <MapsHomeWorkIcon className={getIconClasses("MapsHomeWorkIcon")} />
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
        </div>

        <div
          className={getContainerClasses("PersonOutlineSharpIcon")}
          onMouseOver={() => handleMouseOver("PersonOutlineSharpIcon")}
          onMouseOut={handleMouseOut}
          onClick={() => router.push("/profile")}
        >
          <PersonOutlineSharpIcon
            className={getIconClasses("PersonOutlineSharpIcon")}
          />
        </div>
      </div>

      {/* Notifications Panel */}
      <NotificationsPanel
        open={showNotifications}
        anchorEl={notificationsRef.current}
        onClose={closeNotifications}
      />
    </div>
  );
};

export default SideBar;
