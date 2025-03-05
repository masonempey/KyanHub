"use client";

import styles from "./addPage.module.css";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import AdminProtected from "@/app/components/AdminProtected";

const AddPage = () => {
  const router = useRouter();
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

  useEffect(() => {
    const excludedProperties = [
      "London - 4",
      "Windsor 95/96 Combo",
      "Windsor 97/98 Combo",
    ];

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

  const handleUpdateInventory = async () => {
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
        .filter((update) => update.quantity >= 0);

      console.log("UPDATES: ", updates);

      const updatePromises = updates.map((update) =>
        fetchWithAuth(`/api/inventory/update`, {
          method: "PUT",
          body: JSON.stringify({
            propertyId,
            productId: update.productId,
            month: currentMonth,
            quantity: update.quantity,
          }),
        })
      );

      const results = await Promise.all(updatePromises);
      const failedUpdates = results.filter((res) => !res.ok);

      if (failedUpdates.length > 0) {
        throw new Error(`Failed to update some inventory items`);
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
    if (!user || !propertyId || !currentMonth) return;

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
      <div className="flex h-screen w-full items-center justify-center">
        <CircularProgress sx={{ color: "#eccb34" }} />
      </div>
    );
  }

  // Rest of the JSX remains unchanged
  if (userLoading || propertiesLoading || isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <CircularProgress sx={{ color: "#eccb34" }} />
      </div>
    );
  }

  return (
    <AdminProtected>
      <div className="flex flex-col h-full w-full p-6 bg-transparent">
        <div className="flex flex-col lg:flex-row w-full h-full gap-6">
          {/* Left Column - Inventory Management */}
          <div className="flex-1 bg-secondary/95 rounded-2xl shadow-lg backdrop-blur-sm overflow-hidden border border-primary/10">
            <div className="p-6 flex flex-col h-full">
              {/* Header */}
              <h2 className="text-2xl font-bold text-dark mb-6">
                Inventory Management
              </h2>

              {/* Error Messages */}
              {errors.propertyId && (
                <p className="text-primary mb-2 text-sm">{errors.propertyId}</p>
              )}
              {errors.currentMonth && (
                <p className="text-primary mb-4 text-sm">
                  {errors.currentMonth}
                </p>
              )}

              {/* Product List Header */}
              <div className="grid grid-cols-2 py-3 px-4 bg-primary/10 rounded-t-lg text-dark font-semibold">
                <span>Product</span>
                <span className="text-right">Amount</span>
              </div>

              {/* Product List */}
              <div className="flex-1 overflow-y-auto bg-secondary/80 rounded-b-lg mb-6 border border-primary/10">
                {products.map((product, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-2 py-3 px-4 border-b border-primary/10 items-center hover:bg-primary/5 transition-colors"
                  >
                    <div className="flex items-center">
                      <span className="text-dark">{product.name}</span>
                      <IconButton
                        aria-label={`delete ${product.name}`}
                        onClick={() => handleDeleteClick(product)}
                        className="ml-2 text-dark hover:text-primary transition-colors"
                        size="small"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </div>
                    <div className="flex flex-col items-end">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={amounts[index] || ""}
                        onChange={(e) =>
                          handleAmountChange(index, e.target.value)
                        }
                        className="bg-white text-dark border border-primary/30 rounded-lg px-3 py-2 w-24 text-right focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm"
                      />
                      {errors[`amount_${index}`] && (
                        <p className="text-primary text-xs mt-1">
                          {errors[`amount_${index}`]}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4 justify-between items-center">
                <PdfSection
                  products={products}
                  amounts={amounts}
                  rates={rates}
                  selectedPropertyName={selectedPropertyName}
                  monthYear={setCurrentMonthYear(currentMonth)}
                />

                <div className="flex gap-4">
                  <Button
                    variant="contained"
                    onClick={handleUpdateInventory}
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
                    Update Inventory
                  </Button>
                  <AddProduct onAddProduct={handleAddProductConfirm} />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Maintenance Section */}
          <div className="flex-1 bg-secondary/95 rounded-2xl shadow-lg backdrop-blur-sm border border-primary/10">
            <MaintenanceSection
              propertyId={propertyId}
              selectedPropertyName={selectedPropertyName}
            />
          </div>
        </div>

        {/* Dialogs - updated styling for lighter feel */}
        <Dialog
          open={deleteDialogOpen}
          onClose={handleDeleteCancel}
          PaperProps={{
            sx: {
              backgroundColor: "#fafafa",
              color: "#333333",
              borderRadius: "12px",
              border: "1px solid rgba(236, 203, 52, 0.2)",
            },
          }}
        >
          <DialogTitle sx={{ color: "#333333" }}>Confirm Deletion</DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ color: "#333333" }}>
              Are you sure you want to delete the product &quot;
              {productToDelete?.name}&quot;? This action cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={handleDeleteCancel}
              className="text-dark hover:bg-primary/5 transition-colors"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              className="bg-primary text-dark hover:bg-primary/80 transition-colors"
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* Success Dialog */}
        <Dialog
          open={successDialogOpen}
          onClose={() => setSuccessDialogOpen(false)}
          PaperProps={{
            sx: {
              backgroundColor: "#fafafa",
              color: "#333333",
              borderRadius: "12px",
              border: "1px solid rgba(236, 203, 52, 0.2)",
            },
          }}
        >
          <DialogTitle sx={{ color: "#333333" }}>
            <span className="flex items-center">
              <span className="text-primary mr-2">✓</span> Success
            </span>
          </DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ color: "#333333" }}>
              Inventory updated successfully!
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setSuccessDialogOpen(false)}
              className="bg-primary text-dark hover:bg-primary/80 transition-colors"
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {/* Error Dialog */}
        <Dialog
          open={errorDialogOpen}
          onClose={() => setErrorDialogOpen(false)}
          PaperProps={{
            sx: {
              backgroundColor: "#fafafa",
              color: "#333333",
              borderRadius: "12px",
              border: "1px solid rgba(236, 203, 52, 0.2)",
            },
          }}
        >
          <DialogTitle sx={{ color: "#333333" }}>Error</DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ color: "#333333" }}>
              {errorMessage}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setErrorDialogOpen(false)}
              className="bg-primary text-dark hover:bg-primary/80 transition-colors"
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    </AdminProtected>
  );
};

export default AddPage;
