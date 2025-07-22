import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  Typography,
  Alert,
} from "@mui/material";
import fetchWithAuth from "@/lib/fetchWithAuth";

const StatusChangeDialog = ({
  open,
  onClose,
  property,
  year,
  monthNumber,
  currentStatus,
  onStatusChanged,
}) => {
  const [newStatus, setNewStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Determine allowed next statuses
  const getAvailableStatuses = () => {
    switch (currentStatus) {
      case "draft":
        return [{ value: "ready", label: "Ready" }];
      case "ready":
        return [
          { value: "complete", label: "Complete" },
          { value: "draft", label: "Revert to Draft" },
        ];
      case "complete":
        return [{ value: "ready", label: "Revert to Ready" }];
      default:
        return [];
    }
  };

  const availableStatuses = getAvailableStatuses();

  const handleStatusChange = (event) => {
    setNewStatus(event.target.value);
  };

  const handleClose = () => {
    setNewStatus("");
    setError("");
    onClose();
  };

  const handleSubmit = async () => {
    if (!newStatus) return;

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetchWithAuth("/api/property-month-end/status", {
        method: "PUT",
        body: JSON.stringify({
          propertyId: property.id,
          year,
          monthNumber,
          status: newStatus,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update status");
      }

      const data = await response.json();

      if (onStatusChanged) {
        onStatusChanged(newStatus, data.data);
      }

      handleClose();
    } catch (error) {
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Update Status for {property?.name || "Property"}
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Typography variant="body2" color="textSecondary" gutterBottom>
          Current status: <strong>{currentStatus}</strong>
        </Typography>

        <Typography variant="body1" sx={{ mt: 2, mb: 1 }}>
          Select new status:
        </Typography>

        <FormControl component="fieldset">
          <RadioGroup value={newStatus} onChange={handleStatusChange}>
            {availableStatuses.map((status) => (
              <FormControlLabel
                key={status.value}
                value={status.value}
                control={<Radio />}
                label={status.label}
              />
            ))}
          </RadioGroup>
        </FormControl>

        {newStatus === "complete" && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Marking as Complete will finalize the data in Google Sheets and lock
            it for editing.
          </Alert>
        )}

        {newStatus === "draft" && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Reverting to Draft will allow editing of this property's data.
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!newStatus || isSubmitting}
          sx={{
            bgcolor: "#eccb34",
            color: "#333",
            "&:hover": { bgcolor: "#d4b02a" },
          }}
        >
          {isSubmitting ? "Updating..." : "Update Status"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StatusChangeDialog;
