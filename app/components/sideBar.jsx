"use client";

import React, { useState } from "react";
import DashboardIcon from "@mui/icons-material/Dashboard";
import AddCircleSharpIcon from "@mui/icons-material/AddCircleSharp";
import SummarizeSharpIcon from "@mui/icons-material/SummarizeSharp";
import NotificationsNoneSharpIcon from "@mui/icons-material/NotificationsNoneSharp";
import PersonOutlineSharpIcon from "@mui/icons-material/PersonOutlineSharp";
import { useRouter } from "next/navigation";

const SideBar = () => {
  const router = useRouter();
  const [hoveredIcon, setHoveredIcon] = useState(null);

  const handleMouseOver = (iconName) => setHoveredIcon(iconName);
  const handleMouseOut = () => setHoveredIcon(null);

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
      </div>
      <div className="flex flex-col items-center gap-6 mt-auto">
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
    </div>
  );
};

export default SideBar;
