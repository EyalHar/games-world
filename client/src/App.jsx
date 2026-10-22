import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import AssociationGame from './pages/AssociationGame';
import EretzIr from './pages/EretzIr';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        {/* In RTL, first child = right side */}
        <Sidebar />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/associations" element={<AssociationGame />} />
            <Route path="/eretz-ir" element={<EretzIr />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
