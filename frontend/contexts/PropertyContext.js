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

      if (data.success) {
        const propertyMap = data.properties.reduce((acc, prop) => {
          acc[prop.property_uid] = prop.name;
          return acc;
        }, {});
        console.log("Fetched properties:", propertyMap);
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
