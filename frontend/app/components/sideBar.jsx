"use client";

import React, { useState } from "react";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DashboardIcon from "@mui/icons-material/Dashboard";
import AddCircleSharpIcon from "@mui/icons-material/AddCircleSharp";
import SummarizeSharpIcon from "@mui/icons-material/SummarizeSharp";
import NotificationsNoneSharpIcon from "@mui/icons-material/NotificationsNoneSharp";
import PersonOutlineSharpIcon from "@mui/icons-material/PersonOutlineSharp";
import styles from "../styles/sidebar.module.css";
import { useRouter } from "next/navigation";

const SideBar = () => {
  const router = useRouter();
  const [hoveredIcon, setHoveredIcon] = useState(null);
  const [isOpen, setIsOpen] = useState(true);

  const handleMouseOver = (iconName) => setHoveredIcon(iconName);
  const handleMouseOut = () => setHoveredIcon(null);

  const getIconColor = (iconName) => {
    if (!isOpen) {
      return "#eccb34"; // Secondary color when sidebar is closed
    }
    if (hoveredIcon === iconName) {
      return "#eccb34"; // Secondary color
    } else {
      return "#FAFAFA"; // Primary color
    }
  };

  const getBackgroundColor = (iconName) => {
    if (!isOpen) {
      return "transparent"; // No background color when sidebar is closed
    }
    if (hoveredIcon === iconName) {
      return "#FAFAFA"; // Primary color
    } else {
      return "transparent";
    }
  };

  const handleArrowBackClick = () => {
    setIsOpen(!isOpen);
  };

  const handleDashboardClick = () => {
    router.push("/analytics");
  };

  const handleAddClick = () => {
    router.push("/property-management");
  };

  const handleReportClick = () => {
    router.push("/reports");
  };

  const handleNotificationClick = () => {
    console.log("Notification clicked");
  };

  const handleProfileClick = () => {
    router.push("/profile");
  };

  return (
    <div className={`${styles.sidebar} ${!isOpen ? styles.sidebarClosed : ""}`}>
      <div
        className={`${styles.iconContainer} ${styles.arrowIconContainer} ${
          !isOpen ? styles.arrowIconFlipped : ""
        }`}
        style={{ backgroundColor: getBackgroundColor("ArrowBackIcon") }}
        onMouseOver={() => handleMouseOver("ArrowBackIcon")}
        onMouseOut={handleMouseOut}
      >
        <ArrowBackIcon
          sx={{
            color: getIconColor("ArrowBackIcon"),
            fontSize: "3.5rem !important",
            cursor: "pointer",
          }}
          onClick={handleArrowBackClick}
          titleAccess={isOpen ? "Close Sidebar" : "Open Sidebar"}
        />
      </div>
      {isOpen && (
        <>
          <div className={styles.pageIcons}>
            <div
              className={styles.iconContainer}
              style={{ backgroundColor: getBackgroundColor("DashboardIcon") }}
              onMouseOver={() => handleMouseOver("DashboardIcon")}
              onMouseOut={handleMouseOut}
            >
              <DashboardIcon
                sx={{
                  color: getIconColor("DashboardIcon"),
                  fontSize: "3.5rem",
                  cursor: "pointer",
                }}
                onClick={handleDashboardClick}
                titleAccess="Dashboard"
              />
            </div>
            <div
              className={styles.iconContainer}
              style={{
                backgroundColor: getBackgroundColor("AddCircleSharpIcon"),
              }}
              onMouseOver={() => handleMouseOver("AddCircleSharpIcon")}
              onMouseOut={handleMouseOut}
            >
              <AddCircleSharpIcon
                sx={{
                  color: getIconColor("AddCircleSharpIcon"),
                  fontSize: "3.5rem",
                  cursor: "pointer",
                }}
                onClick={handleAddClick}
                titleAccess="Add"
              />
            </div>
            <div
              className={styles.iconContainer}
              style={{
                backgroundColor: getBackgroundColor("SummarizeSharpIcon"),
              }}
              onMouseOver={() => handleMouseOver("SummarizeSharpIcon")}
              onMouseOut={handleMouseOut}
            >
              <SummarizeSharpIcon
                sx={{
                  color: getIconColor("SummarizeSharpIcon"),
                  fontSize: "3.5rem",
                  cursor: "pointer",
                }}
                onClick={handleReportClick}
                titleAccess="Report"
              />
            </div>
          </div>
          <div className={styles.notificationAndProfileIcons}>
            <div
              className={styles.iconContainer}
              style={{
                backgroundColor: getBackgroundColor(
                  "NotificationsNoneSharpIcon"
                ),
              }}
              onMouseOver={() => handleMouseOver("NotificationsNoneSharpIcon")}
              onMouseOut={handleMouseOut}
            >
              <NotificationsNoneSharpIcon
                sx={{
                  color: getIconColor("NotificationsNoneSharpIcon"),
                  fontSize: "3.5rem",
                  cursor: "pointer",
                }}
                onClick={handleNotificationClick}
                titleAccess="Notifications"
              />
            </div>
            <div
              className={styles.iconContainer}
              style={{
                backgroundColor: getBackgroundColor("PersonOutlineSharpIcon"),
              }}
              onMouseOver={() => handleMouseOver("PersonOutlineSharpIcon")}
              onMouseOut={handleMouseOut}
            >
              <PersonOutlineSharpIcon
                sx={{
                  color: getIconColor("PersonOutlineSharpIcon"),
                  fontSize: "3.5rem",
                  cursor: "pointer",
                }}
                onClick={handleProfileClick}
                titleAccess="Profile"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SideBar;
