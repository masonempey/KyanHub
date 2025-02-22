"use client";

import React, { useState } from "react";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Box from "@mui/material/Box";

const AddProduct = ({ onAddProduct }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [productName, setProductName] = useState("");
  const [productPrice, setProductPrice] = useState("");

  const handleProductChange = (event) => {
    setProductName(event.target.value);
  };

  const handlePriceChange = (event) => {
    setProductPrice(event.target.value);
  };

  const handleAddClick = () => {
    setDialogOpen(true); // Open the dialog when "Add Product" is clicked
  };

  const handleConfirmAdd = () => {
    if (!productName || !productPrice || isNaN(productPrice)) {
      alert("Please enter a valid product name and price.");
      return;
    }

    const productData = {
      name: productName,
      price: parseFloat(productPrice),
    };

    if (onAddProduct) {
      onAddProduct(productData); // Pass the product data to AddPage for processing
    }

    // Reset form and close dialog
    setProductName("");
    setProductPrice("");
    setDialogOpen(false);
  };

  const handleCancel = () => {
    // Reset form and close dialog without adding
    setProductName("");
    setProductPrice("");
    setDialogOpen(false);
  };

  return (
    <Box>
      <Button
        variant="outlined"
        onClick={handleAddClick}
        sx={{
          mt: 2,
          color: "#eccb34",
          borderColor: "#eccb34",
          backgroundColor: "transparent",
          "&:hover": {
            borderColor: "#eccb34",
          },
          marginBottom: "1rem",
        }}
      >
        Add Product
      </Button>
      <Dialog
        open={dialogOpen}
        onClose={handleCancel}
        aria-labelledby="add-dialog-title"
        aria-describedby="add-dialog-description"
        PaperProps={{
          sx: {
            backgroundColor: "#eccb34", // Yellow background for dialog
            color: "#fafafa", // White text
            borderRadius: "8px",
          },
        }}
      >
        <DialogTitle id="add-dialog-title" sx={{ color: "#fafafa" }}>
          Add New Product
        </DialogTitle>
        <DialogContent>
          <TextField
            placeholder="Enter product name"
            variant="outlined"
            value={productName}
            onChange={handleProductChange}
            fullWidth
            sx={{
              "& .MuiOutlinedInput-root": {
                backgroundColor: "#eccb34", // Yellow background
                color: "#fafafa", // White text
                borderColor: "#fafafa", // White border
                borderRadius: "8px", // Match other components' border radius
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#fafafa", // White border on hover
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#fafafa", // White border when focused
                },
              },
              "& .MuiInputBase-input": {
                color: "#fafafa", // White input text
              },
              "& .MuiInputBase-input::placeholder": {
                color: "#fafafa", // White placeholder text
                opacity: 1, // Ensure full opacity
              },
              mb: 2, // Margin bottom for spacing between fields
            }}
          />
          <TextField
            placeholder="Enter product price"
            variant="outlined"
            value={productPrice}
            onChange={handlePriceChange}
            fullWidth
            sx={{
              "& .MuiOutlinedInput-root": {
                backgroundColor: "#eccb34", // Yellow background
                color: "#fafafa", // White text
                borderColor: "#fafafa", // White border
                borderRadius: "8px", // Match other components' border radius
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#fafafa", // White border on hover
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#fafafa", // White border when focused
                },
              },
              "& .MuiInputBase-input": {
                color: "#fafafa", // White input text
              },
              "& .MuiInputBase-input::placeholder": {
                color: "#fafafa", // White placeholder text
                opacity: 1, // Ensure full opacity
              },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCancel}
            sx={{
              color: "#fafafa",
              borderColor: "#fafafa",
              backgroundColor: "transparent",
              "&:hover": {
                backgroundColor: "rgba(250, 250, 250, 0.1)",
                borderColor: "#fafafa",
              },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmAdd}
            sx={{
              color: "#fafafa",
              borderColor: "#eccb34",
              backgroundColor: "transparent",
              "&:hover": {
                backgroundColor: "rgba(236, 203, 52, 0.1)",
                borderColor: "#eccb34",
              },
            }}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AddProduct;
