import { UserProvider } from "../contexts/UserContext";
import { ThemeProvider } from "../contexts/ThemeContext";

const MyApp = ({ Component, pageProps }) => {
  if (loading) {
    return <div>Loading...</div>;
  }

  return <Component {...pageProps} />;
};

const AppWrapper = (props) => (
  <ThemeProvider>
    <UserProvider>
      <MyApp {...props} />
    </UserProvider>
  </ThemeProvider>
);

export default AppWrapper;
