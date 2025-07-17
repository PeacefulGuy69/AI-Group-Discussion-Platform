import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CreateSession from './pages/CreateSession';
import JoinSession from './pages/JoinSession';
import SessionRoom from './pages/SessionRoom';
import Analysis from './pages/Analysis';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <div className="App">
            <Navbar />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/create-session" element={
                <ProtectedRoute>
                  <CreateSession />
                </ProtectedRoute>
              } />
              <Route path="/join/:shareLink" element={<JoinSession />} />
              <Route path="/session/:sessionId" element={
                <ProtectedRoute>
                  <SessionRoom />
                </ProtectedRoute>
              } />
              <Route path="/analysis/:sessionId" element={
                <ProtectedRoute>
                  <Analysis />
                </ProtectedRoute>
              } />
            </Routes>
          </div>
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
