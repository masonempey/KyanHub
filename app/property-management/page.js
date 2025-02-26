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
import MaintenanceSection from "./MaintenanceSection";
import { useUser } from "../../contexts/UserContext";
import fetchWithAuth from "@/lib/fetchWithAuth"; // Corrected import path
import CircularProgress from "@mui/material/CircularProgress";

const AddPage = () => {
  const { user, loading: userLoading } = useUser();
  const {
    properties: allProperties,
    loading: propertiesLoading,
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
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

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
    const parsedValue = value.replace(/^0+/, "") || "0";
    newAmounts[index] = parsedValue;
    setAmounts(newAmounts);

    const newErrors = { ...errors };
    if (!parsedValue || isNaN(parsedValue) || Number(parsedValue) < 0) {
      newErrors[`amount_${index}`] = "Amount must be a non-negative number.";
    } else {
      delete newErrors[`amount_${index}`];
    }
    setErrors(newErrors);
  };

  const validateInputs = () => {
    const newErrors = {};
    amounts.forEach((amount, index) => {
      if (!amount || isNaN(amount) || Number(amount) < 0) {
        newErrors[`amount_${index}`] = "Amount must be a non-negative number.";
      }
    });
    if (!propertyId) newErrors.propertyId = "Please select a property.";
    if (!currentMonth || typeof currentMonth !== "string") {
      newErrors.currentMonth = "Please select a valid month.";
    }
    return newErrors;
  };

  const handleButtonSubmit = async () => {
    console.log("THE MONTH: ", currentMonth);
    const newErrors = validateInputs();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    try {
      const updates = products
        .map((product, i) => ({
          productId: product.id,
          quantity: Number(amounts[i] || 0),
        }))
        .filter((update) => update.quantity > 0);

      const response = await fetchWithAuth(
        `/api/inventory/${propertyId}/${currentMonth}`,
        {
          method: "PUT",
          body: JSON.stringify({ updates }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to update inventory: ${await response.text()}`);
      }

      setSuccessDialogOpen(true);
      setErrors({});
    } catch (error) {
      console.error("Update error:", error);
      setErrorMessage(error.message || "Failed to update inventory");
      setErrorDialogOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (product) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;
    setIsLoading(true);
    try {
      const response = await fetchWithAuth(
        `/api/inventory/products?productId=${productToDelete.id}`, // Adjusted to query param as per earlier route
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to delete product ${
            productToDelete.name
          }: ${await response.text()}`
        );
      }

      setProducts(products.filter((p) => p.id !== productToDelete.id));
      setAmounts(
        amounts.filter(
          (_, i) => i !== products.findIndex((p) => p.id === productToDelete.id)
        )
      );
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    } catch (error) {
      console.error("Error deleting product:", error);
      setErrorMessage(error.message || "Failed to delete product");
      setErrorDialogOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setProductToDelete(null);
  };

  const handleAddProductConfirm = async (productData) => {
    setIsLoading(true);
    try {
      const response = await fetchWithAuth("/api/inventory/products", {
        method: "POST",
        body: JSON.stringify(productData),
      });

      if (!response.ok) {
        throw new Error(`Failed to add product: ${await response.text()}`);
      }

      await fetchProducts();
    } catch (error) {
      console.error("Error adding product:", error);
      setErrorMessage(error.message || "Failed to add product");
      setErrorDialogOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const response = await fetchWithAuth("/api/inventory/products");
      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${await response.text()}`);
      }
      const data = await response.json();
      setProducts(data);
      setAmounts(data.map(() => "0"));
    } catch (error) {
      console.error("Error fetching products:", error);
      setErrorMessage("Failed to fetch products");
      setErrorDialogOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchProducts();
    }
  }, [user]);

  useEffect(() => {
    if (!propertyId || !currentMonth || !user) return;

    const fetchAmounts = async () => {
      setIsLoading(true);
      try {
        const response = await fetchWithAuth(
          `/api/inventory/${propertyId}/${currentMonth}`
        );
        if (!response.ok) {
          throw new Error(`Failed to fetch amounts: ${await response.text()}`);
        }
        const data = await response.json();
        setAmounts(data.map((item) => item.quantity.toString()));
      } catch (error) {
        console.error("Error fetching amounts:", error);
        setErrorMessage("Failed to fetch amounts");
        setErrorDialogOpen(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAmounts();
  }, [propertyId, currentMonth, user]);

  const setCurrentMonthYear = (month) => {
    const currentYear = new Date().getFullYear();
    return `${month}${currentYear}`;
  };

  if (userLoading || propertiesLoading || isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <CircularProgress sx={{ color: "#eccb34" }} />
      </div>
    );
  }

  if (!user) return <div>Please log in to access this page.</div>;

  // Rest of the JSX remains unchanged
  return (
    <div className={styles.addPageContainer}>
      <div className={styles.mainContainer}>
        <div className={styles.contentContainer}>
          <div className={styles.leftContainer}>
            <BackgroundContainer width="100%" height="100%" />
            <div className={styles.productListContainer}>
              <div className={styles.leftHeader}>Inventory Management</div>
              {errors.propertyId && (
                <div style={{ color: "#eccb34", marginBottom: "10px" }}>
                  {errors.propertyId}
                </div>
              )}
              {errors.currentMonth && (
                <div style={{ color: "#eccb34", marginBottom: "10px" }}>
                  {errors.currentMonth}
                </div>
              )}
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
                    <div>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={amounts[index] || ""}
                        onChange={(e) =>
                          handleAmountChange(index, e.target.value)
                        }
                        className={styles.amountInput}
                      />
                      {errors[`amount_${index}`] && (
                        <div
                          style={{
                            color: "#eccb34",
                            fontSize: "12px",
                            marginTop: "4px",
                          }}
                        >
                          {errors[`amount_${index}`]}
                        </div>
                      )}
                    </div>
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
                monthYear={setCurrentMonthYear(currentMonth)}
              />
              <Button
                variant="outlined"
                sx={{
                  color: "#eccb34",
                  borderColor: "#eccb34",
                  "&:hover": { borderColor: "#eccb34" },
                }}
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
      <Dialog
        open={successDialogOpen}
        onClose={() => setSuccessDialogOpen(false)}
        PaperProps={{
          sx: {
            backgroundColor: "#eccb34",
            color: "#fafafa",
            borderRadius: "8px",
          },
        }}
      >
        <DialogTitle sx={{ color: "#fafafa" }}>Success</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: "#fafafa" }}>
            Inventory updated successfully!
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setSuccessDialogOpen(false)}
            sx={{
              color: "#fafafa",
              "&:hover": { backgroundColor: "rgba(250, 250, 250, 0.1)" },
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={errorDialogOpen}
        onClose={() => setErrorDialogOpen(false)}
        PaperProps={{
          sx: {
            backgroundColor: "#eccb34",
            color: "#fafafa",
            borderRadius: "8px",
          },
        }}
      >
        <DialogTitle sx={{ color: "#fafafa" }}>Error</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: "#fafafa" }}>
            {errorMessage}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setErrorDialogOpen(false)}
            sx={{
              color: "#fafafa",
              "&:hover": { backgroundColor: "rgba(250, 250, 250, 0.1)" },
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default AddPage;
