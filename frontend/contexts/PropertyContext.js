"use client";

import dayjs from "dayjs";
import { createContext, useContext, useState, useEffect } from "react";
import fetchWithAuth from "../app/utils/fetchWithAuth";
import { useUser } from "./UserContext";

const PropertyContext = createContext();

export const PropertyProvider = ({ children }) => {
  const { user, loading: userLoading } = useUser();
  const [properties, setProperties] = useState({});
  const [loading, setLoading] = useState(true);
  const [propertyId, setPropertyId] = useState("");
  const [selectedPropertyName, setSelectedPropertyName] = useState("");
  const [currentMonth, setCurrentMonth] = useState(dayjs().format("MMMM"));

  const fetchProperties = async () => {
    try {
      const response = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/igms/property`
      );
      const data = await response.json();

      if (data.success) {
        const propertyMap = data.properties.reduce((acc, prop) => {
          acc[prop.property_uid] = prop.name;
          return acc;
        }, {});
        console.log("Fetched properties:", propertyMap);
        setProperties(propertyMap);

        // Set default property and selectedPropertyName if no propertyId is set
        if (!propertyId && Object.keys(propertyMap).length > 0) {
          const firstPropertyId = Object.keys(propertyMap)[0];
          setPropertyId(firstPropertyId);
          setSelectedPropertyName(propertyMap[firstPropertyId]);
          console.log("Setting default property:", {
            propertyId: firstPropertyId,
            selectedPropertyName: propertyMap[firstPropertyId],
          });
        } else if (propertyId && propertyMap[propertyId]) {
          // Update selectedPropertyName if propertyId exists
          setSelectedPropertyName(propertyMap[propertyId]);
          console.log(
            "Updating selectedPropertyName for existing propertyId:",
            {
              propertyId,
              selectedPropertyName: propertyMap[propertyId],
            }
          );
        }
      }
    } catch (error) {
      console.error("Property fetch failed:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userLoading && user) {
      fetchProperties();
    } else if (!userLoading && !user) {
      setLoading(false);
    }
  }, [user, userLoading]);

  useEffect(() => {
    if (propertyId && properties[propertyId]) {
      setSelectedPropertyName(properties[propertyId]);
    }
  }, [propertyId, properties]);

  return (
    <PropertyContext.Provider
      value={{
        properties,
        loading,
        propertyId,
        setPropertyId,
        selectedPropertyName,
        setSelectedPropertyName,
        currentMonth,
        setCurrentMonth,
      }}
    >
      {children}
    </PropertyContext.Provider>
  );
};

export const useProperties = () => useContext(PropertyContext);
