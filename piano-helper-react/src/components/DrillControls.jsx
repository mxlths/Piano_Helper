import React from 'react';

// Define styles outside the component if needed, e.g., copy from Controls if they were specific
const DRILL_STYLES = [
  { value: 'ascending', label: 'Ascending' },
  { value: 'descending', label: 'Descending' },
  { value: 'random', label: 'Random' },
  { value: 'thirds', label: 'Thirds (Scales Only)' }, // Label indicates restriction
];

function DrillControls({
  // Mode (needed for disabling thirds style)
  currentMode,
  // Drill Props
  isDrillActive,
  setIsDrillActive,
  drillNumOctaves,
  drillRepetitions,
  drillStyle,
  onDrillOctavesChange,
  onDrillRepetitionsChange,
  onDrillStyleChange,
  // Drill status display props
  currentDrillStep,
  drillScore,
  style // Allow passing style from App for flex layout
}) {

  // Note: Removed setDrillOptions prop as it seemed unused based on App.jsx logic
  // If it's needed, add it back here and pass from App.jsx

  return (
    <div style={{ border: '1px solid purple', padding: '10px', ...style }}> {/* Added border for visibility */}
      <h4>Drill Controls</h4>
      <div>
          <label htmlFor="drill-octaves" style={{ marginRight: '10px' }}>Octaves (Range):</label>
          <input 
             type="number" 
             id="drill-octaves" 
             value={drillNumOctaves} 
             onChange={onDrillOctavesChange} 
             min="1" 
             max="4" // Match limit in App.jsx
             disabled={isDrillActive} 
             style={{ width: '50px', marginRight: '20px' }}
          />

          {/* Drill Style Dropdown */}
           <label htmlFor="drill-style" style={{ marginRight: '10px' }}>Style:</label>
           <select 
              id="drill-style"
              value={drillStyle}
              onChange={onDrillStyleChange}
              disabled={isDrillActive} 
              style={{ marginRight: '20px' }}
           >
              {DRILL_STYLES.map(styleOpt => (
                  <option 
                     key={styleOpt.value} 
                     value={styleOpt.value}
                     // Disable "Thirds" if not in scale mode
                     disabled={styleOpt.value === 'thirds' && currentMode !== 'scale_display'}
                  >
                      {styleOpt.label}
                  </option>
              ))}
           </select>

           <label htmlFor="drill-repetitions" style={{ marginRight: '10px' }}>Repetitions:</label>
           <input 
              type="number" 
              id="drill-repetitions" 
              value={drillRepetitions} 
              onChange={onDrillRepetitionsChange} 
              min="1" 
              max="10" // Match limit in App.jsx
              disabled={isDrillActive}
              style={{ width: '50px', marginRight: '20px' }}
           />

           <button onClick={setIsDrillActive} style={{ marginLeft: '20px' }}>
               {isDrillActive ? 'Stop Drill' : 'Start Drill'}
           </button>
      </div>
      {isDrillActive && (
          <div style={{ marginTop: '10px' }}>
             <span>Step: {currentDrillStep?.stepIndex !== undefined ? currentDrillStep.stepIndex + 1 : '-'} / {currentDrillStep?.totalSteps || '-'} | </span>
              <span>Score: Correct: {drillScore?.correctNotes || 0}, Incorrect: {drillScore?.incorrectNotes || 0}</span>
              <p style={{ fontWeight: 'bold', marginTop: '5px' }}>
                 Current: {currentDrillStep?.stepLabel || 'Loading...'}
              </p>
              {/* Optionally display expected notes for debugging:
              <p>Expected: {currentDrillStep?.expectedMidiNotes?.join(', ')}</p>
              */}
         </div>
      )}
    </div>
  );
}

export default DrillControls; 