const urlParams = new URLSearchParams(window.location.search);
const examId = urlParams.get('id');

let examData = null;
let currentAnswers = {};
let warningCount = 0;
let timerInterval;
let stream = null;
let isSubmitting = false;
let faceDetectionInterval;
let snapshotInterval;
let modelsLoaded = false;
let lastViolationTime = 0;
let examStartedAt = 0;
let snapshotIntervalCnt = 0;
let violations = { noFace: 0, multipleFaces: 0, tabSwitch: 0, cameraOff: 0, copyPaste: 0, rightClick: 0, deviceChange: 0, cellPhone: 0 };
let faceMissingStartTime = null;
let gazeAwayStartTime = null;
const TOLERANCE_THRESHOLD = 7000; // 7 seconds tolerance

document.addEventListener('DOMContentLoaded', () => {
    checkAuth('Student');
    if (!examId) {
        console.error('Invalid exam URL');
        window.location.href = 'student-dashboard.html';
        return;
    }

    document.getElementById('requestPermissionBtn').addEventListener('click', startProcess);
    document.getElementById('submitExamBtn').addEventListener('click', () => submitExam(false));

    // Prevent keyboard shortcuts for copy/paste
    document.addEventListener('keydown', (e) => {
        // Block Ctrl+C, Ctrl+V, Ctrl+A, Ctrl+X, Ctrl+S, Ctrl+U (view source)
        if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'a', 'x', 's', 'u'].includes(e.key.toLowerCase())) {
            e.preventDefault();
            showProctoringWarning('Keyboard shortcuts are disabled during exam');
        }
    });

    // Prevent going back
    history.pushState(null, null, window.location.href);
    window.onpopstate = function () {
        history.pushState(null, null, window.location.href);
    };

    // Disable Right-Click
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        handleViolation('RIGHT_CLICK', 'Right-click is disabled during the exam.');
    });

    // Detect Copy, Paste, and Cut
    document.addEventListener('copy', (e) => {
        e.preventDefault();
        handleViolation('COPY_PASTE', 'Copying content is prohibited.');
    });
    document.addEventListener('paste', (e) => {
        e.preventDefault();
        handleViolation('COPY_PASTE', 'Pasting content is prohibited.');
    });
    document.addEventListener('cut', (e) => {
        e.preventDefault();
        handleViolation('COPY_PASTE', 'Cutting content is prohibited.');
    });

    // Detect Device Changes (Unplugging camera/mic)
    navigator.mediaDevices.ondevicechange = function(event) {
        handleViolation('DEVICE_CHANGE', 'Hardware device change detected (e.g., camera/mic unplugged).');
    };

    // Prevent violations during window closing
    window.addEventListener('beforeunload', () => {
        isSubmitting = true;
    });

    loadModels();
});

async function loadModels() {
    const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
    try {
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        modelsLoaded = true;
        console.log('AI Proctoring models loaded with landmarks');
    } catch (err) {
        console.error('Failed to load AI models:', err);
    }
}

async function startProcess() {
    const errObj = document.getElementById('permissionError');
    errObj.textContent = '';

    try {
        // Request Camera
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        const video = document.getElementById('camera-preview');
        video.srcObject = stream;

        // Monitor if camera stream stops
        stream.getVideoTracks()[0].onended = () => {
            handleCameraViolation('CAMERA_OFF', 'Camera access was revoked.');
        };
        video.onpause = () => {
            handleCameraViolation('CAMERA_OFF', 'Video stream paused.');
        };

        // Go fullscreen
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            await elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) { /* Safari */
            await elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) { /* IE11 */
            await elem.msRequestFullscreen();
        }

        // Setup Anti-cheat visibility change
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Monitor Fullscreen Exit
        document.addEventListener('fullscreenchange', handleFullscreenChange);

        // Monitor Window Blur (loss of focus)
        window.addEventListener('blur', () => {
            handleViolation('WINDOW_BLUR', 'Window lost focus');
        });

        document.getElementById('permissionOverlay').style.display = 'none';
        document.getElementById('examContent').style.display = 'flex';
        examStartedAt = Date.now();

        updateUIStatus();
        loadAndRenderExam();
        
        // Ensure video is playing before starting face detection
        video.play().then(() => {
            startFaceDetection();
        }).catch(err => {
            console.error('Video play error', err);
        });
        
    } catch (err) {
        console.error('Permission error:', err);
        errObj.textContent = 'Camera access is required to attend the exam. Please grant permission.';
    }
}

