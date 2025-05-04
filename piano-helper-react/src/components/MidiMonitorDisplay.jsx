import React from 'react';

function MidiMonitorDisplay({ logMessages = [] }) {
  // TODO: Receive log messages and device lists as props and display them
  return (
    <div style={{ 
        border: '1px solid red', 
        padding: '10px', 
        margin: '10px 0',
        height: '150px',
        overflowY: 'scroll',
        fontFamily: 'monospace',
        fontSize: '12px',
        backgroundColor: '#f0f0f0' // Simple background for now
        }}>
      <h2>MIDI Monitor</h2>
      {/* Display log messages */}
      {logMessages.length > 0 ? (
        logMessages.map((msg, index) => (
          <div key={index}>{msg}</div> // Use index as key for simple log list
        ))
      ) : (
        <p>Waiting for MIDI logs...</p>
      )}
    </div>
  );
}

export default MidiMonitorDisplay; 