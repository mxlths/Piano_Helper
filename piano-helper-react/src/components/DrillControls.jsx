import React from 'react';
import {
  Box,
  Typography,
  TextField, // For number inputs
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Stack, // For layout
} from '@mui/material';

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

  // Adapters for MUI component handlers which pass value directly
  const handleMuiNumberChange = (handler) => (event) => {
    handler(event); // Original handlers expect the event
  };

  const handleMuiSelectChange = (handler) => (event) => {
     handler(event); // Original handlers expect the event
  };

  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', p: 2, borderRadius: 1, ...style }}> 
      <Typography variant="h6" gutterBottom>Drill Controls</Typography>
      <Stack spacing={2}> {/* Main stack for controls and status */}
        {/* Stack for the controls row */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <TextField
             id="drill-octaves"
             label="Octaves (Range)"
             type="number"
             value={drillNumOctaves}
             onChange={handleMuiNumberChange(onDrillOctavesChange)}
             disabled={isDrillActive}
             inputProps={{ min: 1, max: 4 }} // Use inputProps for min/max
             sx={{ width: { xs: '100%', sm: 150 } }} // Responsive width
             size="small"
          />
          
          <FormControl sx={{ width: { xs: '100%', sm: 200 } }} size="small">
             <InputLabel id="drill-style-label">Style</InputLabel>
             <Select 
                labelId="drill-style-label"
                id="drill-style"
                value={drillStyle}
                label="Style"
                onChange={handleMuiSelectChange(onDrillStyleChange)}
                disabled={isDrillActive} 
             >
                {DRILL_STYLES.map(styleOpt => (
                    <MenuItem 
                       key={styleOpt.value} 
                       value={styleOpt.value}
                       disabled={styleOpt.value === 'thirds' && currentMode !== 'scale_display'}
                    >
                        {styleOpt.label}
                    </MenuItem>
                ))}
             </Select>
          </FormControl>
          
          <TextField
             id="drill-repetitions"
             label="Repetitions"
             type="number"
             value={drillRepetitions}
             onChange={handleMuiNumberChange(onDrillRepetitionsChange)}
             disabled={isDrillActive}
             inputProps={{ min: 1, max: 10 }}
             sx={{ width: { xs: '100%', sm: 120 } }}
             size="small"
          />

          <Button 
            variant="contained" 
            onClick={setIsDrillActive} // Directly use the toggle handler
            sx={{ width: { xs: '100%', sm: 'auto' } }} // Responsive width
          >
            {isDrillActive ? 'Stop Drill' : 'Start Drill'}
          </Button>
        </Stack>

        {/* Conditional Status Display */}
        {isDrillActive && (
          <Box sx={{ mt: 2, p: 1, border: '1px dashed', borderColor: 'grey.400', borderRadius: 1 }}>
             <Typography variant="body2" component="span" sx={{ mr: 1 }}>
                Step: {currentDrillStep?.stepIndex !== undefined ? currentDrillStep.stepIndex + 1 : '-'} / {currentDrillStep?.totalSteps || '-'} |
             </Typography>
             <Typography variant="body2" component="span">
                 Score: Correct: {drillScore?.correctNotes || 0}, Incorrect: {drillScore?.incorrectNotes || 0}
             </Typography>
             <Typography variant="body1" sx={{ fontWeight: 'bold', mt: 1 }}>
                 Current: {currentDrillStep?.stepLabel || 'Loading...'}
             </Typography>
             {/* Debug info can remain commented out */}
          </Box>
        )}
      </Stack>
    </Box>
  );
}

export default DrillControls; 