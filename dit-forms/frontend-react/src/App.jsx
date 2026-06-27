import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './lib/auth';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Forms from './pages/Forms';
import FormBuilder from './pages/FormBuilder';
import Submissions from './pages/Submissions';
import SubmissionDetail from './pages/SubmissionDetail';
import HandoutOrders from './pages/HandoutOrders';
import Payments from './pages/Payments';
import PublicForm from './pages/PublicForm';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/form/:id" element={<PublicForm />} />

          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/students" element={<Students />} />
            <Route path="/forms" element={<Forms />} />
            <Route path="/forms/builder" element={<FormBuilder />} />
            <Route path="/submissions" element={<Submissions />} />
            <Route path="/submissions/:id" element={<SubmissionDetail />} />
            <Route path="/handouts" element={<HandoutOrders />} />
            <Route path="/payments" element={<Payments />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { borderRadius: '12px', background: '#1f2937', color: '#f9fafb', fontSize: '14px' },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
    </BrowserRouter>
  );
}
