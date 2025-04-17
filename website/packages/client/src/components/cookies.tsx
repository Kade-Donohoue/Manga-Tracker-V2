import React, { useState } from "react";

const CookieBanner = () => {
  const [showBanner, setShowBanner] = useState(true);

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("cookie-consent", "true");
  };

  if (localStorage.getItem("cookie-consent") === "true") {
    return null;
  }

  return (
    showBanner && (
      <div style={{ position: "fixed", bottom: "0", left: "0", right: "0", background: "#333", color: "#fff", padding: "10px", textAlign: "center" }}>
        <p>This site uses cookies to keep you logged in. By using this site, you agree to our cookie policy.</p>
        <button onClick={handleDismiss}>Got it</button>
      </div>
    )
  );
};

export default CookieBanner;
