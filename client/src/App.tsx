import { useEffect, useState } from "react";
import { getHealth } from "./api/client";

type HealthResponse = {
  status: string;
  message: string;
};

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch(() => {
        setError("Unable to connect to ProjectFlow API");
      });
  }, []);

  return (
    <div>
      <h1>ProjectFlow</h1>

      <p>Project management platform</p>

      <h2>API Status</h2>

      {health && (
        <p>
          {health.status}: {health.message}
        </p>
      )}

      {error && <p>{error}</p>}
    </div>
  );
}

export default App;
