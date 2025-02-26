"use client";

import React, { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import fetchWithAuth from "@/lib/fetchWithAuth";

const AddCategoryDialog = ({ open, onClose, onAddCategory }) => {
  const [categoryName, setCategoryName] = useState("");

  const handleSubmit = async () => {
    if (!categoryName.trim()) {
      alert("Please enter a category name");
      return;
    }

    try {
      const response = await fetchWithAuth(
        `/api/maintenance/add-category/${encodeURIComponent(categoryName)}`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error("Failed to add category");
      }

      onAddCategory(categoryName);
      setCategoryName("");
      onClose();
    } catch (error) {
      console.error("Error adding category:", error);
      alert("Failed to add category");
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
      <DialogTitle sx={{ color: "#fafafa" }}>Add New Category</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Category Name"
          type="text"
          fullWidth
          value={categoryName}
          onChange={(e) => setCategoryName(e.target.value)}
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

export default AddCategoryDialog;
