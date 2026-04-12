export function getAppChromeLayout(view) {
  if (view === "teacher") {
    return {
      heroVariant: "compact",
      showSupportNotice: false,
    };
  }

  return {
    heroVariant: "full",
    showSupportNotice: true,
  };
}
