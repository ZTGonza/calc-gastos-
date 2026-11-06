/** Componente raíz: instala el proveedor visual y monta la navegación principal. */
import "./App.css";
import MainPage from "./pages/MainPage.jsx";
import { ThemeProvider } from "./hooks/ThemeProvider.jsx";

export default function App() {
  return (
    <ThemeProvider>
      <MainPage />
    </ThemeProvider>
  );
}
