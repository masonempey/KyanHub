import React, { useState } from "react";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
const AddProduct = () => {
  const [showProduct, setShowProduct] = useState(false);
  const [showPrice, setShowPrice] = useState(false);
  const [productName, setProductName] = useState("");
  const [productPrice, setProductPrice] = useState("");

  const handleButtonClick = () => {
    setShowProduct(true);
  };

  const handleProductChange = (event) => {
    setProductName(event.target.value);
    setShowPrice(true);
  };

  const handlePriceChange = (event) => {
    setProductPrice(event.target.value);
  };

  const handleAddClick = async () => {
    if (!productName || !productPrice || isNaN(productPrice)) {
      alert("Please enter a valid product name and price.");
      return;
    }

    const productData = {
      name: productName,
      price: parseFloat(productPrice),
    };

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/inventory/products`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(productData),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to add product");
      }

      const result = await response.json();
      console.log("Product added:", result);
      alert("Product added successfully");

      setProductName("");
      setProductPrice("");
      setShowPrice(false);
      setShowProduct(false);
    } catch (error) {
      console.error("Error adding product:", error);
      alert("Failed to add product");
    }
  };

  return (
    <Box>
      <Button
        variant="outlined"
        onClick={handleButtonClick}
        sx={{ mt: 2, color: "#eccb34", borderColor: "#eccb34" }}
      >
        Add Product
      </Button>
      {showProduct && (
        <Box mt={2}>
          <TextField
            label="Enter product name"
            variant="outlined"
            value={productName}
            onChange={handleProductChange}
            fullWidth
          />
          {showPrice && (
            <TextField
              label="Enter product price"
              variant="outlined"
              value={productPrice}
              onChange={handlePriceChange}
              fullWidth
              sx={{ mt: 2 }}
            />
          )}
          <Button
            variant="outlined"
            onClick={handleAddClick}
            sx={{ mt: 2, color: "#eccb34", borderColor: "#eccb34" }}
          >
            Add
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default AddProduct;
