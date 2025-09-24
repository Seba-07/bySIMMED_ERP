import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { InventoryProvider } from './contexts/InventoryContext';
// Temporarily comment out SocketProvider until we fix socket issues
// import { SocketProvider } from './contexts/SocketContext';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard';
import InventoryList from './pages/InventoryList';
import InventoryForm from './pages/InventoryForm';
import ManufacturingOrders from './pages/ManufacturingOrders';
import ManufacturingOrderForm from './pages/ManufacturingOrderForm';
import ProductionQueue from './pages/ProductionQueue';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {/* Temporarily disable SocketProvider until connection is stable */}
      <InventoryProvider>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/inventory" element={<InventoryList />} />
              <Route path="/inventory/new" element={<InventoryForm />} />
              <Route path="/inventory/edit/:id" element={<InventoryForm />} />
              <Route path="/manufacturing-orders" element={<ManufacturingOrders />} />
              <Route path="/manufacturing-orders/new" element={<ManufacturingOrderForm />} />
              <Route path="/manufacturing-orders/edit/:id" element={<ManufacturingOrderForm />} />
              <Route path="/production-queue" element={<ProductionQueue />} />
            </Routes>
          </Layout>
        </Router>
      </InventoryProvider>
    </ThemeProvider>
  );
}

export default App;