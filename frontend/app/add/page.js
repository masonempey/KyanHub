"use client";

import styles from "./addPage.module.css";
import { useState, useEffect } from "react";
import BackgroundContainer from "../components/backgroundContainer";
import Button from "@mui/material/Button";
import { useProperties } from "../../contexts/PropertyContext";
import PdfSection from "./pdfSection";
import AddProduct from "./addProduct";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";
import dayjs from "dayjs";
import MaintenanceSection from "./MaintenanceSection";

const AddPage = () => {
  const {
    properties: allProperties,
    loading,
    propertyId,
    selectedPropertyName,
    currentMonth,
    setCurrentMonth,
  } = useProperties();

  const [filteredProperties, setFilteredProperties] = useState({});
  const [products, setProducts] = useState([]);
  const [rates] = useState([]);
  const [amounts, setAmounts] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  const excludedProperties = [
    "London - 4",
    "Windsor 95/96 Combo",
    "Windsor 97/98 Combo",
  ];

  useEffect(() => {
    const filtered = Object.entries(allProperties)
      .filter(([_, name]) => !excludedProperties.includes(name))
      .reduce((acc, [uid, name]) => {
        acc[uid] = name;
        return acc;
      }, {});
    setFilteredProperties(filtered);
  }, [allProperties]);

  const handleAmountChange = (index, value) => {
    const newAmounts = [...amounts];
    const parsedValue = parseInt(value.replace(/^0+/, "")) || 0;
    newAmounts[index] = parsedValue;
    setAmounts(newAmounts);
  };

  const handleButtonSubmit = async () => {
    try {
      const baseUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL}`;
      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        const quantity = amounts[i];
        if (quantity > 0) {
          const response = await fetch(
            `${baseUrl}/api/inventory/${propertyId}/${product.id}/${currentMonth}`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ quantity }),
            }
          );
          if (!response.ok) {
            throw new Error(
              `Failed to update inventory for product ${product.name}`
            );
          }
        }
      }
      console.log("Inventory updated successfully");
    } catch (error) {
      console.error("Update error:", error);
    }
  };

  const handleDeleteClick = (product) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/inventory/products/${productToDelete.id}`,
        { method: "DELETE", headers: { "Content-Type": "application/json" } }
      );
      if (!response.ok)
        throw new Error(`Failed to delete product ${productToDelete.name}`);
      setProducts(products.filter((p) => p.id !== productToDelete.id));
      setAmounts(
        amounts.filter(
          (_, i) => i !== products.findIndex((p) => p.id === productToDelete.id)
        )
      );
      alert(`Product "${productToDelete.name}" deleted successfully`);
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    } catch (error) {
      console.error("Error deleting product:", error);
      alert("Failed to delete product");
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setProductToDelete(null);
  };

  const handleAddProductConfirm = async (productData) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/inventory/products`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(productData),
        }
      );
      if (!response.ok) throw new Error("Failed to add product");
      const updatedProducts = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/inventory/products`
      );
      if (!updatedProducts.ok)
        throw new Error("Failed to fetch updated products");
      const data = await updatedProducts.json();
      setProducts(data);
      alert(`Product "${productData.name}" added successfully`);
    } catch (error) {
      console.error("Error adding product:", error);
      alert("Failed to add product");
    }
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/inventory/products`
        );
        if (!response.ok) throw new Error("Failed to fetch products");
        const data = await response.json();
        setProducts(data);
      } catch (error) {
        console.error("Error fetching products:", error);
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    const fetchAmounts = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/inventory/${propertyId}/${currentMonth}`
        );
        if (!response.ok) throw new Error("Failed to fetch amounts");
        const data = await response.json();
        setAmounts(data.map((item) => item.quantity));
      } catch (error) {
        console.error("Error fetching amounts:", error);
      }
    };
    if (propertyId) fetchAmounts();
  }, [propertyId, currentMonth]);

  return (
    <div className={styles.addPageContainer}>
      <div className={styles.mainContainer}>
        <div className={styles.contentContainer}>
          <div className={styles.leftContainer}>
            <BackgroundContainer width="100%" height="100%" />
            <div className={styles.productListContainer}>
              <div className={styles.leftHeader}>Inventory Management</div>
              <div className={styles.header}>
                <span>Product</span>
                <span>Amount</span>
              </div>
              <div className={styles.listContainer}>
                {products.map((product, index) => (
                  <div key={index} className={styles.productRow}>
                    <span className={styles.productName}>
                      {product.name}
                      <IconButton
                        aria-label={`delete ${product.name}`}
                        onClick={() => handleDeleteClick(product)}
                        sx={{
                          color: "#fafafa",
                          "&:hover": { color: "#eccb34" },
                          ml: 1,
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </span>
                    <input
                      type="text"
                      pattern="\d*"
                      inputMode="numeric"
                      value={amounts[index] || ""}
                      onChange={(e) =>
                        handleAmountChange(index, e.target.value)
                      }
                      className={styles.amountInput}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.buttonContainer}>
              <PdfSection
                products={products}
                amounts={amounts}
                rates={rates}
                selectedPropertyName={selectedPropertyName}
                monthYear={dayjs(currentMonth).format("MMMMYYYY")}
              />
              <Button
                variant="outlined"
                sx={{ color: "#eccb34", borderColor: "#eccb34" }}
                onClick={handleButtonSubmit}
              >
                Update Inventory
              </Button>
              <AddProduct onAddProduct={handleAddProductConfirm} />
            </div>
          </div>
          <MaintenanceSection
            propertyId={propertyId}
            selectedPropertyName={selectedPropertyName}
            selectedDate={currentMonth}
          />
        </div>
      </div>
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        PaperProps={{
          sx: {
            backgroundColor: "#eccb34",
            color: "#fafafa",
            borderRadius: "8px",
          },
        }}
      >
        <DialogTitle sx={{ color: "#fafafa" }}>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: "#fafafa" }}>
            Are you sure you want to delete the product "{productToDelete?.name}
            "? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleDeleteCancel}
            sx={{
              color: "#fafafa",
              "&:hover": { backgroundColor: "rgba(250, 250, 250, 0.1)" },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            sx={{
              color: "#fafafa",
              "&:hover": { backgroundColor: "rgba(236, 203, 52, 0.1)" },
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default AddPage;
