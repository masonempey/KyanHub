"use client";

import React, { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import fetchWithAuth from "../utils/fetchWithAuth";

const AddCompanyDialog = ({ open, onClose, onAddCompany }) => {
  const [companyName, setCompanyName] = useState("");

  const handleSubmit = async () => {
    if (!companyName.trim()) {
      alert("Please enter a company name");
      return;
    }

    try {
      const response = await fetchWithAuth(
        `${
          process.env.NEXT_PUBLIC_BACKEND_URL
        }/api/maintenance/add-company/${encodeURIComponent(companyName)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to add company: ${errorText}`);
      }

      onAddCompany(companyName);
      setCompanyName("");
      onClose();
    } catch (error) {
      console.error("Error adding company:", error);
      alert(`Failed to add company: ${error.message}`);
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
          sx={{
            "& .MuiInputBase-input": { color: "#fafafa" },
            "& .MuiInputLabel-root": { color: "#fafafa" },
            "& .MuiOutlinedInput-root": {
              "& fieldset": { borderColor: "#fafafa" },
              "&:hover fieldset": { borderColor: "#eccb34" },
            },
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
