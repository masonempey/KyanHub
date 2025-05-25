import React, { useState, useEffect } from "react";
import { Button, CircularProgress, Chip } from "@mui/material";
import fetchWithAuth from "@/lib/fetchWithAuth";

const MonthEndStatus = ({
  propertyId,
  propertyName,
  year,
  month,
  monthNumber,
  onGenerateInventory,
  onStatusChecked,
}) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth(
        `/api/property-month-end?propertyId=${propertyId}&year=${year}&monthNumber=${monthNumber}`
      );

      if (!response.ok) {
        throw new Error(
          `Failed to get month-end status: ${response.statusText}`
        );
      }

      const result = await response.json();
      setStatus(result.data);
      if (onStatusChecked) {
        onStatusChecked(result.data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (propertyId && year && monthNumber) {
      fetchStatus();
    }
  }, [propertyId, year, monthNumber]);

  if (loading) {
    return <CircularProgress size={20} sx={{ color: "#eccb34" }} />;
  }

  if (error) {
    return <p className="text-red-500 text-sm">{error}</p>;
  }

  return (
    <div className="bg-white/70 rounded-lg p-3 mb-3 border border-primary/20">
      <h4 className="font-medium mb-2">
        Month-End Status: {month} {year}
      </h4>

      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <span className="text-sm">Inventory Invoice:</span>
          {status?.inventory_invoice_generated ? (
            <Chip
              label="Generated"
              size="small"
              color="success"
              variant="outlined"
              sx={{ fontWeight: 500 }}
            />
          ) : (
            <div className="flex items-center gap-2">
              <Chip
                label="Not Generated"
                size="small"
                color="warning"
                variant="outlined"
                sx={{ fontWeight: 500 }}
              />
              <Button
                size="small"
                variant="outlined"
                onClick={onGenerateInventory}
                sx={{
                  fontSize: "0.7rem",
                  py: 0.5,
                  borderColor: "#eccb34",
                  color: "#333",
                  "&:hover": {
                    borderColor: "#eccb34",
                    backgroundColor: "rgba(236, 203, 52, 0.1)",
                  },
                }}
              >
                Generate
              </Button>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm">Revenue Sheet:</span>
          {status?.revenue_updated ? (
            <Chip
              label="Updated"
              size="small"
              color="success"
              variant="outlined"
              sx={{ fontWeight: 500 }}
            />
          ) : (
            <Chip
              label={
                status?.inventory_invoice_generated
                  ? "Ready to Update"
                  : "Waiting for Inventory"
              }
              size="small"
              color={status?.inventory_invoice_generated ? "info" : "warning"}
              variant="outlined"
              sx={{ fontWeight: 500 }}
            />
          )}
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm">Owner Email:</span>
          {status?.owner_email_sent ? (
            <Chip
              label="Sent"
              size="small"
              color="success"
              variant="outlined"
              sx={{ fontWeight: 500 }}
            />
          ) : (
            <Chip
              label={
                status?.revenue_updated
                  ? "Ready to Send"
                  : "Waiting for Revenue Update"
              }
              size="small"
              color={status?.revenue_updated ? "info" : "warning"}
              variant="outlined"
              sx={{ fontWeight: 500 }}
            />
          )}
        </div>
      </div>

      {status && (
        <div className="mt-3 text-xs text-gray-500">
          {status.inventory_invoice_generated && (
            <p>
              Inventory invoice generated on{" "}
              {new Date(status.inventory_invoice_date).toLocaleDateString()}
            </p>
          )}
          {status.revenue_updated && (
            <p>
              Revenue updated on{" "}
              {new Date(status.revenue_update_date).toLocaleDateString()}
            </p>
          )}
          {status.owner_email_sent && (
            <p>
              Owner email sent on{" "}
              {new Date(status.owner_email_date).toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      {status?.inventory_invoice_generated &&
        status?.inventory_invoice_id?.startsWith("AUTO-") && (
          <div className="text-xs text-gray-500 mt-1">
            <span className="bg-blue-100 text-blue-700 px-1 py-0.5 rounded text-xs">
              Auto-generated
            </span>
          </div>
        )}
    </div>
  );
};

export default MonthEndStatus;
