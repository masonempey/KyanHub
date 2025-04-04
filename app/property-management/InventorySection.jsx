"use client";

import { useState, useEffect } from "react";
import Button from "@mui/material/Button";
import { useProperties } from "@/contexts/PropertyContext";
import PdfSection from "../property-management/pdfSection";
import AddProduct from "../property-management/addProduct";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import DragHandleIcon from "@mui/icons-material/DragHandle";
import { useUser } from "@/contexts/UserContext";
import fetchWithAuth from "@/lib/fetchWithAuth";
import CircularProgress from "@mui/material/CircularProgress";
import TextField from "@mui/material/TextField";
import AdminProtected from "@/app/components/AdminProtected";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const SortableItem = ({ id, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {children(listeners)}
    </div>
  );
};

const InventorySection = () => {
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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState(null);
  const [editedProductName, setEditedProductName] = useState("");
  const [editedProductPrice, setEditedProductPrice] = useState("");
  const [editedRealPrice, setEditedRealPrice] = useState("");
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
        `/api/inventory/products?productId=${productToDelete.id}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to delete product ${
            productToDelete.name
          }: ${await response.text()}`
        );
      }

      const productIndex = products.findIndex(
        (p) => p.id === productToDelete.id
      );
      const newProducts = products.filter((p) => p.id !== productToDelete.id);
      const newAmounts = amounts.filter((_, i) => i !== productIndex);
      setProducts(newProducts);
      setAmounts(newAmounts);
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

  const handleEditClick = (product) => {
    setProductToEdit(product);
    setEditedProductName(product.name);
    setEditedProductPrice(product.owner_price || "");
    setEditedRealPrice(product.real_price || "");
    setEditDialogOpen(true);
  };

  const handleEditConfirm = async () => {
    if (!productToEdit || !editedProductName.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetchWithAuth(`/api/inventory/products`, {
        method: "PUT",
        body: JSON.stringify({
          productId: productToEdit.id,
          name: editedProductName.trim(),
          owner_price: editedProductPrice
            ? parseFloat(editedProductPrice)
            : null,
          real_price: editedRealPrice ? parseFloat(editedRealPrice) : null,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update product: ${await response.text()}`);
      }

      setProducts(
        products.map((p) =>
          p.id === productToEdit.id
            ? {
                ...p,
                name: editedProductName.trim(),
                owner_price: editedProductPrice
                  ? parseFloat(editedProductPrice)
                  : null,
                real_price: editedRealPrice
                  ? parseFloat(editedRealPrice)
                  : null,
              }
            : p
        )
      );

      setEditDialogOpen(false);
      setProductToEdit(null);
      setEditedProductName("");
      setEditedProductPrice("");
      setEditedRealPrice("");
    } catch (error) {
      console.error("Error updating product:", error);
      setErrorMessage(error.message || "Failed to update product");
      setErrorDialogOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditCancel = () => {
    setEditDialogOpen(false);
    setProductToEdit(null);
    setEditedProductName("");
    setEditedProductPrice("");
    setEditedRealPrice("");
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
      console.log("Raw fetched products:", data);

      const uniqueProducts = Array.from(
        new Map(data.map((item) => [item.id, item])).values()
      );
      console.log("Unique products after deduplication:", uniqueProducts);

      setProducts(uniqueProducts);
      setAmounts(uniqueProducts.map(() => "0"));
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
        const inventoryData = await response.json();

        const inventoryMap = inventoryData.reduce((map, item) => {
          map[item.product_id] = item.quantity;
          return map;
        }, {});

        const newAmounts = products.map((product) =>
          (inventoryMap[product.id] || 0).toString()
        );

        setAmounts(newAmounts);
      } catch (error) {
        console.error("Error fetching amounts:", error);
        setErrorMessage("Failed to fetch amounts");
        setErrorDialogOpen(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAmounts();
  }, [propertyId, currentMonth, user, products]);

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = products.findIndex((p) => p.id === active.id);
    const newIndex = products.findIndex((p) => p.id === over.id);

    const reorderedProducts = arrayMove(products, oldIndex, newIndex);
    const reorderedAmounts = arrayMove(amounts, oldIndex, newIndex);

    setProducts(reorderedProducts);
    setAmounts(reorderedAmounts);

    try {
      const orderData = reorderedProducts.map((product, index) => ({
        productId: product.id,
        order: index,
      }));

      const response = await fetchWithAuth("/api/inventory/products", {
        method: "PUT",
        body: JSON.stringify({ products: orderData }),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to save product order: ${await response.text()}`
        );
      }

      await fetchProducts();
    } catch (error) {
      console.error("Error saving product order:", error);
      setErrorMessage(error.message || "Failed to save product order");
      setErrorDialogOpen(true);
      await fetchProducts(); // Revert to server state on error
    }
  };

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

  return (
    <div className="p-4 flex flex-col h-full">
      {errors.propertyId && (
        <p className="text-primary mb-2 text-sm">{errors.propertyId}</p>
      )}
      {errors.currentMonth && (
        <p className="text-primary mb-4 text-sm">{errors.currentMonth}</p>
      )}

      <div className="grid grid-cols-[auto_1fr_auto] py-3 px-4 bg-primary/10 rounded-t-lg text-dark font-semibold">
        <span className="w-8"></span>
        <span>Product</span>
        <span className="text-right">Amount</span>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={products.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex-1 overflow-y-auto bg-secondary/80 rounded-b-lg mb-6 border border-primary/10">
            {products.map((product, index) => (
              <SortableItem key={product.id} id={product.id}>
                {(dragListeners) => (
                  <div className="grid grid-cols-[auto_1fr_auto] py-3 px-2 sm:px-4 border-b border-primary/10 items-center hover:bg-primary/5 transition-colors">
                    <IconButton
                      aria-label={`drag ${product.name}`}
                      className="text-dark/70 hover:text-primary cursor-grab"
                      size="small"
                      {...dragListeners}
                    >
                      <DragHandleIcon fontSize="small" />
                    </IconButton>
                    <div className="flex items-center">
                      <div className="flex flex-col">
                        <span className="text-dark">{product.name}</span>
                        <div className="flex gap-2 text-dark/70 text-xs">
                          {product.owner_price && (
                            <span>
                              Owner: $
                              {parseFloat(product.owner_price).toFixed(2)}
                            </span>
                          )}
                          {product.real_price && (
                            <span>
                              Cost: ${parseFloat(product.real_price).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex ml-2">
                        <IconButton
                          aria-label={`edit ${product.name}`}
                          onClick={() => handleEditClick(product)}
                          className="text-dark hover:text-primary transition-colors"
                          size="small"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          aria-label={`delete ${product.name}`}
                          onClick={() => handleDeleteClick(product)}
                          className="text-dark hover:text-primary transition-colors"
                          size="small"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </div>
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
                )}
              </SortableItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="flex flex-wrap gap-4 justify-between items-center">
        <PdfSection
          products={products}
          amounts={amounts}
          rates={rates}
          selectedPropertyName={selectedPropertyName}
          propertyId={propertyId}
          monthYear={setCurrentMonthYear(currentMonth)}
        />

        <div className="flex flex-col xs:flex-row gap-2 xs:gap-4 w-full xs:w-auto mt-3 xs:mt-0">
          <Button
            variant="contained"
            onClick={handleUpdateInventory}
            className="bg-primary hover:bg-secondary hover:text-primary text-dark font-medium px-6 py-2 rounded-lg shadow-md transition-colors duration-300"
            sx={{
              textTransform: "none",
              fontSize: { xs: "0.875rem", sm: "1rem" },
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

      {/* Dialogs */}
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
        open={editDialogOpen}
        onClose={handleEditCancel}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            backgroundColor: "#fafafa",
            color: "#333333",
            borderRadius: { xs: "8px", sm: "12px" },
            width: "95%",
            padding: { xs: "8px", sm: "16px" },
            margin: { xs: "8px", sm: "16px" },
            border: "1px solid rgba(236, 203, 52, 0.2)",
            overflowY: "auto",
          },
        }}
      >
        <DialogTitle sx={{ color: "#333333" }}>Edit Product</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: "#333333", mb: 2 }}>
            Update the product information below.
          </DialogContentText>
          <div className="flex flex-col gap-4">
            <TextField
              autoFocus
              margin="dense"
              label="Product Name"
              type="text"
              fullWidth
              value={editedProductName}
              onChange={(e) => setEditedProductName(e.target.value)}
              sx={{
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: "#eccb34" },
                  "&:hover fieldset": { borderColor: "#eccb34" },
                  "&.Mui-focused fieldset": { borderColor: "#eccb34" },
                },
                "& .MuiInputBase-input": { color: "#333333" },
                "& .MuiInputLabel-root": { color: "#333333" },
              }}
            />
            <TextField
              margin="dense"
              label="Owner Price (what you charge)"
              type="number"
              inputProps={{
                step: "0.01",
                min: "0",
              }}
              fullWidth
              value={editedProductPrice}
              onChange={(e) => setEditedProductPrice(e.target.value)}
              sx={{
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: "#eccb34" },
                  "&:hover fieldset": { borderColor: "#eccb34" },
                  "&.Mui-focused fieldset": { borderColor: "#eccb34" },
                },
                "& .MuiInputBase-input": { color: "#333333" },
                "& .MuiInputLabel-root": { color: "#333333" },
              }}
            />
            <TextField
              margin="dense"
              label="Real Price (what you pay)"
              type="number"
              inputProps={{
                step: "0.01",
                min: "0",
              }}
              fullWidth
              value={editedRealPrice}
              onChange={(e) => setEditedRealPrice(e.target.value)}
              sx={{
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: "#eccb34" },
                  "&:hover fieldset": { borderColor: "#eccb34" },
                  "&.Mui-focused fieldset": { borderColor: "#eccb34" },
                },
                "& .MuiInputBase-input": { color: "#333333" },
                "& .MuiInputLabel-root": { color: "#333333" },
              }}
            />
          </div>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleEditCancel}
            className="text-dark hover:bg-primary/5 transition-colors"
          >
            Cancel
          </Button>
          <Button
            onClick={handleEditConfirm}
            disabled={!editedProductName.trim()}
            className="bg-primary text-dark hover:bg-primary/80 transition-colors"
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default InventorySection;
