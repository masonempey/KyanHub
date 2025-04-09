"use client";

import { useState, useEffect } from "react";
import Button from "@mui/material/Button";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import EditIcon from "@mui/icons-material/Edit";
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
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import IconButton from "@mui/material/IconButton";

const RestockSection = () => {
  const { user, loading } = useUser();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedStore, setSelectedStore] = useState("");
  const [restockCost, setRestockCost] = useState("");
  const [restockDescription, setRestockDescription] = useState("");
  const [storeDialogOpen, setStoreDialogOpen] = useState(false);
  const [stores, setStores] = useState([]);
  const [isFileAttached, setIsFileAttached] = useState(false);
  const [fileAttached, setFileAttached] = useState(null);
  const [customFileName, setCustomFileName] = useState("");
  const [showFileRename, setShowFileRename] = useState(false);
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
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredProducts, setFilteredProducts] = useState([]);

  const currentDate = dayjs();

  // Filter products based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredProducts(products);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = products.filter((product) =>
        product.name.toLowerCase().includes(query)
      );
      setFilteredProducts(filtered);
    }
  }, [searchQuery, products]);

  // Load stores and products
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
        setFilteredProducts(uniqueProducts);
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

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setFileAttached(file);
      setIsFileAttached(true);
      setCustomFileName(file.name);
    }
  };

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

    if (isFileAttached && !customFileName.trim()) {
      newErrors.fileName = "File name cannot be empty";
    }

    return newErrors;
  };

  const handleRestockSubmit = async () => {
    setIsUploading(true);
    const newErrors = validateInputs();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsUploading(false);
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
            fileName: customFileName || fileAttached.name, // Use custom filename if provided
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
      setCustomFileName("");
      setShowFileRename(false);
      setRestockItems(products.map(() => "0")); // Reset all item quantities
      setErrors({});
      setIsUploading(false);
    } catch (error) {
      setIsUploading(false);
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

  if (isLoading || isUploading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <CircularProgress sx={{ color: "#eccb34" }} />
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col h-full bg-white/80 rounded-lg">
      <h2 className="text-xl sm:text-2xl font-bold text-dark mb-4">
        Restock Management
      </h2>

      {/* Main form area */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {/* Left column */}
        <div>
          {/* Store with Add button */}
          <div className="mb-4">
            <div className="flex flex-col space-y-2">
              <div className="flex flex-row items-center space-x-2">
                <label className="font-medium text-dark">Store</label>
                <Button
                  variant="contained"
                  startIcon={<AddCircleOutlineIcon />}
                  className="bg-primary hover:bg-secondary hover:text-primary text-dark font-medium px-2 py-1 rounded-lg shadow-md transition-colors duration-300"
                  sx={{
                    textTransform: "none",
                    fontSize: "0.8rem",
                    minWidth: "auto",
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
              <OptionBar
                label=""
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
            {errors.selectedStore && (
              <p className="text-primary text-sm mt-1">
                {errors.selectedStore}
              </p>
            )}
          </div>

          {/* Restock Cost */}
          <div className="mb-4">
            <label className="font-medium text-dark block mb-2">Cost</label>
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
          {/* Upload Files Button with Rename Option */}
          <div className="mb-4">
            <label className="font-medium text-dark block mb-2">Receipt</label>
            <div className="flex flex-col space-y-2">
              <Button
                component="label"
                variant="contained"
                startIcon={<CloudUploadIcon />}
                className="bg-primary hover:bg-secondary hover:text-primary text-dark font-medium rounded-lg shadow-md transition-colors duration-300"
                sx={{
                  textTransform: "none",
                  fontSize: { xs: "0.875rem", sm: "0.9rem" },
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  "&:hover": {
                    boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                  },
                  padding: "8px 16px",
                }}
              >
                {isFileAttached ? "Change Receipt" : "Upload Receipt"}
                <input type="file" hidden onChange={handleFileChange} />
              </Button>

              {isFileAttached && (
                <div className="flex items-center">
                  <div className="bg-white text-dark border border-primary/30 rounded-lg px-3 py-2 flex items-center justify-between w-full">
                    <div className="truncate">
                      {showFileRename ? (
                        <TextField
                          autoFocus
                          value={customFileName}
                          onChange={(e) => setCustomFileName(e.target.value)}
                          size="small"
                          fullWidth
                          onBlur={() => setShowFileRename(false)}
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              setShowFileRename(false);
                            }
                          }}
                          sx={{
                            "& .MuiOutlinedInput-root": {
                              "& fieldset": { borderColor: "#eccb34" },
                            },
                          }}
                        />
                      ) : (
                        <span className="truncate">{customFileName}</span>
                      )}
                    </div>
                    <IconButton
                      size="small"
                      onClick={() => setShowFileRename(!showFileRename)}
                      className="ml-1 text-dark hover:text-primary"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </div>
                </div>
              )}
              {errors.fileName && (
                <p className="text-primary text-sm">{errors.fileName}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Restock Description */}
      <div className="mb-4">
        <label className="font-medium text-dark block mb-2">Description</label>
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

      {/* Search Products */}
      <div className="mb-3 px-1">
        <div className="relative">
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-2 pr-10 bg-white text-dark border border-primary/30 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400">
            <SearchIcon fontSize="small" />
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-10 flex items-center pr-2 text-gray-400 hover:text-gray-600"
            >
              <ClearIcon fontSize="small" />
            </button>
          )}
        </div>
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
          {filteredProducts.map((product) => {
            const originalIndex = products.findIndex(
              (p) => p.id === product.id
            );
            return (
              <div
                key={product.id}
                className="grid grid-cols-[1fr_auto] py-2 px-2 sm:px-4 border-b border-primary/10 items-center hover:bg-primary/5 transition-colors"
              >
                <div className="flex flex-col min-w-0 pr-2">
                  <span className="text-dark truncate">{product.name}</span>
                </div>
                <div className="flex flex-col items-end">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={restockItems[originalIndex] || "0"}
                    onChange={(e) =>
                      handleRestockItemChange(originalIndex, e.target.value)
                    }
                    className="bg-white text-dark border border-primary/30 rounded-lg px-3 py-1 w-16 text-right focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm"
                  />
                  {errors[`item_${originalIndex}`] && (
                    <p className="text-primary text-xs mt-1">
                      {errors[`item_${originalIndex}`]}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
          {filteredProducts.length === 0 && searchQuery && (
            <div className="p-4 text-center text-gray-500">
              No products match your search
            </div>
          )}
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
            minWidth: { xs: "80%", sm: "180px" },
            maxWidth: "300px",
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

      {/* Keep all other dialogs unchanged */}
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
              {isFileAttached ? customFileName : "None attached"}
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
