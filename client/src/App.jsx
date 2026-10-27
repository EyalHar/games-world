import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import AssociationGame from './pages/AssociationGame';
import EretzIr from './pages/EretzIr';
import Crossword from './pages/Crossword';
import FishHunt from './pages/FishHunt';
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
            <Route path="/crossword" element={<Crossword />} />
            <Route path="/fish" element={<FishHunt />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
