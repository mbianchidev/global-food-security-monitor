import { HashRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import DashboardPage from './pages/DashboardPage';
import AlertsPage from './pages/AlertsPage';
import CountriesPage from './pages/CountriesPage';
import CountryDashboardPage from './pages/CountryDashboardPage';
import PricesPage from './pages/PricesPage';
import AboutPage from './pages/AboutPage';

export default function App() {
  return (
    <HashRouter>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 px-5 py-5 md:px-8">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/countries" element={<CountriesPage />} />
            <Route path="/country-stats" element={<CountryDashboardPage />} />
            <Route path="/prices" element={<PricesPage />} />
            <Route path="/about" element={<AboutPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </HashRouter>
  );
}
