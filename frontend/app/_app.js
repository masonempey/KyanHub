import { useEffect } from "react";
import { useRouter } from "next/router";
import { UserProvider, useUser } from "../contexts/UserContext";
import { ThemeProvider } from "../contexts/ThemeContext";

const MyApp = ({ Component, pageProps }) => {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user && router.pathname !== "/login") {
      router.push("/login");
    }
  }, [user, loading, router]);

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
