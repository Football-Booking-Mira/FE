import { rootRoutes } from "@/routes";
import { useRoutes } from "react-router";

function App() {
  const router = useRoutes(rootRoutes);
  return router;
}

export default App;
