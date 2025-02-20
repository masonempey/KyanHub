"use client";

import styles from "./addPage.module.css";
import { useState, useEffect } from "react";
import BackgroundContainer from "../components/backgroundContainer";
import Button from "@mui/material/Button";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { useProperties } from "../../contexts/PropertyContext";
import PdfSection from "./pdfSection";
import AddProduct from "./addProduct";
import dayjs from "dayjs";
import TopNav from "../components/topNav";
import OptionBar from "../components/optionBar";
import DatePicker from "../components/datePicker";

const AddPage = () => {
  const { properties: allProperties, loading } = useProperties();
  const [filteredProperties, setFilteredProperties] = useState({});
  const [currentMonth, setCurrentMonth] = useState(dayjs().format("MMMM"));
  const [selectedPropertyName, setSelectedPropertyName] = useState();
  const [products, setProducts] = useState([]);
  const [rates] = useState([]);
  const [amounts, setAmounts] = useState([]);
  const [propertyId, setPropertyId] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [maintenanceCost, setMaintenanceCost] = useState("");
  const [maintenanceDescription, setMaintenanceDescription] = useState("");
  const [isFileAttached, setIsFileAttached] = useState(false);
  const [fileAttached, setFileAttached] = useState(null);
  const [selectedDate, setSelectedDate] = useState(
    dayjs().format("YYYY-MM-DD")
  );

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

  const handlePropertyChange = (propertyId, propertyName) => {
    setPropertyId(propertyId);
    setSelectedPropertyName(propertyName);
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

  return (
    <div className={styles.addPageContainer}>
      <TopNav
        filteredProperties={filteredProperties}
        loading={loading}
        handlePropertyChange={handlePropertyChange}
        selectedMonth={currentMonth}
        currentPage="Analytics"
        onMonthChange={handleMonthChange}
      />
      <div className={styles.mainContainer}>
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
            Update Sheet
          </Button>
        </div>
        <div className={styles.contentContainer}>
          <div className={styles.leftContainer}>
            <BackgroundContainer width="100%" height="100%" />
            <div className={styles.productListContainer}>
              <div className={styles.header}>
                <span>Product</span>
                <span>Amount</span>
              </div>
              <div className={styles.listContainer}>
                {products.map((product, index) => (
                  <div key={index} className={styles.productRow}>
                    <span className={styles.productName}>{product.name}</span>
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
          </div>

          <div className={styles.rightContainer}>
            <div className={styles.backgroundWrapper}>
              <BackgroundContainer width="100%" height="100%" />
            </div>
            <div className={styles.rightHeader}>
              {selectedPropertyName || "Select a Property"}
            </div>
            <div className={styles.maintenanceContainer}>
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
      <AddProduct />
    </div>
  );
};

export default AddPage;
