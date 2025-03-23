"use client";

import { useState, useEffect } from "react";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import ListItemSecondaryAction from "@mui/material/ListItemSecondaryAction";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import SaveIcon from "@mui/icons-material/Save";
import fetchWithAuth from "@/lib/fetchWithAuth";

const EmailTemplates = () => {
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [currentTemplate, setCurrentTemplate] = useState({
    id: null,
    name: "",
    subject: "",
    message: "",
    buttonText: "",
    buttonUrl: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchEmailTemplates();
  }, []);

  const fetchEmailTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth("/api/email/templates");
      if (response.ok) {
        const data = await response.json();
        setEmailTemplates(data.templates || []);
      } else {
        setError("Failed to fetch templates");
      }
    } catch (error) {
      console.error("Failed to fetch email templates:", error);
      setError("Error loading templates. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateChange = (field) => (event) => {
    setCurrentTemplate({
      ...currentTemplate,
      [field]: event.target.value,
    });
  };

  const saveTemplate = async () => {
    if (!currentTemplate.name || !currentTemplate.subject) {
      setError("Template name and subject are required");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const method = currentTemplate.id ? "PUT" : "POST";
      const response = await fetchWithAuth("/api/email/templates", {
        method,
        body: JSON.stringify(currentTemplate),
      });

      if (response.ok) {
        const result = await response.json();

        if (currentTemplate.id) {
          // Update existing template in the list
          setEmailTemplates(
            emailTemplates.map((t) =>
              t.id === currentTemplate.id ? { ...currentTemplate } : t
            )
          );
          setSuccess("Template updated successfully");
        } else {
          // Add new template to the list
          setEmailTemplates([
            ...emailTemplates,
            { ...currentTemplate, id: result.id },
          ]);
          setSuccess("Template created successfully");
        }

        // Clear form
        setCurrentTemplate({
          id: null,
          name: "",
          subject: "",
          message: "",
          buttonText: "",
          buttonUrl: "",
        });
      } else {
        setError("Failed to save template");
      }
    } catch (error) {
      console.error("Failed to save template:", error);
      setError("Error saving template. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const editTemplate = (template) => {
    setCurrentTemplate({ ...template });
    setSuccess("");
    setError("");
  };

  const deleteTemplate = async (id) => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetchWithAuth(`/api/email/templates/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setEmailTemplates(emailTemplates.filter((t) => t.id !== id));
        setSuccess("Template deleted successfully");
      } else {
        setError("Failed to delete template");
      }
    } catch (error) {
      console.error("Failed to delete template:", error);
      setError("Error deleting template. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setCurrentTemplate({
      id: null,
      name: "",
      subject: "",
      message: "",
      buttonText: "",
      buttonUrl: "",
    });
    setSuccess("");
    setError("");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
        {/* Template List */}
        <div className="flex flex-col h-full">
          <div className="py-3 px-4 bg-primary/10 rounded-t-lg text-dark font-semibold">
            <span>Saved Templates</span>
          </div>
          <div className="flex-1 overflow-y-auto bg-secondary/80 rounded-b-lg border border-primary/10 p-0">
            {loading && emailTemplates.length === 0 ? (
              <div className="flex items-center justify-center h-40">
                <CircularProgress sx={{ color: "#eccb34" }} />
              </div>
            ) : emailTemplates.length > 0 ? (
              <List>
                {emailTemplates.map((template) => (
                  <ListItem
                    key={template.id}
                    className="border-b border-primary/10 hover:bg-primary/5 transition-colors"
                  >
                    <ListItemText
                      primary={template.name}
                      secondary={template.subject}
                      primaryTypographyProps={{
                        className: "font-medium text-dark",
                      }}
                      secondaryTypographyProps={{
                        className: "text-dark/70",
                      }}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        aria-label="edit"
                        onClick={() => editTemplate(template)}
                        className="text-dark hover:text-primary"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        edge="end"
                        aria-label="delete"
                        onClick={() => deleteTemplate(template.id)}
                        className="text-dark hover:text-red-500"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            ) : (
              <div className="flex items-center justify-center h-40">
                <p className="text-dark text-lg">No templates found</p>
              </div>
            )}
          </div>
        </div>

        {/* Template Form */}
        <div className="flex flex-col h-full">
          <div className="py-3 px-4 bg-primary/10 rounded-t-lg text-dark font-semibold flex justify-between items-center">
            <span>
              {currentTemplate.id ? "Edit Template" : "Create Template"}
            </span>
            {currentTemplate.id && (
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={clearForm}
                sx={{ color: "#333" }}
              >
                New
              </Button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto bg-secondary/80 rounded-b-lg border border-primary/10 p-4">
            <div className="space-y-4">
              {error && (
                <div className="p-2 rounded-lg border border-red-500 bg-red-100">
                  <p className="text-red-600">{error}</p>
                </div>
              )}

              {success && (
                <div className="p-2 rounded-lg border border-green-500 bg-green-100">
                  <p className="text-green-600">{success}</p>
                </div>
              )}

              <TextField
                label="Template Name"
                fullWidth
                value={currentTemplate.name}
                onChange={handleTemplateChange("name")}
                required
                size="small"
                className="bg-white rounded-lg"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: "#eccb34" },
                    "&:hover fieldset": { borderColor: "#eccb34" },
                    "&.Mui-focused fieldset": { borderColor: "#eccb34" },
                  },
                }}
              />

              <TextField
                label="Email Subject"
                fullWidth
                value={currentTemplate.subject}
                onChange={handleTemplateChange("subject")}
                required
                size="small"
                className="bg-white rounded-lg"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: "#eccb34" },
                    "&:hover fieldset": { borderColor: "#eccb34" },
                    "&.Mui-focused fieldset": { borderColor: "#eccb34" },
                  },
                }}
              />

              <TextField
                label="Email Message"
                fullWidth
                value={currentTemplate.message}
                onChange={handleTemplateChange("message")}
                multiline
                rows={6}
                className="bg-white rounded-lg"
                helperText="HTML is supported"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: "#eccb34" },
                    "&:hover fieldset": { borderColor: "#eccb34" },
                    "&.Mui-focused fieldset": { borderColor: "#eccb34" },
                  },
                }}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextField
                  label="Button Text (Optional)"
                  fullWidth
                  value={currentTemplate.buttonText}
                  onChange={handleTemplateChange("buttonText")}
                  size="small"
                  className="bg-white rounded-lg"
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      "& fieldset": { borderColor: "#eccb34" },
                      "&:hover fieldset": { borderColor: "#eccb34" },
                      "&.Mui-focused fieldset": { borderColor: "#eccb34" },
                    },
                  }}
                />

                <TextField
                  label="Button URL (Optional)"
                  fullWidth
                  value={currentTemplate.buttonUrl}
                  onChange={handleTemplateChange("buttonUrl")}
                  size="small"
                  className="bg-white rounded-lg"
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      "& fieldset": { borderColor: "#eccb34" },
                      "&:hover fieldset": { borderColor: "#eccb34" },
                      "&.Mui-focused fieldset": { borderColor: "#eccb34" },
                    },
                  }}
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  variant="contained"
                  onClick={saveTemplate}
                  disabled={loading}
                  startIcon={
                    loading ? <CircularProgress size={20} /> : <SaveIcon />
                  }
                  className="bg-primary hover:bg-secondary hover:text-primary text-dark font-medium px-6 py-2 rounded-lg shadow-md transition-colors duration-300"
                  sx={{
                    textTransform: "none",
                    fontSize: "1rem",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                    "&:hover": {
                      boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                    },
                  }}
                >
                  {currentTemplate.id ? "Update Template" : "Save Template"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailTemplates;
