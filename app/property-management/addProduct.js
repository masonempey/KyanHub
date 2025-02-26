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
  const [errors, setErrors] = useState({});

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
        variant="outlined"
        onClick={handleAddClick}
        sx={{
          mt: 2,
          color: "#eccb34",
          borderColor: "#eccb34",
          backgroundColor: "transparent",
          "&:hover": { borderColor: "#eccb34" },
          marginBottom: "1rem",
        }}
      >
        Add Product
      </Button>
      <Dialog
        open={dialogOpen}
        onClose={handleCancel}
        aria-labelledby="add-dialog-title"
        PaperProps={{
          sx: {
            backgroundColor: "#eccb34",
            color: "#fafafa",
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
            error={!!errors.productName}
            helperText={errors.productName}
            sx={{
              "& .MuiOutlinedInput-root": {
                backgroundColor: "#eccb34",
                color: "#fafafa",
                "& fieldset": { borderColor: "#fafafa" },
                "&:hover fieldset": { borderColor: "#fafafa" },
                "&.Mui-focused fieldset": { borderColor: "#fafafa" },
              },
              "& .MuiInputBase-input": { color: "#fafafa" },
              "& .MuiInputBase-input::placeholder": {
                color: "#fafafa",
                opacity: 1,
              },
              "& .MuiFormHelperText-root": { color: "#fafafa" },
              mb: 2,
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
                backgroundColor: "#eccb34",
                color: "#fafafa",
                "& fieldset": { borderColor: "#fafafa" },
                "&:hover fieldset": { borderColor: "#fafafa" },
                "&.Mui-focused fieldset": { borderColor: "#fafafa" },
              },
              "& .MuiInputBase-input": { color: "#fafafa" },
              "& .MuiInputBase-input::placeholder": {
                color: "#fafafa",
                opacity: 1,
              },
              "& .MuiFormHelperText-root": { color: "#fafafa" },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCancel}
            sx={{
              color: "#fafafa",
              "&:hover": { backgroundColor: "rgba(250, 250, 250, 0.1)" },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmAdd}
            sx={{
              color: "#fafafa",
              "&:hover": { backgroundColor: "rgba(236, 203, 52, 0.1)" },
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