function handleCameraViolation(type, reason) {
    document.getElementById('cameraStatus').textContent = 'OFF';
    document.getElementById('cameraStatus').style.color = '#ef4444';
    handleViolation(type, `Camera problem: ${reason}`);
    
    // Auto submission DISABLED per requirements
    // if (!isSubmitting) submitExam(true, 'Camera access disconnected.');
}

function startFaceDetection() {
    const video = document.getElementById('camera-preview');

    faceDetectionInterval = setInterval(async () => {
        if (!modelsLoaded || isSubmitting || video.paused || video.ended || !video.srcObject) return;

        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks();
        const count = detections.length;
        const faceStatusEl = document.getElementById('faceStatus');

        if (count === 0) {
            const isTyping = document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA');
            
            if (isTyping) {
                // If they are typing, we are much more lenient or reset the timer
                // because they might be looking at the keyboard
                faceMissingStartTime = null; 
                faceStatusEl.textContent = 'Typing...';
                faceStatusEl.style.color = '#10b981';
            } else {
                if (!faceMissingStartTime) faceMissingStartTime = Date.now();
                
                const duration = Date.now() - faceMissingStartTime;
                if (duration > TOLERANCE_THRESHOLD) {
                    faceStatusEl.textContent = 'Not Detected';
                    faceStatusEl.style.color = '#ef4444';
                    handleViolation('NO_FACE', 'Please keep your face visible in the frame.');
                    faceMissingStartTime = Date.now(); 
                } else {
                    faceStatusEl.textContent = 'Face Missing...';
                    faceStatusEl.style.color = '#f59e0b';
                }
            }
            gazeAwayStartTime = null; // Reset gaze if face is missing
        } else {
            faceMissingStartTime = null; 
            
            if (count > 1) {
                faceStatusEl.textContent = 'Multiple Faces';
                faceStatusEl.style.color = '#ef4444';
                handleViolation('MULTIPLE_FACES', 'Please ensure only one person is in view.');
            } else {
                // Check Gaze / Orientation
                const landmarks = detections[0].landmarks;
                const nose = landmarks.getNose();
                const leftEye = landmarks.getLeftEye();
                const rightEye = landmarks.getRightEye();

                // Simple gaze check: compare horizontal position of nose between eyes
                // (Center should be approx 0.5)
                const leftDist = Math.abs(nose[0].x - leftEye[0].x);
                const rightDist = Math.abs(nose[0].x - rightEye[3].x);
                const ratio = leftDist / (leftDist + rightDist);

                const isLookingAway = ratio < 0.3 || ratio > 0.7;
                const isTyping = document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA');

                if (isLookingAway && !isTyping) { 
                    if (!gazeAwayStartTime) gazeAwayStartTime = Date.now();
                    const gazeDuration = Date.now() - gazeAwayStartTime;
                    
                    if (gazeDuration > 15000) { // 15 seconds tolerance for gaze
                        faceStatusEl.textContent = 'Looking Away';
                        faceStatusEl.style.color = '#ef4444';
                        handleViolation('SUSPICIOUS_GAZE', 'Please keep your focus on the exam screen.');
                        gazeAwayStartTime = Date.now();
                    } else {
                        faceStatusEl.textContent = 'Keep focus...';
                        faceStatusEl.style.color = '#f59e0b';
                    }
                } else {
                    gazeAwayStartTime = null;
                    if (detections[0].detection.score < 0.5) {
                        faceStatusEl.textContent = 'Low Confidence';
                        faceStatusEl.style.color = '#f59e0b';
                    } else {
                        faceStatusEl.textContent = 'Detected';
                        faceStatusEl.style.color = '#10b981';
                    }
                }
            }
        }

        // Periodic Snapshot (Every 30 cycles = 30 seconds if interval is 1000ms)
        snapshotIntervalCnt++;
        if (snapshotIntervalCnt >= 30) {
            takeSnapshot('PERIODIC');
            snapshotIntervalCnt = 0;
        }
    }, 1000); 
}

