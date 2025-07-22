"use client";
import { useState, useEffect } from "react";
import CircularProgress from "@mui/material/CircularProgress";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Alert from "@mui/material/Alert";
import LinkIcon from "@mui/icons-material/Link";
import DriveIcon from "@mui/icons-material/FolderOpen";
import SheetsIcon from "@mui/icons-material/TableChart";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import CloudSyncIcon from "@mui/icons-material/CloudSync";
import IconButton from "@mui/material/IconButton";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PreviewIcon from "@mui/icons-material/Visibility";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import DialogContentText from "@mui/material/DialogContentText";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import ImageIcon from "@mui/icons-material/Image";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RefreshIcon from "@mui/icons-material/Refresh";
import fetchWithAuth from "@/lib/fetchWithAuth";

const GoogleIntegration = ({ property, onUpdate }) => {
  // States
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [integrationMode, setIntegrationMode] = useState(0); // 0: Drive, 1: Sheets
  const [driveId, setDriveId] = useState(property?.googleDriveId || "");
  const [sheetId, setSheetId] = useState(property?.googleSheetId || "");
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [dialogType, setDialogType] = useState(""); // "drive" or "sheet"
  const [files, setFiles] = useState([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileViewerOpen, setFileViewerOpen] = useState(false);

  // Fetch files when driveId changes or component mounts
  useEffect(() => {
    if (driveId) {
      fetchFiles();
    }
  }, [driveId]);

  const fetchFiles = async () => {
    if (!driveId) return;

    try {
      setIsLoadingFiles(true);
      const response = await fetchWithAuth(
        `/api/google/files?folderId=${driveId}`
      );

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      setFiles(data.files || []);
    } catch (err) {
      console.error("Error fetching files:", err);
      setNotification({
        type: "error",
        message: `Failed to fetch files: ${err.message}`,
      });
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setIntegrationMode(newValue);
  };

  const openLinkDialog = (type) => {
    setDialogType(type);
    setShowLinkDialog(true);
  };

  const saveGoogleLink = async () => {
    try {
      setIsLoading(true);

      const updateData =
        dialogType === "drive"
          ? { googleDriveId: driveId }
          : { googleSheetId: sheetId };

      const response = await fetchWithAuth(`/api/properties/${property.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error(`Failed to update property: ${await response.text()}`);
      }

      const updatedProperty = await response.json();
      onUpdate(updatedProperty);

      setNotification({
        type: "success",
        message: `Google ${
          dialogType === "drive" ? "Drive folder" : "Sheet"
        } linked successfully!`,
      });

      setShowLinkDialog(false);
    } catch (err) {
      console.error("Error linking Google resource:", err);
      setNotification({
        type: "error",
        message: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (file) => {
    setSelectedFile(file);
    setFileViewerOpen(true);
  };

  const getFileIcon = (mimeType) => {
    if (mimeType.includes("pdf"))
      return <PictureAsPdfIcon sx={{ color: "#e74c3c" }} />;
    if (mimeType.includes("image"))
      return <ImageIcon sx={{ color: "#3498db" }} />;
    return <InsertDriveFileIcon sx={{ color: "#95a5a6" }} />;
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Notification */}
      {notification && (
        <Alert
          severity={notification.type}
          onClose={() => setNotification(null)}
          className="mb-4"
          sx={{
            "& .MuiAlert-icon": {
              color: notification.type === "success" ? "#eccb34" : undefined,
            },
          }}
        >
          {notification.message}
        </Alert>
      )}

      {/* Tabs */}
      <Tabs
        value={integrationMode}
        onChange={handleTabChange}
        sx={{
          mb: 3,
          "& .MuiTab-root": {
            color: "#333333",
            "&.Mui-selected": {
              color: "#eccb34",
            },
          },
          "& .MuiTabs-indicator": {
            backgroundColor: "#eccb34",
          },
        }}
      >
        <Tab label="Google Drive" icon={<DriveIcon />} iconPosition="start" />
        <Tab label="Google Sheets" icon={<SheetsIcon />} iconPosition="start" />
      </Tabs>

      {/* Google Drive Integration */}
      {integrationMode === 0 && (
        <div className="flex flex-col space-y-4">
          <Card
            elevation={0}
            className="border border-primary/10 rounded-lg overflow-hidden"
          >
            <CardContent>
              <div className="flex justify-between items-center">
                <Typography
                  variant="h6"
                  component="h3"
                  className="text-dark font-medium"
                >
                  Drive Folder for {property.name}
                </Typography>
                {driveId ? (
                  <div className="flex gap-2">
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<LinkIcon />}
                      onClick={() => openLinkDialog("drive")}
                      sx={{
                        textTransform: "none",
                        color: "#eccb34",
                        borderColor: "#eccb34",
                        "&:hover": {
                          borderColor: "#d9b92f",
                          bgcolor: "rgba(236, 203, 52, 0.1)",
                        },
                      }}
                    >
                      Change Folder
                    </Button>
                    <IconButton
                      component="a"
                      href={`https://drive.google.com/drive/folders/${driveId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="small"
                      sx={{ color: "#333" }}
                      title="Open in Google Drive"
                    >
                      <OpenInNewIcon />
                    </IconButton>
                  </div>
                ) : (
                  <Button
                    variant="contained"
                    startIcon={<LinkIcon />}
                    onClick={() => openLinkDialog("drive")}
                    sx={{
                      textTransform: "none",
                      bgcolor: "#eccb34",
                      color: "#333333",
                      "&:hover": { bgcolor: "#d9b92f" },
                    }}
                  >
                    Link Drive Folder
                  </Button>
                )}
              </div>

              {driveId && (
                <Box className="mt-2">
                  <Typography variant="body2" className="text-dark/70">
                    Folder ID: {driveId}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          {driveId && (
            <Card
              elevation={0}
              className="border border-primary/10 rounded-lg overflow-hidden flex-1"
            >
              <CardContent>
                <div className="flex justify-between items-center mb-4">
                  <Typography
                    variant="h6"
                    component="h3"
                    className="text-dark font-medium"
                  >
                    Files and Documents
                  </Typography>
                  <Button
                    startIcon={<RefreshIcon />}
                    size="small"
                    onClick={fetchFiles}
                    disabled={isLoadingFiles}
                    sx={{
                      textTransform: "none",
                      color: "#eccb34",
                    }}
                  >
                    {isLoadingFiles ? "Loading..." : "Refresh"}
                  </Button>
                </div>

                {isLoadingFiles ? (
                  <div className="flex justify-center py-8">
                    <CircularProgress size={24} sx={{ color: "#eccb34" }} />
                  </div>
                ) : (
                  <div className="max-h-96 overflow-auto">
                    {files.length > 0 ? (
                      <List disablePadding>
                        {files.map((file) => (
                          <ListItem
                            key={file.id}
                            divider
                            className="hover:bg-primary/5 transition-colors"
                            secondaryAction={
                              <div className="flex space-x-1">
                                <IconButton
                                  edge="end"
                                  size="small"
                                  onClick={() => handleFileSelect(file)}
                                  sx={{ color: "#333" }}
                                >
                                  <PreviewIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                  component="a"
                                  href={file.webViewLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  edge="end"
                                  size="small"
                                  sx={{ color: "#333" }}
                                >
                                  <OpenInNewIcon fontSize="small" />
                                </IconButton>
                              </div>
                            }
                          >
                            <ListItemIcon>
                              {getFileIcon(file.mimeType)}
                            </ListItemIcon>
                            <ListItemText
                              primary={file.name}
                              secondary={
                                <span>
                                  {formatFileSize(file.size)} •{" "}
                                  {formatDate(file.modifiedTime)}
                                </span>
                              }
                              primaryTypographyProps={{
                                className: "text-dark",
                                noWrap: true,
                                style: { maxWidth: "300px" },
                              }}
                              secondaryTypographyProps={{
                                className: "text-dark/60",
                                variant: "caption",
                              }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-8 text-dark/50">
                        <DriveIcon sx={{ fontSize: 48 }} />
                        <Typography variant="body1" className="mt-2">
                          No files found in this folder
                        </Typography>
                        <Typography variant="body2" className="mt-1">
                          Upload files directly to Google Drive or through this
                          app
                        </Typography>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Google Sheets Integration */}
      {integrationMode === 1 && (
        <Card
          elevation={0}
          className="border border-primary/10 rounded-lg overflow-hidden"
        >
          <CardContent>
            <div className="flex justify-between items-center mb-4">
              <Typography
                variant="h6"
                component="h3"
                className="text-dark font-medium"
              >
                Financial Sheet for {property.name}
              </Typography>
              {sheetId ? (
                <div className="flex gap-2">
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<LinkIcon />}
                    onClick={() => openLinkDialog("sheet")}
                    sx={{
                      textTransform: "none",
                      color: "#eccb34",
                      borderColor: "#eccb34",
                      "&:hover": {
                        borderColor: "#d9b92f",
                        bgcolor: "rgba(236, 203, 52, 0.1)",
                      },
                    }}
                  >
                    Change Sheet
                  </Button>
                  <IconButton
                    component="a"
                    href={`https://docs.google.com/spreadsheets/d/${sheetId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    size="small"
                    sx={{ color: "#333" }}
                    title="Open in Google Sheets"
                  >
                    <OpenInNewIcon />
                  </IconButton>
                </div>
              ) : (
                <Button
                  variant="contained"
                  startIcon={<LinkIcon />}
                  onClick={() => openLinkDialog("sheet")}
                  sx={{
                    textTransform: "none",
                    bgcolor: "#eccb34",
                    color: "#333333",
                    "&:hover": { bgcolor: "#d9b92f" },
                  }}
                >
                  Link Sheet
                </Button>
              )}
            </div>

            {sheetId ? (
              <div>
                <Typography variant="body2" className="text-dark/70 mb-2">
                  Sheet ID: {sheetId}
                </Typography>

                <Box className="mt-6 bg-primary/5 p-4 rounded-lg">
                  <Typography
                    variant="subtitle2"
                    className="mb-3 text-dark font-medium"
                  >
                    Spreadsheet Preview
                  </Typography>
                  <iframe
                    src={`https://docs.google.com/spreadsheets/d/${sheetId}/pubhtml?widget=true&amp;headers=false`}
                    width="100%"
                    height="400px"
                    frameBorder="0"
                    className="border border-primary/10 rounded-lg"
                  ></iframe>
                </Box>
              </div>
            ) : (
              <Box className="bg-primary/5 p-6 rounded-lg mt-4 text-center">
                <SheetsIcon sx={{ fontSize: 48, color: "#95a5a6" }} />
                <Typography variant="body1" className="mt-2 text-dark">
                  No spreadsheet linked to this property
                </Typography>
                <Typography variant="body2" className="mt-1 text-dark/60">
                  Link a Google Sheet to track financial data for this property
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Link Dialog */}
      <Dialog
        open={showLinkDialog}
        onClose={() => setShowLinkDialog(false)}
        PaperProps={{
          sx: {
            backgroundColor: "#fafafa",
            color: "#333333",
            borderRadius: "12px",
            border: "1px solid rgba(236, 203, 52, 0.2)",
          },
        }}
      >
        <DialogTitle>
          Link Google {dialogType === "drive" ? "Drive Folder" : "Sheet"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: "#333333", mb: 2 }}>
            {dialogType === "drive"
              ? "Enter the Google Drive Folder ID for this property. You can find it in the folder URL after '/folders/'."
              : "Enter the Google Sheet ID for this property. You can find it in the sheet URL after '/d/'."}
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id={`${dialogType}-id`}
            label={dialogType === "drive" ? "Folder ID" : "Sheet ID"}
            type="text"
            fullWidth
            variant="outlined"
            value={dialogType === "drive" ? driveId : sheetId}
            onChange={(e) => {
              dialogType === "drive"
                ? setDriveId(e.target.value)
                : setSheetId(e.target.value);
            }}
            sx={{
              "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                {
                  borderColor: "#eccb34",
                },
              "& .MuiInputLabel-root.Mui-focused": {
                color: "#eccb34",
              },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setShowLinkDialog(false)}
            sx={{ color: "#333" }}
          >
            Cancel
          </Button>
          <Button
            onClick={saveGoogleLink}
            variant="contained"
            disabled={isLoading}
            sx={{
              bgcolor: "#eccb34",
              color: "#333333",
              "&:hover": { bgcolor: "#d9b92f" },
            }}
          >
            {isLoading ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* File Viewer Dialog */}
      <Dialog
        open={fileViewerOpen}
        onClose={() => setFileViewerOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: "#fafafa",
            color: "#333333",
            borderRadius: "12px",
            border: "1px solid rgba(236, 203, 52, 0.2)",
            height: "80vh",
          },
        }}
      >
        {selectedFile && (
          <>
            <DialogTitle>
              <div className="flex justify-between items-center">
                <Typography noWrap className="max-w-md">
                  {selectedFile.name}
                </Typography>
                <IconButton
                  component="a"
                  href={selectedFile.webViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ color: "#333" }}
                  title="Open in Google Drive"
                >
                  <OpenInNewIcon />
                </IconButton>
              </div>
            </DialogTitle>
            <DialogContent dividers className="h-full flex-1 flex flex-col">
              <iframe
                src={`https://docs.google.com/viewer?url=${encodeURIComponent(
                  selectedFile.webContentLink || selectedFile.webViewLink
                )}&embedded=true`}
                width="100%"
                height="100%"
                frameBorder="0"
                className="flex-1"
              />
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => setFileViewerOpen(false)}
                sx={{ color: "#333" }}
              >
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </div>
  );
};

export default GoogleIntegration;
