"use client";

import dayjs from "dayjs";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import fetchWithAuth from "@/lib/fetchWithAuth";
import { useUser } from "./UserContext";

const PropertyContext = createContext();

export const PropertyProvider = ({ children }) => {
  const { user, loading: userLoading } = useUser();
  const [properties, setProperties] = useState({});
  const [loading, setLoading] = useState(true);
  const [propertyId, setPropertyId] = useState("");
  const [selectedProperty, setSelectedProperty] = useState(null); // Store full property object
  const [selectedPropertyName, setSelectedPropertyName] = useState(""); // Store just the name as string
  const [currentMonth, setCurrentMonth] = useState(dayjs().format("MMMM"));
  const [propertyDetails, setPropertyDetails] = useState({}); // Store detailed property data

  const fetchProperties = async () => {
    try {
      const response = await fetchWithAuth(`/api/igms/property`);
      if (!response.ok) {
        throw new Error(`Failed to fetch properties: ${await response.text()}`);
      }
      const data = await response.json();

      if (data.success) {
        const propertyMap = data.properties.reduce((acc, prop) => {
          acc[prop.property_uid] = {
            name: prop.name,
            address: prop.address || "No address available",
            Bedrooms: prop.bedrooms || 0,
            Bathrooms: prop.bathrooms || 0,
          };
          return acc;
        }, {});
        console.log("Fetched properties:", propertyMap);
        setProperties(propertyMap);

        if (!propertyId && Object.keys(propertyMap).length > 0) {
          const firstPropertyId = Object.keys(propertyMap)[0];
          const propObj = propertyMap[firstPropertyId];
          setPropertyId(firstPropertyId);
          setSelectedProperty(propObj);
          // Make sure we're setting just the name string, not the entire object
          setSelectedPropertyName(propObj.name);
          console.log("Setting default property:", {
            propertyId: firstPropertyId,
            selectedProperty: propObj,
          });

          // Fetch additional details for the first property
          fetchProperty(firstPropertyId);
        } else if (propertyId && propertyMap[propertyId]) {
          const propObj = propertyMap[propertyId];
          setSelectedProperty(propObj);
          // Make sure we're setting just the name string, not the entire object
          setSelectedPropertyName(propObj.name);
          console.log("Updating selectedProperty for existing propertyId:", {
            propertyId,
            selectedProperty: propObj,
          });

          // Fetch additional details for the current property
          fetchProperty(propertyId);
        }
      }
    } catch (error) {
      console.error("Property fetch failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProperty = async (id) => {
    try {
      setLoading(true);
      const response = await fetchWithAuth(`/api/properties/${id}`);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch property ${id}: ${await response.text()}`
        );
      }
      const data = await response.json();

      if (data.success) {
        const propertyObj = {
          GoogleSheetId: data.google_sheet_id,
          GoogleFolderId: data.google_folder_id,
        };

        // Store the detailed property data
        setPropertyDetails((prevDetails) => ({
          ...prevDetails,
          [id]: propertyObj,
        }));

        // Update the selected property if this is the currently selected one
        if (id === propertyId) {
          setSelectedProperty((prev) => ({
            ...prev,
            ...propertyObj,
          }));
        }

        console.log("Fetched property details:", propertyObj);
      }
    } catch (error) {
      console.error("Property details fetch failed:", error);
    } finally {
      setLoading(false);
    }
  };

  // Get combined property data including details
  const getPropertyWithDetails = useCallback(
    (id) => {
      const baseProperty = properties[id] || {};
      const details = propertyDetails[id] || {};
      return {
        ...baseProperty,
        ...details,
      };
    },
    [properties, propertyDetails]
  );

  // Update selectedProperty when propertyId changes or when details are fetched
  useEffect(() => {
    if (propertyId) {
      const fullPropertyData = getPropertyWithDetails(propertyId);
      setSelectedProperty(fullPropertyData);
    }
  }, [propertyId, propertyDetails, getPropertyWithDetails]);

  const mutate = useCallback(() => {
    setLoading(true);
    fetchProperties();
  }, []);

  useEffect(() => {
    if (!userLoading && user) {
      fetchProperties();
    } else if (!userLoading && !user) {
      setLoading(false);
    }
  }, [user, userLoading]);

  useEffect(() => {
    if (propertyId && properties[propertyId]) {
      const propObj = properties[propertyId];
      setSelectedProperty(propObj);
      // Safe guard to ensure we always set a string, not an object
      setSelectedPropertyName(
        typeof propObj.name === "string" ? propObj.name : ""
      );

      // Fetch additional details when propertyId changes
      fetchProperty(propertyId);
    }
  }, [propertyId, properties]);

  // Extra safety in the provider value
  const safeSelectedPropertyName =
    typeof selectedPropertyName === "object"
      ? selectedPropertyName?.name || ""
      : selectedPropertyName;

  return (
    <PropertyContext.Provider
      value={{
        properties,
        loading,
        propertyId,
        setPropertyId,
        selectedProperty,
        selectedPropertyName: safeSelectedPropertyName,
        setSelectedPropertyName,
        currentMonth,
        setCurrentMonth,
        mutate,
        propertyDetails,
        fetchProperty,
        getPropertyWithDetails,
      }}
    >
      {children}
    </PropertyContext.Provider>
  );
};

export const useProperties = () => useContext(PropertyContext);