async function takeSnapshot(reason) {
    if (isSubmitting) return;

    const video = document.getElementById('camera-preview');
    const canvas = document.getElementById('snapshot-canvas');
    if (!video.srcObject || video.paused || video.ended) return;

    try {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');

        await fetchAPI('/snapshots', {
            method: 'POST',
            body: {
                examId,
                image: dataUrl,
                triggerReason: reason
            }
        });
    } catch (e) {
        console.error('Error taking snapshot', e);
    }
}


function updateUIStatus() {
    const vc = document.getElementById('violationCount');
    if (vc) {
        vc.textContent = warningCount;
    }
}

function showProctoringWarning(message) {
    const el = document.getElementById('proctoringWarning');
    if (!el) return;
    
    el.textContent = message;
    el.style.display = 'block';
    
    // Trigger animation reset
    el.style.animation = 'none';
    el.offsetHeight; 
    el.style.animation = null;

    // Auto hide after 3.5s
    setTimeout(() => {
        if (el.textContent === message) {
            el.style.display = 'none';
        }
    }, 3500);
}

async function handleViolation(type, message) {
    const now = Date.now();
    
    // 1. Ignore violations if we are currently submitting
    if (isSubmitting) return;

    // 2. Ignore violations during the first 10 seconds of the exam (initialization grace period)
    const gracePeriod = 10000; 
    if (examStartedAt > 0 && (now - examStartedAt < gracePeriod)) {
        console.log(`Ignoring violation ${type} during start-up grace period.`);
        return;
    }

    // Define cooldown behavior:
    // 1. Loop-based AI checks (Face, Gaze) need a 5s cooldown to prevent spam.
    // 2. Event-based checks (Tab Switch, Fullscreen) should have almost no cooldown (0.5s) to be accurate.
    const loopChecks = ['NO_FACE', 'MULTIPLE_FACES', 'SUSPICIOUS_GAZE'];
    const cooldown = loopChecks.includes(type) ? 5000 : 500; 

    if (now - lastViolationTime < cooldown) {
        return;
    }
    lastViolationTime = now;

    // Track specific violations
    if (type === 'NO_FACE') violations.noFace += 1;
    else if (type === 'MULTIPLE_FACES') violations.multipleFaces += 1;
    else if (type === 'TAB_SWITCH') violations.tabSwitch += 1;
    else if (type === 'CAMERA_OFF') violations.cameraOff += 1;
    else if (type === 'COPY_PASTE') violations.copyPaste += 1;
    else if (type === 'RIGHT_CLICK') violations.rightClick += 1;
    else if (type === 'DEVICE_CHANGE') violations.deviceChange += 1;

    warningCount++;
    updateUIStatus();
    
    console.warn(`Violation: ${message}`);
    showProctoringWarning(message);
    
    // Capture evidence
    takeSnapshot(type);
    logViolationToBackend(type);

    // Auto-submission RE-ENABLED per latest request
    if (warningCount >= 3) {
         showProctoringWarning('Maximum violations reached. Disqualifying exam...');
         setTimeout(() => submitExam(true, 'Maximum violation count reached.'), 2000);
    }
}

async function loadAndRenderExam() {
    try {
        const response = await fetchAPI(`/exams/${examId}/start`);

        if (response.alreadySubmitted) {
            showResultsAndClose(response.submission);
            return;
        }

        examData = response;
        document.getElementById('examTitle').textContent = examData.exam.title;
        document.getElementById('examSubject').textContent = examData.exam.subject;

        // Restore answers if any
        const saved = localStorage.getItem(`exam_${examId}_answers`);
        if (saved) currentAnswers = JSON.parse(saved);

        renderQuestions();
        startTimer(examData.exam.duration);
    } catch (err) {
        console.error(err.message);
        showProctoringWarning(`Error: ${err.message}`);
        setTimeout(() => window.close(), 3000); 
    }
}

