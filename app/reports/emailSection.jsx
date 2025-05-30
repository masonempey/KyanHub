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
import SendIcon from "@mui/icons-material/Send";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import fetchWithAuth from "@/lib/fetchWithAuth";

const initializeGoogleAuth = async () => {
  try {
    const response = await fetchWithAuth("/api/google/auth-status", {
      method: "GET",
    });

    const data = await response.json();

    if (!data.isAuthorized) {
      console.log("Google auth required, redirecting...");
      handleGoogleAuthRedirect(
        new Error(
          `Insufficient Permission: Google API authorization required. Please visit ${data.authUrl} to grant permission.`
        )
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error checking auth status:", error);
    return true;
  }
};

function handleGoogleAuthRedirect(error) {
  const urlMatch = error.message.match(
    /Please visit (https:\/\/accounts\.google\.com\S+) to grant/
  );

  if (urlMatch && urlMatch[1]) {
    const authUrl = urlMatch[1];
    console.log("Redirecting to Google auth:", authUrl);

    // Store current page to return after auth
    localStorage.setItem("authReturnPath", window.location.pathname);

    // Add state parameter to the URL
    const currentPath = window.location.pathname;
    const authUrlWithState =
      authUrl +
      (authUrl.includes("?") ? "&" : "?") +
      `state=${encodeURIComponent(currentPath)}`;

    // Redirect to Google auth with state parameter
    window.location.href = authUrlWithState;
    return true;
  }
  return false;
}

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

  // Test email state
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testEmailData, setTestEmailData] = useState({
    to: "",
    variables: "",
  });
  const [sendingTest, setSendingTest] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  useEffect(() => {
    fetchEmailTemplates();
  }, []);

  useEffect(() => {
    initializeGoogleAuth();
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

  const handleTestInputChange = (field) => (event) => {
    setTestEmailData({
      ...testEmailData,
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
      const url = currentTemplate.id
        ? `/api/email/templates/${currentTemplate.id}`
        : "/api/email/templates";

      const response = await fetchWithAuth(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
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
    // Ensure all fields have at least empty string values
    setCurrentTemplate({
      id: template.id || null,
      name: template.name || "",
      subject: template.subject || "",
      message: template.message || "",
      buttonText: template.buttonText || "",
      buttonUrl: template.buttonUrl || "",
    });
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

  // Open test email dialog
  const openTestDialog = (template) => {
    setTestEmailData({
      to: "",
      variables:
        '{\n  "property.name": "Sample Property",\n  "property.address": "123 Main St",\n  "booking.guestName": "John Doe"\n}',
    });

    // Ensure all fields have at least empty string values
    setCurrentTemplate({
      id: template.id || null,
      name: template.name || "",
      subject: template.subject || "",
      message: template.message || "",
      buttonText: template.buttonText || "",
      buttonUrl: template.buttonUrl || "",
    });

    setTestDialogOpen(true);
  };

  // Update your sendTestEmail function
  const sendTestEmail = async () => {
    if (!testEmailData.to) {
      showSnackbar("Email recipient is required", "error");
      return;
    }

    setSendingTest(true);

    try {
      let variables = {};
      try {
        variables = JSON.parse(testEmailData.variables || "{}");
      } catch (e) {
        showSnackbar("Invalid JSON in variables field", "error");
        setSendingTest(false);
        return;
      }

      const response = await fetchWithAuth("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: testEmailData.to,
          subject: currentTemplate.subject,
          message: currentTemplate.message,
          buttonText: currentTemplate.buttonText,
          buttonUrl: currentTemplate.buttonUrl,
          variables: variables,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Check for 403 Forbidden (Access Denied)
        if (response.status === 403) {
          setTestDialogOpen(false);
          showSnackbar(
            "Access Denied: Only info@kyanproperties.com may send emails",
            "error"
          );
          return;
        }

        // Handle authorization required
        if (
          response.status === 401 &&
          errorData.error?.includes("authorization required")
        ) {
          if (handleGoogleAuthRedirect(new Error(errorData.error))) {
            return;
          }
        }

        throw new Error(errorData.error || "Failed to send test email");
      }

      setTestDialogOpen(false);
      showSnackbar("Test email sent successfully!", "success");
    } catch (error) {
      console.error("Error sending test email:", error);

      // Check if we need to redirect for auth
      if (error.message && error.message.includes("authorization required")) {
        if (handleGoogleAuthRedirect(error)) {
          return;
        }
      }

      setSnackbar({
        open: true,
        message: error.message || "Failed to send email",
        severity: "error",
      });
    } finally {
      setSendingTest(false);
    }
  };

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
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
                        aria-label="send test"
                        onClick={() => openTestDialog(template)}
                        title="Send test email"
                        className="text-dark hover:text-blue-500"
                        sx={{ mr: 0.5 }}
                      >
                        <SendIcon />
                      </IconButton>
                      <IconButton
                        edge="end"
                        aria-label="edit"
                        onClick={() => editTemplate(template)}
                        title="Edit template"
                        className="text-dark hover:text-primary"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        edge="end"
                        aria-label="delete"
                        onClick={() => deleteTemplate(template.id)}
                        title="Delete template"
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
                helperText="HTML is supported. Use {{variable}} syntax for dynamic content."
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

              <div className="flex justify-between pt-4">
                {currentTemplate.id && (
                  <Button
                    variant="outlined"
                    onClick={() => openTestDialog(currentTemplate)}
                    startIcon={<SendIcon />}
                    sx={{
                      textTransform: "none",
                      fontSize: "1rem",
                      color: "#3f51b5",
                      borderColor: "#3f51b5",
                      "&:hover": {
                        backgroundColor: "rgba(63, 81, 181, 0.04)",
                        borderColor: "#3f51b5",
                      },
                    }}
                  >
                    Test Email
                  </Button>
                )}
                <div className={currentTemplate.id ? "" : "ml-auto"}>
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

      {/* Test Email Dialog */}
      <Dialog
        open={testDialogOpen}
        onClose={() => !sendingTest && setTestDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Send Test Email - {currentTemplate.name}</DialogTitle>
        <DialogContent>
          <div className="space-y-4 mt-2">
            <TextField
              label="Recipient Email"
              fullWidth
              value={testEmailData.to}
              onChange={handleTestInputChange("to")}
              required
              size="small"
              sx={{
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: "#eccb34" },
                  "&:hover fieldset": { borderColor: "#eccb34" },
                  "&.Mui-focused fieldset": { borderColor: "#eccb34" },
                },
              }}
            />

            <TextField
              label="Template Variables (JSON format)"
              fullWidth
              value={testEmailData.variables}
              onChange={handleTestInputChange("variables")}
              multiline
              rows={8}
              helperText="Enter JSON object with variables to substitute in the template"
              sx={{
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: "#eccb34" },
                  "&:hover fieldset": { borderColor: "#eccb34" },
                  "&.Mui-focused fieldset": { borderColor: "#eccb34" },
                },
              }}
            />

            <div className="text-xs text-gray-500 mt-2">
              <p>Variable examples:</p>
              <ul className="list-disc pl-5">
                <li>{"{{property.name}}"} - Name of the property</li>
                <li>{"{{booking.guestName}}"} - Guest name</li>
                <li>{"{{booking.checkIn}}"} - Check-in date</li>
              </ul>
            </div>
          </div>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setTestDialogOpen(false)}
            disabled={sendingTest}
            sx={{ color: "#333" }}
          >
            Cancel
          </Button>
          <Button
            onClick={sendTestEmail}
            disabled={sendingTest}
            variant="contained"
            startIcon={
              sendingTest ? <CircularProgress size={20} /> : <SendIcon />
            }
            sx={{
              textTransform: "none",
              bgcolor: "#eccb34",
              color: "#333333",
              "&:hover": { bgcolor: "#d9b92f" },
            }}
          >
            Send Test
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default EmailTemplates;
