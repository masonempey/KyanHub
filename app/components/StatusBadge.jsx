import React from "react";
import { Chip } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DoneAllIcon from "@mui/icons-material/DoneAll";

const StatusBadge = ({ status, onClick }) => {
  const getStatusConfig = (status) => {
    switch (status) {
      case "draft":
        return {
          label: "Draft",
          color: "warning",
          icon: <EditIcon fontSize="small" />,
          tooltip: "In draft mode - editable",
        };
      case "ready":
        return {
          label: "Ready",
          color: "info",
          icon: <CheckCircleIcon fontSize="small" />,
          tooltip: "Ready for finalization",
        };
      case "complete":
        return {
          label: "Complete",
          color: "success",
          icon: <DoneAllIcon fontSize="small" />,
          tooltip: "Process completed",
        };
      default:
        return {
          label: status,
          color: "default",
          icon: null,
          tooltip: "",
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Chip
      label={config.label}
      color={config.color}
      icon={config.icon}
      size="small"
      onClick={onClick}
      title={config.tooltip}
      sx={{
        fontWeight: 500,
        cursor: onClick ? "pointer" : "default",
      }}
    />
  );
};

export default StatusBadge;
