"use client";

import React, { useState } from "react";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Box from "@mui/material/Box";
import AddIcon from "@mui/icons-material/Add";

const AddProduct = ({ onAddProduct }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [productName, setProductName] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [errors, setErrors] = useState({});

  // Handlers remain unchanged
  const handleProductChange = (event) => {
    const value = event.target.value;
    setProductName(value);
    const newErrors = { ...errors };
    if (!value) newErrors.productName = "Product name is required.";
    else delete newErrors.productName;
    setErrors(newErrors);
  };

  const handlePriceChange = (event) => {
    const value = event.target.value;
    setProductPrice(value);
    const newErrors = { ...errors };
    if (!value) {
      newErrors.productPrice = "Price is required.";
    } else if (isNaN(value) || Number(value) <= 0) {
      newErrors.productPrice = "Price must be a positive number.";
    } else {
      delete newErrors.productPrice;
    }
    setErrors(newErrors);
  };

  const validateInputs = () => {
    const newErrors = {};
    if (!productName) newErrors.productName = "Product name is required.";
    if (!productPrice) {
      newErrors.productPrice = "Price is required.";
    } else if (isNaN(productPrice) || Number(productPrice) <= 0) {
      newErrors.productPrice = "Price must be a positive number.";
    }
    return newErrors;
  };

  const handleAddClick = () => {
    setDialogOpen(true);
  };

  const handleConfirmAdd = () => {
    const newErrors = validateInputs();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const productData = {
      name: productName,
      price: Number(productPrice),
    };

    if (onAddProduct) {
      onAddProduct(productData);
    }

    setProductName("");
    setProductPrice("");
    setErrors({});
    setDialogOpen(false);
  };

  const handleCancel = () => {
    setProductName("");
    setProductPrice("");
    setErrors({});
    setDialogOpen(false);
  };

  return (
    <Box>
      <Button
        variant="contained"
        onClick={handleAddClick}
        startIcon={<AddIcon />}
        className="bg-primary hover:bg-secondary hover:text-primary text-dark font-medium px-6 py-2 rounded-lg shadow-md transition-colors duration-300"
        sx={{
          textTransform: "none",
          fontSize: "1rem",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          "&:hover": {
            boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
          },
        }}
      >
        Add Product
      </Button>

      <Dialog
        open={dialogOpen}
        onClose={handleCancel}
        PaperProps={{
          sx: {
            backgroundColor: "#fafafa",
            color: "#333333",
            borderRadius: "12px",
            border: "1px solid rgba(236, 203, 52, 0.2)",
          },
        }}
      >
        <DialogTitle>
          <span className="text-dark flex items-center">
            <span className="text-primary mr-2">+</span> Add New Product
          </span>
        </DialogTitle>

        <DialogContent>
          <TextField
            placeholder="Enter product name"
            variant="outlined"
            value={productName}
            onChange={handleProductChange}
            fullWidth
            error={!!errors.productName}
            helperText={errors.productName}
            sx={{
              "& .MuiOutlinedInput-root": {
                backgroundColor: "#ffffff",
                "& fieldset": { borderColor: "#eccb34" },
                "&:hover fieldset": { borderColor: "#eccb34" },
                "&.Mui-focused fieldset": { borderColor: "#eccb34" },
              },
              "& .MuiInputBase-input": { color: "#333333" },
              "& .MuiFormHelperText-root": { color: "#eccb34" },
              mb: 2,
              mt: 1,
            }}
          />

          <TextField
            placeholder="Enter product price"
            variant="outlined"
            value={productPrice}
            onChange={handlePriceChange}
            fullWidth
            error={!!errors.productPrice}
            helperText={errors.productPrice}
            sx={{
              "& .MuiOutlinedInput-root": {
                backgroundColor: "#ffffff",
                "& fieldset": { borderColor: "#eccb34" },
                "&:hover fieldset": { borderColor: "#eccb34" },
                "&.Mui-focused fieldset": { borderColor: "#eccb34" },
              },
              "& .MuiInputBase-input": { color: "#333333" },
              "& .MuiFormHelperText-root": { color: "#eccb34" },
            }}
          />
        </DialogContent>

        <DialogActions>
          <Button
            onClick={handleCancel}
            className="text-dark hover:bg-primary/5"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmAdd}
            className="bg-primary hover:bg-secondary hover:text-primary text-dark font-medium px-4 py-1 rounded-lg shadow-md transition-colors duration-300"
            sx={{
              textTransform: "none",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              "&:hover": {
                boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
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
