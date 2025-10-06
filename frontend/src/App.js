import React, { useEffect, useState } from "react";

function App() {
  const [message, setMessage] = useState("Loading...");

  useEffect(() => {
    fetch("http://localhost:8000/api/hello/")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => setMessage(data.message))
      .catch((error) => {
        console.error("Error fetching API:", error);
        setMessage("Failed to connect to backend.");
      });
  }, []);

  return (
    <div style={{ textAlign: "center", marginTop: "50px", fontSize: "24px" }}>
      <h1>{message}</h1>
    </div>
  );
}

export default App;
