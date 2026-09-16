export const useSiteTheme = () => {
  const preference = useCookie<"light" | "dark">("site-theme", {
    default: () => "light",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    path: "/",
  });
  const theme = useState<"light" | "dark">("site-theme", () =>
    preference.value === "dark" ? "dark" : "light",
  );
  function toggleTheme() {
    theme.value = theme.value === "dark" ? "light" : "dark";
    preference.value = theme.value;
  }
  return { theme, toggleTheme };
};
