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
  const [ownerPrice, setOwnerPrice] = useState("");
  const [realPrice, setRealPrice] = useState("");
  const [errors, setErrors] = useState({});

  // Handle product name changes
  const handleProductChange = (event) => {
    const value = event.target.value;
    setProductName(value);
    const newErrors = { ...errors };
    if (!value) newErrors.productName = "Product name is required.";
    else delete newErrors.productName;
    setErrors(newErrors);
  };

  // Handle owner price changes
  const handleOwnerPriceChange = (event) => {
    const value = event.target.value;
    setOwnerPrice(value);
    const newErrors = { ...errors };
    if (value && (isNaN(value) || Number(value) < 0)) {
      newErrors.ownerPrice = "Price must be a non-negative number.";
    } else {
      delete newErrors.ownerPrice;
    }
    setErrors(newErrors);
  };

  // Handle real price changes
  const handleRealPriceChange = (event) => {
    const value = event.target.value;
    setRealPrice(value);
    const newErrors = { ...errors };
    if (value && (isNaN(value) || Number(value) < 0)) {
      newErrors.realPrice = "Price must be a non-negative number.";
    } else {
      delete newErrors.realPrice;
    }
    setErrors(newErrors);
  };

  const validateInputs = () => {
    const newErrors = {};
    if (!productName) newErrors.productName = "Product name is required.";

    if (ownerPrice && (isNaN(ownerPrice) || Number(ownerPrice) < 0)) {
      newErrors.ownerPrice = "Price must be a non-negative number.";
    }

    if (realPrice && (isNaN(realPrice) || Number(realPrice) < 0)) {
      newErrors.realPrice = "Price must be a non-negative number.";
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
      owner_price: ownerPrice ? Number(ownerPrice) : null,
      real_price: realPrice ? Number(realPrice) : null,
    };

    if (onAddProduct) {
      onAddProduct(productData);
    }

    setProductName("");
    setOwnerPrice("");
    setRealPrice("");
    setErrors({});
    setDialogOpen(false);
  };

  const handleCancel = () => {
    setProductName("");
    setOwnerPrice("");
    setRealPrice("");
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
            placeholder="Enter owner price (what you charge)"
            variant="outlined"
            value={ownerPrice}
            onChange={handleOwnerPriceChange}
            fullWidth
            error={!!errors.ownerPrice}
            helperText={errors.ownerPrice}
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
            }}
          />

          <TextField
            placeholder="Enter real price (what you pay)"
            variant="outlined"
            value={realPrice}
            onChange={handleRealPriceChange}
            fullWidth
            error={!!errors.realPrice}
            helperText={errors.realPrice}
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
