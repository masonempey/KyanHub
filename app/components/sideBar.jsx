"use client";

import React, { useState } from "react";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DashboardIcon from "@mui/icons-material/Dashboard";
import AddCircleSharpIcon from "@mui/icons-material/AddCircleSharp";
import SummarizeSharpIcon from "@mui/icons-material/SummarizeSharp";
import NotificationsNoneSharpIcon from "@mui/icons-material/NotificationsNoneSharp";
import PersonOutlineSharpIcon from "@mui/icons-material/PersonOutlineSharp";
import { useRouter } from "next/navigation";

const SideBar = () => {
  const router = useRouter();
  const [hoveredIcon, setHoveredIcon] = useState(null);
  const [isOpen, setIsOpen] = useState(true);

  const handleMouseOver = (iconName) => setHoveredIcon(iconName);
  const handleMouseOut = () => setHoveredIcon(null);

  const getIconClasses = (iconName) => {
    let classes = "text-primary cursor-pointer text-5xl";
    if (isOpen && hoveredIcon !== iconName) {
      classes = "text-secondary cursor-pointer text-5xl";
    }
    return classes;
  };

  const getContainerClasses = (iconName) => {
    let classes =
      "p-3 rounded-full transition-all duration-300 flex items-center justify-center";
    if (isOpen && hoveredIcon === iconName) {
      classes += " bg-secondary";
    }
    return classes;
  };

  return (
    <div
      className={`w-20 bg-transparent flex flex-col items-center py-4 ${
        !isOpen ? "w-16" : ""
      }`}
    >
      <div
        className={`${getContainerClasses("ArrowBackIcon")} mb-8`}
        onMouseOver={() => handleMouseOver("ArrowBackIcon")}
        onMouseOut={handleMouseOut}
      >
        <ArrowBackIcon
          className={`${getIconClasses("ArrowBackIcon")} ${
            !isOpen ? "transform rotate-180" : ""
          }`}
          onClick={() => setIsOpen(!isOpen)}
        />
      </div>

      {isOpen && (
        <>
          <div className="flex flex-col items-center gap-6 mb-auto">
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
          </div>

          <div className="flex flex-col items-center gap-6">
            <div
              className={getContainerClasses("NotificationsNoneSharpIcon")}
              onMouseOver={() => handleMouseOver("NotificationsNoneSharpIcon")}
              onMouseOut={handleMouseOut}
            >
              <NotificationsNoneSharpIcon
                className={getIconClasses("NotificationsNoneSharpIcon")}
              />
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
        </>
      )}
    </div>
  );
};

export default SideBar;
