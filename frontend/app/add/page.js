"use client";

import styles from "./addPage.module.css";
import { useState, useEffect, use } from "react";
import BackgroundContainer from "../components/backgroundContainer";
import FilterBar from "../components/propertyFilterBar";
import OptionBar from "../components/optionBar";
import Button from "@mui/material/Button";
import { useProperties } from "../../contexts/PropertyContext";
import PdfSection from "./pdfSection";

const AddPage = () => {
  const [products, setProducts] = useState([]);
  const [rates, setRates] = useState([]);
  const [amounts, setAmounts] = useState([]);
  const [ownersName, setOwnersName] = useState("");
  const [rowAmounts, setRowAmounts] = useState();
  const [isloading, setLoading] = useState(true);
  const [property, setProperty] = useState("");
  const { properties: allProperties, loading } = useProperties();
  const [filteredProperties, setFilteredProperties] = useState({});
  const [selectedPropertyName, setSelectedPropertyName] = useState();

  const getSheetName = () => {
    const date = new Date();
    const monthNames = [
      "January25",
      "February25",
      "March25",
      "April25",
      "May25",
      "June25",
      "July25",
      "August25",
      "September25",
      "October25",
      "November25",
      "December25",
    ];
    const currentMonth = monthNames[date.getMonth()];
    return currentMonth;
  };

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
    console.log("Property selected:", { id: propertyId, name: propertyName });
    setProperty(propertyId);
    setSelectedPropertyName(propertyName);
  };

  const handleButtonSubmit = (type) => async () => {
    try {
      const sheetName = encodeURIComponent(getSheetName());
      const sheetId = "160NmH7pGEJqyZyZRqkPcK3BOCpW9seESrcdrSH4KSYM";
      const baseUrl = "http://localhost:5000";

      const fullAmounts = Array(rowAmounts)
        .fill(0)
        .map((_, idx) => amounts[idx] || 0);

      const url = `${baseUrl}/api/sheets/${sheetId}/${sheetName}/2/${rowAmounts}/${selectedPropertyName}`;

      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          values: [selectedPropertyName, ...fullAmounts],
        }),
      });

      if (!response.ok) {
        throw new Error("Update failed");
      }

      const result = await response.json();
      console.log("Update success:", result);
    } catch (error) {
      console.error("Update error:", error);
    }
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const sheetName = encodeURIComponent(getSheetName());
        const sheetId = "160NmH7pGEJqyZyZRqkPcK3BOCpW9seESrcdrSH4KSYM";
        const baseUrl = "http://localhost:5000";

        const url = `${baseUrl}/api/sheets/${sheetId}/${sheetName}/columnA`;

        const response = await fetch(url);
        if (response.status === 401) {
          // Token expired
          window.location.href = `${baseUrl}/api/google`;
          return;
        }

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setProducts(data.columnA);
        setRates(data.rates);
        setRowAmounts(data.columnA.length);
        setAmounts(new Array(data.columnA.length).fill(0));
      } catch (error) {
        console.error("Fetch error:", error);
        console.error("Error details:", {
          message: error.message,
          url: error.url,
          type: error.type,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    const fetchAmounts = async () => {
      if (!rowAmounts || !property) {
        return;
      }

      try {
        const sheetName = encodeURIComponent(getSheetName());
        const sheetId = "160NmH7pGEJqyZyZRqkPcK3BOCpW9seESrcdrSH4KSYM";
        const baseUrl = "http://localhost:5000";
        console.log(property);
        const url = `${baseUrl}/api/sheets/${sheetId}/${sheetName}/2/${rowAmounts}/${selectedPropertyName}`;
        console.log("Fetching from:", url);

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Amounts data:", data);

        if (data.success && Array.isArray(data.values)) {
          setAmounts(data.values.map((value) => Number(value) || 0));
          setOwnersName(data.ownersName);
        } else {
          setAmounts(Array(rowAmounts).fill(0));
        }
      } catch (error) {
        console.error("Fetch amounts error:", error);
        setAmounts(Array(rowAmounts).fill(0));
      } finally {
        setLoading(false);
      }
    };

    if (selectedPropertyName) {
      fetchAmounts();
    }
  }, [selectedPropertyName]);

  return (
    <div className={styles.addPageContainer}>
      <div className={styles.topNav}>
        <h1>Dashboard</h1>
        <div className={styles.filterBarContainer}>
          <FilterBar
            properties={filteredProperties}
            loading={loading}
            onPropertySelect={handlePropertyChange}
          />
        </div>
      </div>
      <div className={styles.topLine}></div>

      <div className={styles.mainContainer}>
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
                    <span className={styles.productName}>{product}</span>
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
            <BackgroundContainer width="100%" height="100%" />
            <div className={styles.rightHeader}>
              {selectedPropertyName || "Select a Property"}
            </div>
          </div>
        </div>

        <div className={styles.buttonContainer}>
          <PdfSection
            products={products}
            amounts={amounts}
            rates={rates}
            selectedPropertyName={selectedPropertyName}
            ownersName={ownersName}
          />
          <Button
            variant="outlined"
            sx={{ color: "#eccb34", borderColor: "#eccb34" }}
            onClick={handleButtonSubmit("update")}
          >
            Update Sheet
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddPage;