function showResultsAndClose(submission) {
    document.getElementById('permissionOverlay').style.display = 'none';
    document.getElementById('examContent').style.display = 'none';

    const resultsContainer = document.getElementById('resultsContainer');
    resultsContainer.style.display = 'block';

    const detail = document.getElementById('resultsDetail');
    detail.innerHTML = `
        <p><strong>Exam:</strong> ${examId}</p>
        <p><strong>Score:</strong> ${submission.score}</p>
        <p><strong>Correct:</strong> ${submission.correctCount}</p>
        <p><strong>Incorrect:</strong> ${submission.incorrectCount}</p>
        <div style="color: #10b981; font-weight: 600; margin-top:10px;">Already ${submission.autoSubmitted ? 'Auto-Submitted (Violations)' : 'Submitted'}</div>
    `;

    let countdown = 10;
    const countdownElem = document.getElementById('closeCountdown');

    const interval = setInterval(() => {
        countdown--;
        countdownElem.textContent = countdown;
        if (countdown <= 0) {
            clearInterval(interval);
            window.close();
        }
    }, 1000);
}

function renderQuestions() {
    const container = document.getElementById('questionsContainer');
    container.innerHTML = '';

    examData.questions.forEach((q, index) => {
        const qCard = document.createElement('div');
        qCard.className = 'glass-container question-card';
        qCard.innerHTML = `<h3>Q${index + 1}: ${q.question}</h3>`;

        if (q.type === 'mcq') {
            const opts = document.createElement('div');
            opts.className = 'options-container';
            q.options.forEach(opt => {
                const checked = currentAnswers[q._id] === opt ? 'checked' : '';
                opts.innerHTML += `
                    <label class="option-label">
                        <input type="radio" name="${q._id}" value="${opt}" ${checked} onchange="saveAnswer('${q._id}', '${opt}')">
                        ${opt}
                    </label>
                `;
            });
            qCard.appendChild(opts);
        } else if (q.type === 'fill_blank') {
            const val = currentAnswers[q._id] || '';
            qCard.innerHTML += `
                <input type="text" class="fill-blank-input" value="${val}" onkeyup="saveAnswer('${q._id}', this.value)" placeholder="Type your answer here...">
            `;
        }

        container.appendChild(qCard);
    });
}

function saveAnswer(qId, val) {
    currentAnswers[qId] = val;
    localStorage.setItem(`exam_${examId}_answers`, JSON.stringify(currentAnswers));
}

function startTimer(minutes) {
    let timeLeft = minutes * 60;
    const timerElem = document.getElementById('timer');

    timerInterval = setInterval(() => {
        timeLeft--;
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            timerElem.textContent = "00:00";
            submitExam(true, 'Time is up! Auto-submitting.');
            return;
        }
        const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
        const s = (timeLeft % 60).toString().padStart(2, '0');
        timerElem.textContent = `${m}:${s}`;
    }, 1000);
}

async function logViolationToBackend(type) {
    try {
        await fetchAPI('/violations', {
            method: 'POST',
            body: {
                examId,
                violationType: type
            }
        });
        console.log(`Violation logged: ${type}`);
    } catch (err) {
        console.error('Failed to log violation:', err);
    }
}

function handleVisibilityChange() {
    if (document.hidden) {
        handleViolation('TAB_SWITCH', 'Switched to another tab or application.');
    }
}

function handleFullscreenChange() {
    if (!document.fullscreenElement) {
        handleViolation('EXIT_FULLSCREEN', 'Exited fullscreen mode.');

        // Automatically re-request fullscreen without showing alerts
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen().catch(err => console.error('Full screen request failed:', err));
        }
    }
}

async function submitExam(autoSubmitted = false, reason = '') {
    if (isSubmitting) return;

    isSubmitting = true;
    clearInterval(timerInterval);

    // Stop camera
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
    if (faceDetectionInterval) clearInterval(faceDetectionInterval);
    if (snapshotInterval) clearInterval(snapshotInterval);

    const answers = Object.keys(currentAnswers).map(qId => ({
        questionId: qId,
        answer: currentAnswers[qId]
    }));

    try {
        const response = await fetchAPI(`/exams/${examId}/submit`, {
            method: 'POST',
            body: { answers, autoSubmitted }
        });
        localStorage.removeItem(`exam_${examId}_answers`);

        // Show results and auto-close
        showResultsAndClose(response.submission);
    } catch (err) {
        console.error('Error submitting: ' + err.message);
        showProctoringWarning('Submission failed. Retrying...');
        isSubmitting = false; 
    }
}

