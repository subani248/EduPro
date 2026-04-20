const Snapshot = require('../models/Snapshot');
const Violation = require('../models/Violation');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const saveSnapshot = async (req, res) => {
  try {
    const { examId, image, triggerReason } = req.body;
    if (!examId || !image) {
      return res.status(400).json({ message: 'Missing examId or image data' });
    }

    if (!req.user || !req.user._id) {
       return res.status(401).json({ message: 'User not authenticated' });
    }

    // image is expected to be a base64 string: data:image/png;base64,iVBORw0KGgo...
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Save locally
    const filename = `snapshot_${req.user._id}_${Date.now()}.png`;
    const uploadsDir = path.join(__dirname, '../../frontend/uploads/snapshots');
    
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, buffer);
    
    const imageUrl = `/uploads/snapshots/${filename}`;
    
    const snapshot = await Snapshot.create({
      examId,
      studentId: req.user._id,
      imageUrl,
      triggerReason: triggerReason || 'PERIODIC'
    });

    // Run AI Analysis in background
    runAIAnalysis(filePath, examId, req.user._id);
    
    res.status(201).json(snapshot);
  } catch (error) {
    console.error('Error saving snapshot:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const getSnapshots = async (req, res) => {
  try {
    const snapshots = await Snapshot.find()
      .populate('studentId', 'name roll_number email')
      .populate('examId', 'title')
      .sort({ timestamp: -1 });
    res.json(snapshots);
  } catch (error) {
    console.error('Error fetching snapshots:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const runAIAnalysis = (imagePath, examId, studentId) => {
  const pythonCmd = process.platform === 'win32' ? 'py' : 'python3';
  
  const pythonProcess = spawn(pythonCmd, [
    path.join(__dirname, '../ai_engine/main.py'),
    imagePath
  ]);

  let stdoutData = "";

  pythonProcess.stdout.on('data', (data) => {
    stdoutData += data.toString();
  });

  pythonProcess.on('close', async (code) => {
    if (code !== 0) {
      console.warn(`AI Process exited with code ${code}`);
    }

    try {
      // Find the JSON part in case there were warnings/downloads printed
      const jsonMatch = stdoutData.match(/\{"faceCount".*?\}/);
      if (jsonMatch) {
        const results = JSON.parse(jsonMatch[0]);
        if (results.violations && results.violations.length > 0) {
          for (const vType of results.violations) {
            await Violation.create({
              studentId,
              examId,
              violationType: vType,
              timestamp: new Date()
            });
          }
        }
      } else {
        // Try parsing the whole thing if regex didn't match
        try {
           const results = JSON.parse(stdoutData.trim());
           // same logic ...
        } catch (e) {
           // Silent fail for non-JSON logs
        }
      }
    } catch (e) {
      console.error('Error processing AI results:', e.message);
    }
  });

  pythonProcess.stderr.on('data', (data) => {
    const errStr = data.toString();
    if (errStr.toLowerCase().includes('downloading')) return; // Ignore download logs
    console.error('AI Processing Error:', errStr);
  });
};


module.exports = { saveSnapshot, getSnapshots };
