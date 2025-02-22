"use client";

import styles from "./addPage.module.css";
import { useState, useEffect } from "react";
import BackgroundContainer from "../components/backgroundContainer";
import Button from "@mui/material/Button";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
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
import OptionBar from "../components/optionBar";
import DatePicker from "../components/datePicker";

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
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [maintenanceCost, setMaintenanceCost] = useState("");
  const [maintenanceDescription, setMaintenanceDescription] = useState("");
  const [isFileAttached, setIsFileAttached] = useState(false);
  const [fileAttached, setFileAttached] = useState(null);
  const [selectedDate, setSelectedDate] = useState(
    dayjs().format("YYYY-MM-DD")
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  const excludedProperties = [
    "London - 4",
    "Windsor 95/96 Combo",
    "Windsor 97/98 Combo",
  ];

  useEffect(() => {
    // Filter out excluded properties
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

  const handleButtonSubmit = () => async () => {
    try {
      console.log("Updating inventory:", amounts);
      console.log("Product ID:", products);

      const baseUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL}`;

      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        const quantity = amounts[i];

        if (quantity > 0) {
          const response = await fetch(
            `${baseUrl}/api/inventory/${propertyId}/${product.id}/${currentMonth}`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                quantity,
              }),
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

  const handleMaintenanceSubmit = async () => {
    console.log("Selected property:", selectedPropertyName);
    console.log("Selected category:", selectedCategory);
    console.log("Selected company:", selectedCompany);
    console.log("Description:", maintenanceDescription);
    console.log("Selected date:", selectedDate);
    console.log("Maintenance cost:", maintenanceCost);

    const maintenanceMonthYear = dayjs(selectedDate).format("MMMMYYYY");

    if (
      !selectedPropertyName ||
      !selectedCategory ||
      !selectedCompany ||
      !maintenanceCost
    ) {
      alert("Please fill in all required fields.");
      return;
    }

    try {
      // If a file is attached, convert it to Base64 and upload
      if (isFileAttached && fileAttached) {
        const fileBase64 = await convertFileToBase64(fileAttached);

        const fileResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/upload/maintenance`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              propertyName: selectedPropertyName,
              monthYear: maintenanceMonthYear,
              file: fileBase64,
              fileName: fileAttached.name,
              fileType: fileAttached.type,
            }),
          }
        );

        if (!fileResponse.ok) {
          throw new Error("Failed to upload file");
        }

        alert("File uploaded successfully");
      }

      // Send maintenance request
      const maintenanceResponse = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/maintenance`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            propertyId,
            category: selectedCategory,
            company: selectedCompany,
            cost: maintenanceCost,
            description: maintenanceDescription || "",
            date: selectedDate,
          }),
        }
      );

      if (!maintenanceResponse.ok) {
        throw new Error("Failed to submit maintenance request");
      }

      alert("Maintenance request submitted successfully");
    } catch (error) {
      console.error("Error submitting maintenance request:", error);
      alert("An error occurred. Please try again.");
    }
  };

  // Function to convert file to Base64
  const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/inventory/products`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch products");
        }

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
        if (!response.ok) {
          throw new Error("Failed to fetch amounts");
        }

        const data = await response.json();
        setAmounts(data.map((item) => item.quantity));
      } catch (error) {
        console.error("Error fetching amounts:", error);
      }
    };

    if (propertyId) {
      fetchAmounts();
    }
  }, [propertyId, currentMonth]);

  const handleMonthChange = (newMonth) => {
    setCurrentMonth(newMonth);
  };

  const handleMaintenanceCostChange = (event) => {
    setMaintenanceCost(event.target.value);
  };

  const handleMaintenanceDescriptionChange = (event) => {
    setMaintenanceDescription(event.target.value);
  };

  const handleDateChange = (date) => {
    const formattedDate = dayjs(date).format("YYYY-MM-DD");
    setSelectedDate(formattedDate);
  };

  // Handle product deletion
  const handleDeleteClick = (product) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/inventory/products/${productToDelete.id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to delete product ${productToDelete.name}`);
      }

      // Update products state to remove the deleted product
      setProducts(products.filter((p) => p.id !== productToDelete.id));
      // Reset amounts for the deleted product (if it exists in amounts)
      setAmounts(
        amounts.filter(
          (_, i) => i !== products.findIndex((p) => p.id === productToDelete.id)
        )
      );
      console.log(`Product ${productToDelete.name} deleted successfully`);
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

  // Handle product addition callback from AddProduct
  const handleAddProductConfirm = async (productData) => {
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
      alert(`Product "${productData.name}" added successfully`);

      // Fetch updated products list
      const updatedProducts = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/inventory/products`
      );
      if (!updatedProducts.ok) {
        throw new Error("Failed to fetch updated products");
      }
      const data = await updatedProducts.json();
      setProducts(data);
    } catch (error) {
      console.error("Error adding product:", error);
      alert("Failed to add product");
    }
  };

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
                          color: "#fafafa", // White icon color
                          "&:hover": {
                            color: "#eccb34", // Yellow on hover for visual feedback
                          },
                          ml: 1, // Margin-left for small space after product name
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
                monthYear={dayjs(selectedDate).format("MMMMYYYY")}
              />
              <Button
                variant="outlined"
                sx={{ color: "#eccb34", borderColor: "#eccb34" }}
                onClick={handleButtonSubmit("update")}
              >
                Update Inventory
              </Button>
              <AddProduct onAddProduct={handleAddProductConfirm} />
            </div>
          </div>

          <div className={styles.rightContainer}>
            <BackgroundContainer width="100%" height="100%" />
            <div className={styles.maintenanceContainer}>
              <div className={styles.rightHeader}>
                {selectedPropertyName || "Select a Property"}
              </div>
              <OptionBar
                label={"Category"}
                placeholder="Maintenance Category"
                options={[
                  { label: "Repair", value: "Repair" },
                  { label: "Plumbing", value: "Plumbing" },
                  { label: "Locksmith", value: "Locksmith" },
                  { label: "Electrical", value: "Electrical" },
                ]}
                onSelect={setSelectedCategory}
              />
              <OptionBar
                label={"Company"}
                placeholder="Maintenance Company"
                options={[
                  { label: "Company1", value: "Company1" },
                  { label: "Company2", value: "Company2" },
                ]}
                onSelect={setSelectedCompany}
              />
              <input
                type="text"
                pattern="\d*"
                inputMode="numeric"
                value={maintenanceCost}
                onChange={handleMaintenanceCostChange}
                className={styles.maintenanceInput}
                placeholder="Maintenance Cost"
              />
              <input
                type="text"
                pattern="\d*"
                inputMode="numeric"
                value={maintenanceDescription}
                onChange={handleMaintenanceDescriptionChange}
                className={styles.maintenanceInput}
                placeholder="Maintenance Description"
              />
              <DatePicker onDateChange={handleDateChange} />
              <Button
                component="label"
                variant="contained"
                startIcon={<CloudUploadIcon />}
                sx={{
                  backgroundColor: "#eccb34",
                }}
              >
                Upload files
                <input
                  type="file"
                  hidden
                  onChange={(event) => {
                    setFileAttached(event.target.files[0]);
                    setIsFileAttached(true);
                  }}
                />
              </Button>
              <Button
                variant="outlined"
                sx={{ color: "#eccb34", borderColor: "#eccb34" }}
                onClick={handleMaintenanceSubmit}
              >
                Submit Maintenance
              </Button>
            </div>
          </div>
        </div>
      </div>
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
        PaperProps={{
          sx: {
            backgroundColor: "#eccb34", // Yellow background for dialog
            color: "#fafafa", // White text
            borderRadius: "8px",
          },
        }}
      >
        <DialogTitle id="delete-dialog-title" sx={{ color: "#fafafa" }}>
          Confirm Deletion
        </DialogTitle>
        <DialogContent>
          <DialogContentText
            id="delete-dialog-description"
            sx={{ color: "#fafafa" }}
          >
            Are you sure you want to delete the product "{productToDelete?.name}
            "? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleDeleteCancel}
            sx={{
              color: "#fafafa",
              borderColor: "#fafafa",
              backgroundColor: "transparent",
              "&:hover": {
                backgroundColor: "rgba(250, 250, 250, 0.1)",
                borderColor: "#fafafa",
              },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            sx={{
              color: "#fafafa",
              borderColor: "#eccb34",
              backgroundColor: "transparent",
              "&:hover": {
                backgroundColor: "rgba(236, 203, 52, 0.1)",
                borderColor: "#eccb34",
              },
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
