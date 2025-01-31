"use client";

import { createContext, useContext, useState, useEffect } from "react";

const PropertyContext = createContext();

export const PropertyProvider = ({ children }) => {
  const [properties, setProperties] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchProperties = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/igms/property");
      const data = await response.json();
      console.log("Fetched properties:", data);

      if (data.success) {
        const propertyMap = data.properties
          .filter((prop) => prop.is_active !== 0)
          .sort((a, b) => a.name.localeCompare(b.name))
          .reduce((acc, prop) => {
            acc[prop.property_uid] = prop.name;
            return acc;
          }, {});
        setProperties(propertyMap);
      }
    } catch (error) {
      console.error("Property fetch failed:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  return (
    <PropertyContext.Provider value={{ properties, loading }}>
      {children}
    </PropertyContext.Provider>
  );
};

export const useProperties = () => useContext(PropertyContext);
