import React from "react";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import PendingIcon from "@mui/icons-material/Pending";

const PropertyStatusIndicator = ({ status }) => {
  if (status === "complete") {
    return (
      <div className="flex items-center text-green-600">
        <CheckCircleIcon fontSize="small" sx={{ mr: 0.5 }} />
        <span>Complete</span>
      </div>
    );
  } else if (status === "ready") {
    return (
      <div className="flex items-center text-blue-600">
        <HourglassEmptyIcon fontSize="small" sx={{ mr: 0.5 }} />
        <span>Ready for Email</span>
      </div>
    );
  } else {
    return (
      <div className="flex items-center text-orange-600">
        <PendingIcon fontSize="small" sx={{ mr: 0.5 }} />
        <span>Draft</span>
      </div>
    );
  }
};

export default PropertyStatusIndicator;
