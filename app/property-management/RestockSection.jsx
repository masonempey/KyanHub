"use client";

import { useState, useEffect } from "react";
import Button from "@mui/material/Button";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import OptionBar from "../components/OptionBar";
import AddCompanyDialog from "../components/AddCompanyDialog";
import dayjs from "dayjs";
import { useUser } from "@/contexts/UserContext";
import fetchWithAuth from "@/lib/fetchWithAuth";
import CircularProgress from "@mui/material/CircularProgress";
import { Description } from "@mui/icons-material";

const RestockSection = () => {
  const { user, loading } = useUser();
  const [selectedStore, setSelectedStore] = useState("");
  const [restockCost, setRestockCost] = useState("");
  const [restockDescription, setRestockDescription] = useState("");
  const [storeDialogOpen, setStoreDialogOpen] = useState(false);
  const [stores, setStores] = useState([]);
  const [isFileAttached, setIsFileAttached] = useState(false);
  const [fileAttached, setFileAttached] = useState(null);
  const [deleteStoreDialogOpen, setDeleteStoreDialogOpen] = useState(false);
  const [storeToDelete, setStoreToDelete] = useState(null);
  const [errors, setErrors] = useState({});
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [confirmSubmitDialogOpen, setConfirmSubmitDialogOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [restockItems, setRestockItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const currentDate = dayjs();

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const response = await fetchWithAuth("/api/restock/stores");
        if (!response.ok) {
          throw new Error(`Failed to fetch stores: ${await response.text()}`);
        }
        const data = await response.json();
        setStores(
          data.stores.map((store) => ({
            label: store.store_name,
            value: store.store_name,
            id: store.id,
          }))
        );
      } catch (error) {
        console.error("Error fetching stores:", error);
        setErrorMessage("Failed to load stores");
        setErrorDialogOpen(true);
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

        const uniqueProducts = Array.from(
          new Map(data.map((item) => [item.id, item])).values()
        );

        setProducts(uniqueProducts);
        setRestockItems(uniqueProducts.map(() => "0"));
      } catch (error) {
        console.error("Error fetching products:", error);
        setErrorMessage("Failed to fetch products");
        setErrorDialogOpen(true);
      } finally {
        setIsLoading(false);
      }
    };

    if (loading) {
      return;
    }

    if (!user) {
      return;
    }

    if (user) {
      fetchStores();
      fetchProducts();
    }
  }, [user, loading]);

  const handleRestockItemChange = (index, value) => {
    const newItems = [...restockItems];
    const parsedValue = value.replace(/^0+/, "") || "0";
    newItems[index] = parsedValue;
    setRestockItems(newItems);

    const newErrors = { ...errors };
    if (isNaN(parsedValue) || Number(parsedValue) < 0) {
      newErrors[`item_${index}`] = "Amount must be a non-negative number";
    } else {
      delete newErrors[`item_${index}`];
    }
    setErrors(newErrors);
  };

  const validateInputs = () => {
    const newErrors = {};
    if (!selectedStore) newErrors.selectedStore = "Store is required.";
    if (!restockCost) {
      newErrors.restockCost = "Cost is required.";
    } else if (isNaN(restockCost) || Number(restockCost) <= 0) {
      newErrors.restockCost = "Cost must be a positive number.";
    }

    const anySelectedItems = restockItems.some((item) => parseInt(item) > 0);
    if (!anySelectedItems) {
      newErrors.noItems = "Please add at least one item to restock.";
    }

    restockItems.forEach((amount, index) => {
      if (amount && (isNaN(amount) || Number(amount) < 0)) {
        newErrors[`item_${index}`] = "Must be a non-negative number";
      }
    });

    return newErrors;
  };

  const handleRestockSubmit = async () => {
    const newErrors = validateInputs();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const restockMonthYear = currentDate.format("MMMMYYYY");

      // Prepare items being restocked with quantities > 0
      const itemsToRestock = products
        .map((product, index) => ({
          productId: product.id,
          productName: product.name,
          quantity: Number(restockItems[index] || 0),
        }))
        .filter((item) => item.quantity > 0);

      if (isFileAttached && fileAttached) {
        const fileBase64 = await convertFileToBase64(fileAttached);
        const uploadRes = await fetchWithAuth("/api/upload/restock", {
          method: "POST",
          body: JSON.stringify({
            monthYear: restockMonthYear,
            description: restockDescription,
            cost: restockCost,
            store: selectedStore,
            file: fileBase64,
            fileName: fileAttached.name,
          }),
        });

        if (!uploadRes.ok) {
          throw new Error(`Failed to upload file: ${await uploadRes.text()}`);
        }
      }

      const restockRes = await fetchWithAuth("/api/restock", {
        method: "POST",
        body: JSON.stringify({
          items: itemsToRestock,
        }),
      });

      if (!restockRes.ok) {
        throw new Error(
          `Failed to submit restock request: ${await restockRes.text()}`
        );
      }

      setSuccessDialogOpen(true);
      setSelectedStore("");
      setRestockCost("");
      setRestockDescription("");
      setIsFileAttached(false);
      setFileAttached(null);
      setRestockItems(products.map(() => "0")); // Reset all item quantities
      setErrors({});
    } catch (error) {
      console.error("Error submitting restock request:", error);
      setErrorMessage(error.message || "An error occurred. Please try again.");
      setErrorDialogOpen(true);
    }
  };

  const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleRestockCostChange = (event) => {
    const value = event.target.value;
    setRestockCost(value);
    const newErrors = { ...errors };
    if (!value) {
      newErrors.restockCost = "Cost is required.";
    } else if (isNaN(value) || Number(value) <= 0) {
      newErrors.restockCost = "Cost must be a positive number.";
    } else {
      delete newErrors.restockCost;
    }
    setErrors(newErrors);
  };

  const handleRestockDescriptionChange = (event) => {
    setRestockDescription(event.target.value);
  };

  const handleAddStore = (newStoreName) => {
    const newStore = { label: newStoreName, value: newStoreName };
    setStores((prev) => [...prev, newStore]);
  };

  const handleDeleteStoreClick = (storeName) => {
    setStoreToDelete(storeName);
    setDeleteStoreDialogOpen(true);
  };

  const handleDeleteStoreConfirm = async () => {
    if (!storeToDelete) return;
    try {
      const response = await fetchWithAuth(
        `/api/restock/delete-store/${encodeURIComponent(storeToDelete)}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to delete store ${storeToDelete}: ${await response.text()}`
        );
      }

      setStores(stores.filter((c) => c.value !== storeToDelete));
      if (selectedStore === storeToDelete) setSelectedStore("");
      setDeleteStoreDialogOpen(false);
      setStoreToDelete(null);
    } catch (error) {
      console.error("Error deleting store:", error);
      setErrorMessage("Failed to delete store");
      setErrorDialogOpen(true);
    }
  };

  const handleDeleteStoreCancel = () => {
    setDeleteStoreDialogOpen(false);
    setStoreToDelete(null);
  };

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <CircularProgress sx={{ color: "#eccb34" }} />
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col h-full">
      <h2 className="text-2xl font-bold text-dark mb-4">Restock Management</h2>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Left column */}
        <div>
          {/* Store with Add button */}
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <OptionBar
                  label="Store"
                  placeholder="Store Name"
                  options={stores}
                  onSelect={(value) => {
                    setSelectedStore(value);
                    const newErrors = { ...errors };
                    if (!value) newErrors.selectedStore = "Store is required.";
                    else delete newErrors.selectedStore;
                    setErrors(newErrors);
                  }}
                  onDelete={handleDeleteStoreClick}
                />
              </div>
              <Button
                variant="contained"
                startIcon={<AddCircleOutlineIcon />}
                className="bg-primary hover:bg-secondary hover:text-primary text-dark font-medium px-2 py-1 rounded-lg shadow-md transition-colors duration-300"
                sx={{
                  textTransform: "none",
                  fontSize: "0.8rem",
                  minWidth: "auto",
                  marginTop: "1rem",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  "&:hover": {
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  },
                }}
                onClick={() => setStoreDialogOpen(true)}
              >
                Add
              </Button>
            </div>
            {errors.selectedStore && (
              <p className="text-primary text-sm mt-1">
                {errors.selectedStore}
              </p>
            )}
          </div>

          {/* Restock Cost */}
          <div className="mb-4">
            <TextField
              type="text"
              inputMode="numeric"
              value={restockCost}
              onChange={handleRestockCostChange}
              fullWidth
              placeholder="Restock Cost"
              error={!!errors.restockCost}
              helperText={errors.restockCost}
              className="bg-white rounded-lg"
              size="small"
              sx={{
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: "#eccb34" },
                  "&:hover fieldset": { borderColor: "#eccb34" },
                  "&.Mui-focused fieldset": { borderColor: "#eccb34" },
                },
                "& .MuiInputBase-input": { color: "#333333" },
                "& .MuiFormHelperText-root": { color: "#eccb34", marginTop: 0 },
              }}
            />
          </div>
        </div>

        {/* Right column */}
        <div>
          {/* Upload Files Button */}
          <div className="flex justify-center mt-10">
            <Button
              component="label"
              variant="contained"
              startIcon={<CloudUploadIcon />}
              className="bg-primary hover:bg-secondary hover:text-primary text-dark font-medium rounded-lg shadow-md transition-colors duration-300"
              sx={{
                textTransform: "none",
                fontSize: "1rem",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                "&:hover": {
                  boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                },
                padding: "8px 16px",
              }}
            >
              {isFileAttached
                ? `File Attached: ${fileAttached?.name}`
                : "Upload Receipt"}
              <input
                type="file"
                hidden
                onChange={(event) => {
                  setFileAttached(event.target.files[0]);
                  setIsFileAttached(true);
                }}
              />
            </Button>
          </div>
        </div>
      </div>

      {/* Restock Description */}
      <div className="mb-4">
        <TextField
          type="text"
          value={restockDescription}
          onChange={handleRestockDescriptionChange}
          multiline
          rows={3}
          fullWidth
          placeholder="Restock Description (items purchased)"
          className="bg-white rounded-lg"
          sx={{
            "& .MuiOutlinedInput-root": {
              "& fieldset": { borderColor: "#eccb34" },
              "&:hover fieldset": { borderColor: "#eccb34" },
              "&.Mui-focused fieldset": { borderColor: "#eccb34" },
            },
            "& .MuiInputBase-input": { color: "#333333" },
          }}
        />
      </div>

      {/* Products to restock */}
      <div className="flex-1 flex flex-col mb-4">
        <div className="grid grid-cols-[1fr_auto] py-3 px-4 bg-primary/10 rounded-t-lg text-dark font-semibold">
          <span>Product</span>
          <span className="text-right">Amount</span>
        </div>

        {errors.noItems && (
          <p className="text-primary text-sm mt-1">{errors.noItems}</p>
        )}

        <div className="flex-1 overflow-y-auto bg-secondary/80 rounded-b-lg border border-primary/10 max-h-40">
          {products.map((product, index) => (
            <div
              key={product.id}
              className="grid grid-cols-[1fr_auto] py-2 px-4 border-b border-primary/10 items-center hover:bg-primary/5 transition-colors"
            >
              <div className="flex flex-col">
                <span className="text-dark">{product.name}</span>
              </div>
              <div className="flex flex-col items-end">
                <input
                  type="text"
                  inputMode="numeric"
                  value={restockItems[index] || "0"}
                  onChange={(e) =>
                    handleRestockItemChange(index, e.target.value)
                  }
                  className="bg-white text-dark border border-primary/30 rounded-lg px-3 py-1 w-16 text-right focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm"
                />
                {errors[`item_${index}`] && (
                  <p className="text-primary text-xs mt-1">
                    {errors[`item_${index}`]}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Submit Restock Button */}
      <div className="flex justify-center mt-auto pb-4">
        <Button
          variant="contained"
          className="bg-primary hover:bg-secondary hover:text-primary text-dark font-medium px-8 py-2 rounded-lg shadow-md transition-colors duration-300"
          sx={{
            textTransform: "none",
            fontSize: "1rem",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            "&:hover": {
              boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
            },
            minWidth: "180px",
          }}
          onClick={() => {
            const newErrors = validateInputs();
            if (Object.keys(newErrors).length > 0) {
              setErrors(newErrors);
              return;
            }
            setConfirmSubmitDialogOpen(true);
          }}
        >
          Submit Restock
        </Button>
      </div>

      {/* Dialogs */}
      <AddCompanyDialog
        open={storeDialogOpen}
        onClose={() => setStoreDialogOpen(false)}
        onAddCompany={handleAddStore}
        endpoint="/api/restock/add-store"
        title="Add New Store"
        label="Store Name"
        placeholder="Enter store name"
      />

      <Dialog
        open={deleteStoreDialogOpen}
        onClose={handleDeleteStoreCancel}
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
            Are you sure you want to delete the store "{storeToDelete}"? This
            action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleDeleteStoreCancel}
            className="text-dark hover:bg-primary/5 transition-colors"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteStoreConfirm}
            className="bg-primary text-dark hover:bg-primary/80 transition-colors"
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
            Restock request submitted successfully!
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

      <Dialog
        open={confirmSubmitDialogOpen}
        onClose={() => setConfirmSubmitDialogOpen(false)}
        PaperProps={{
          sx: {
            backgroundColor: "#fafafa",
            color: "#333333",
            borderRadius: "12px",
            border: "1px solid rgba(236, 203, 52, 0.2)",
          },
        }}
      >
        <DialogTitle sx={{ color: "#333333" }}>Confirm Submission</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: "#333333" }}>
            Please confirm you want to submit the following restock information:
          </DialogContentText>
          <div className="mt-4 space-y-2 text-dark">
            <p>
              <strong>Store:</strong> {selectedStore}
            </p>
            <p>
              <strong>Cost:</strong> ${Number(restockCost).toFixed(2)}
            </p>
            <p>
              <strong>Date:</strong> {currentDate.format("MMMM D, YYYY")}{" "}
              (Today)
            </p>
            <p>
              <strong>Description:</strong>{" "}
              {restockDescription || "None provided"}
            </p>
            <p>
              <strong>Receipt:</strong>{" "}
              {fileAttached ? fileAttached.name : "None attached"}
            </p>

            <div>
              <p>
                <strong>Restocked Items:</strong>
              </p>
              <ul className="ml-4 list-disc">
                {products.map((product, index) =>
                  restockItems[index] && Number(restockItems[index]) > 0 ? (
                    <li key={product.id}>
                      {product.name}: {restockItems[index]} units
                    </li>
                  ) : null
                )}
              </ul>
            </div>
          </div>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConfirmSubmitDialogOpen(false)}
            className="text-dark hover:bg-primary/5 transition-colors"
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              setConfirmSubmitDialogOpen(false);
              handleRestockSubmit();
            }}
            className="bg-primary text-dark hover:bg-primary/80 transition-colors"
          >
            Confirm Submission
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default RestockSection;
