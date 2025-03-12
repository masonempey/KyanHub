"use client";

import React, { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import fetchWithAuth from "@/lib/fetchWithAuth"; // Updated import path

const AddCompanyDialog = ({ open, onClose, onAddCompany, endpoint }) => {
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState(""); // Add error state

  const handleSubmit = async () => {
    if (!companyName.trim()) {
      setError("Please enter a company name");
      return;
    }

    try {
      const response = await fetchWithAuth(
        `${endpoint}/${encodeURIComponent(companyName)}`,
        {
          method: "POST",
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add company");
      }
      onAddCompany(companyName);
      setCompanyName("");
      setError("");
      onClose();
    } catch (error) {
      console.error("Error:", error);
      setError(error.message);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          backgroundColor: "#eccb34",
          color: "#fafafa",
          borderRadius: "8px",
        },
      }}
    >
      <DialogTitle sx={{ color: "#fafafa" }}>Add New Company</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Company Name"
          type="text"
          fullWidth
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          error={!!error}
          helperText={error}
          sx={{
            "& .MuiInputBase-input": { color: "#fafafa" },
            "& .MuiInputLabel-root": { color: "#fafafa" },
            "& .MuiOutlinedInput-root": {
              "& fieldset": { borderColor: "#fafafa" },
              "&:hover fieldset": { borderColor: "#eccb34" },
            },
            "& .MuiFormHelperText-root": { color: "#fafafa" },
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ color: "#fafafa" }}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} sx={{ color: "#fafafa" }}>
          Add
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddCompanyDialog;
