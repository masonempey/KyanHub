// theme.js
import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  typography: {
    fontFamily: "'Lato', sans-serif",
    fontWeightRegular: 400, // Lato-Regular
    allVariants: {
      fontFamily: "'Lato', sans-serif",
      color: "#fafafa", // Default text color
    },
    h1: {
      fontFamily: "'Lato', sans-serif",
      fontWeight: 700, // Bold for headers if desired
      color: "#fafafa",
    },
    h4: {
      fontFamily: "'Lato', sans-serif",
      fontWeight: 400, // Regular for your h4 in ReportsPage
      color: "#fafafa",
    },
    body1: {
      fontFamily: "'Lato', sans-serif",
      fontWeight: 400,
      color: "#fafafa",
    },
    body2: {
      fontFamily: "'Lato', sans-serif",
      fontWeight: 400,
      color: "#fafafa",
    },
  },
  palette: {
    primary: {
      main: "#eccb34", // Orange for buttons, etc.
    },
    text: {
      primary: "#fafafa", // White text
      secondary: "#eccb34", // Orange for secondary text
    },
    background: {
      default: "#eccb34", // Orange background
      paper: "#fafafa", // White for cards, dialogs
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          fontFamily: "'Lato', sans-serif",
          fontWeight: 400,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          fontFamily: "'Lato', sans-serif",
          fontWeight: 400,
        },
      },
    },
  },
});

export default theme;
