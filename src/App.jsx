import React from 'react';
import Board from './components/Board';
import './index.css';

function App() {
  return (
    <div className="app-container">
      <h1 className="heading-main">Cosmic Flow</h1>
      <div className="goal-input-container">
        <input
          type="text"
          className="goal-input"
          placeholder="Enter your goal..."
        />
      </div>

      <div className="context-controls">
        <select className="glass-select" defaultValue="">
          <option value="" disabled>Timeframe</option>
          <option value="1w">1 Week-1 Month</option>
          <option value="1m">1 Month-3 Months</option>
          <option value="3m">3 Months-6 Months</option>
          <option value="6m">6+ Months</option>
        </select>

        <select className="glass-select" defaultValue="">
          <option value="" disabled>Team Size</option>
          <option value="1">Solo</option>
          <option value="2-5">2-5 members</option>
          <option value="5+">5+ members</option>
        </select>

        <select className="glass-select" defaultValue="">
          <option value="" disabled>AI-Strictness</option>
          <option value="flexible">High level</option>
          <option value="balanced">Granular</option>

        </select>
      </div>

      <div className="action-container">
        <button className="generate-btn">GENERATE WORKFLOW</button>
      </div>

      <Board />
    </div>
  );
}

export default App;
