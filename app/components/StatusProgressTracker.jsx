import React from "react";
import { Box, LinearProgress, Typography, Tooltip } from "@mui/material";

const StatusProgressTracker = ({ counts }) => {
  const { draft = 0, ready = 0, complete = 0 } = counts;
  const total = draft + ready + complete;

  if (total === 0) return null;

  const draftPercent = (draft / total) * 100;
  const readyPercent = (ready / total) * 100;
  const completePercent = (complete / total) * 100;

  return (
    <Box sx={{ width: "100%", mb: 3 }}>
      <Typography variant="subtitle2" gutterBottom>
        Month-End Progress
      </Typography>

      <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
        <Box sx={{ width: "100%", mr: 1 }}>
          <Box
            sx={{
              display: "flex",
              height: 10,
              borderRadius: 5,
              overflow: "hidden",
            }}
          >
            <Tooltip title={`Draft: ${draft} properties`}>
              <Box
                sx={{
                  width: `${draftPercent}%`,
                  bgcolor: "warning.light",
                  height: "100%",
                }}
              />
            </Tooltip>
            <Tooltip title={`Ready: ${ready} properties`}>
              <Box
                sx={{
                  width: `${readyPercent}%`,
                  bgcolor: "info.light",
                  height: "100%",
                }}
              />
            </Tooltip>
            <Tooltip title={`Complete: ${complete} properties`}>
              <Box
                sx={{
                  width: `${completePercent}%`,
                  bgcolor: "success.light",
                  height: "100%",
                }}
              />
            </Tooltip>
          </Box>
        </Box>
        <Box sx={{ minWidth: 35 }}>
          <Typography variant="body2" color="text.secondary">
            {complete}/{total}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
        <Typography variant="caption" color="text.secondary">
          Draft: {draft}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Ready: {ready}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Complete: {complete}
        </Typography>
      </Box>
    </Box>
  );
};

export default StatusProgressTracker;
