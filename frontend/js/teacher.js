document.addEventListener('DOMContentLoaded', () => {
    const user = checkAuth('Teacher');
    if (user) {
        document.getElementById('userName').textContent = `Welcome, ${user.name}`;
        loadExams();
        loadViolations();
        loadSnapshots();
    }

    const createExamForm = document.getElementById('createExamForm');
    if (createExamForm) {
        createExamForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                title: document.getElementById('examTitle').value,
                subject: document.getElementById('examSubject').value,
                duration: document.getElementById('examDuration').value,
                startTime: document.getElementById('examStartTime').value,
                endTime: document.getElementById('examEndTime').value,
            };
            try {
                await fetchAPI('/exams', {
                    method: 'POST',
                    body: payload
                });
                alert('Exam Created!');
                hideModal('createExamModal');
                loadExams();
            } catch (err) {
                alert(err.message);
            }
        });
    }
});

function showModal(id) { document.getElementById(id).style.display = 'flex'; }
function hideModal(id) { document.getElementById(id).style.display = 'none'; }

async function loadExams() {
    try {
        const exams = await fetchAPI('/exams');
        const container = document.getElementById('examList');
        const selectContainer = document.getElementById('examSelectForQuestions');
        container.innerHTML = '';
        selectContainer.innerHTML = '<option value="">Select Exam</option>';

        exams.forEach(exam => {
            // For card
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <h3>${exam.title} (${exam.subject})</h3>
                <p>Duration: ${exam.duration} mins</p>
                <p>Start: ${new Date(exam.startTime).toLocaleString()}</p>
                <p>End: ${new Date(exam.endTime).toLocaleString()}</p>
                <div style="display:flex;gap:10px;margin-top:10px;">
                    <button class="btn btn-secondary" onclick="viewResults('${exam._id}', '${exam.title.replace(/'/g, "\\'")}')">Results</button>
                </div>
            `;
            container.appendChild(card);

            // For select
            const option = document.createElement('option');
            option.value = exam._id;
            option.textContent = `${exam.title} (${exam.subject})`;
            selectContainer.appendChild(option);
        });
    } catch (err) {
        console.error(err);
    }
}


async function uploadStudents() {
    const file = document.getElementById('studentsCsv').files[0];
    if (!file) return alert('Please select a file');
    const formData = new FormData();
    formData.append('file', file);

    try {
        const res = await fetchAPI('/upload/students', {
            method: 'POST',
            body: formData
        });
        alert(res.message);
    } catch (err) {
        alert(err.message);
    }
}

async function uploadQuestions() {
    const file = document.getElementById('questionsCsv').files[0];
    const examId = document.getElementById('examSelectForQuestions').value;
    if (!file || !examId) return alert('Please select an exam and a file');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('examId', examId);

    try {
        const res = await fetchAPI('/upload/questions', {
            method: 'POST',
            body: formData
        });
        alert(res.message);
    } catch (err) {
        alert(err.message);
    }
}

async function viewResults(examId, examTitle) {
    try {
        const results = await fetchAPI(`/exams/results?examId=${examId}`);
        const container = document.getElementById('resultsTableContainer');
        const modalHeading = document.querySelector('#viewResultsModal h2');
        if (modalHeading) modalHeading.innerText = `Results: ${examTitle || 'Exam'}`;

        // Setup Download Buttons
        const downloadBtn = document.getElementById('downloadResultsBtn');
        const downloadPDFBtn = document.getElementById('downloadPDFBtn');
        if (results.length > 0) {
            downloadBtn.style.display = 'block';
            downloadBtn.onclick = () => downloadResultsCSV(results, `results_${examTitle}.csv`, examTitle);

            downloadPDFBtn.style.display = 'block';
            downloadPDFBtn.onclick = () => downloadResultsPDF(results, `results_${examTitle}.pdf`, examTitle);
        } else {
            downloadBtn.style.display = 'none';
            downloadPDFBtn.style.display = 'none';
        }

        if (results.length === 0) {
            container.innerHTML = '<p>No submissions yet.</p>';
        } else {
            let html = `<table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Roll No</th>
                        <th>Score</th>
                        <th>Correct</th>
                        <th>Auto Submitted</th>
                    </tr>
                </thead>
                <tbody>`;
            results.forEach(r => {
                html += `
                    <tr>
                        <td>${r.studentId?.name || 'N/A'}</td>
                        <td>${r.studentId?.email || 'N/A'}</td>
                        <td>${r.studentId?.roll_number || 'N/A'}</td>
                        <td>${r.score}</td>
                        <td>${r.correctCount} / ${r.correctCount + r.incorrectCount}</td>
                        <td>${r.autoSubmitted ? 'Yes' : 'No'}</td>
                    </tr>
                `;
            });
            html += `</tbody></table>`;
            container.innerHTML = html;
        }
        showModal('viewResultsModal');
    } catch (err) {
        alert(err.message);
    }
}

function downloadResultsCSV(data, filename, examTitle) {
    const headers = ['Name', 'Email', 'Roll_Number', 'Score', 'Correct', 'Incorrect', 'Auto_Submitted'];
    const rows = data.map(r => [
        `"${r.studentId?.name || 'N/A'}"`,
        `"${r.studentId?.email || 'N/A'}"`,
        `"${r.studentId?.roll_number || 'N/A'}"`,
        r.score,
        r.correctCount,
        r.incorrectCount,
        r.autoSubmitted ? 'Yes' : 'No'
    ]);

    const examHeading = [`"Examination: ${examTitle || 'Results Report'}"`];
    const csvContent = [examHeading, [], headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function downloadResultsPDF(data, filename, examTitle) {
    if (typeof window.jspdf === 'undefined') {
        alert("PDF library failed to load. Please check your internet connection.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Add Title
    doc.setFontSize(18);
    doc.text(`Results: ${examTitle || 'Examination Report'}`, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

    const headers = [['Name', 'Email', 'Roll Number', 'Score', 'Correct', 'Auto Submitted']];
    const rows = data.map(r => [
        r.studentId?.name || 'N/A',
        r.studentId?.email || 'N/A',
        r.studentId?.roll_number || 'N/A',
        r.score.toString(),
        `${r.correctCount} / ${r.correctCount + r.incorrectCount}`,
        r.autoSubmitted ? 'Yes' : 'No'
    ]);

    doc.autoTable({
        head: headers,
        body: rows,
        startY: 35,
        theme: 'striped',
        headStyles: { fillStyle: '#1e3a8a' },
        styles: { fontSize: 9 }
    });

    doc.save(filename);
}
async function loadViolations() {
    try {
        const violations = await fetchAPI('/violations');
        const container = document.getElementById('violationLogsContainer');

        if (violations.length === 0) {
            container.innerHTML = '<p style="text-align:center; opacity:0.6;">No violations recorded yet.</p>';
            return;
        }

        // Group by student for better visualization if needed, but here we show a chronological list as requested
        let html = `<table>
            <thead>
                <tr>
                    <th>Student Name</th>
                    <th>Roll No</th>
                    <th>Exam</th>
                    <th>Violation Type</th>
                    <th>Timestamp</th>
                </tr>
            </thead>
            <tbody>`;

        violations.forEach(v => {
            let typeColor = '#ff4d4d'; // default red
            if (v.violationType === 'WINDOW_BLUR' || v.violationType === 'TAB_SWITCH') typeColor = '#facc15'; // yellow/amber
            if (v.violationType === 'MULTIPLE_FACES' || v.violationType === 'EXIT_FULLSCREEN') typeColor = '#ef4444'; // red
            if (v.violationType === 'NO_FACE') typeColor = '#ec4899'; // pink
            if (v.violationType === 'SUSPICIOUS_GAZE') typeColor = '#a855f7'; // purple
            if (v.violationType === 'COPY_PASTE' || v.violationType === 'RIGHT_CLICK') typeColor = '#f97316'; // orange
            if (v.violationType === 'DEVICE_CHANGE') typeColor = '#06b6d4'; // cyan
            if (v.violationType.includes('DETECTED')) typeColor = '#c026d3'; // fuchsia for phone/book

            html += `
                <tr>
                    <td>${v.studentId?.name || 'N/A'}</td>
                    <td>${v.studentId?.roll_number || 'N/A'}</td>
                    <td>${v.examId?.title || 'N/A'}</td>
                    <td style="color:${typeColor}; font-weight:bold;">${v.violationType}</td>
                    <td>${new Date(v.timestamp).toLocaleString()}</td>
                </tr>
            `;
        });

        html += `</tbody></table>`;
        container.innerHTML = html;
    } catch (err) {
        console.error('Error loading violations:', err);
        document.getElementById('violationLogsContainer').innerHTML = '<p style="color:#ff4d4d">Error loading violations.</p>';
    }
}

async function loadSnapshots() {
    try {
        const snapshots = await fetchAPI('/snapshots');
        const container = document.getElementById('snapshotsContainer');
        
        if (!snapshots || snapshots.length === 0) {
            container.innerHTML = '<p style="text-align:center; opacity:0.6; width:100%">No snapshots captured yet.</p>';
            return;
        }

        let html = '';
        snapshots.forEach(s => {
            html += `
                <div class="card" style="display:flex; flex-direction:column; align-items:center; text-align:center;">
                    <img src="${s.imageUrl}" alt="Snapshot" style="width:100%; max-width:300px; border-radius:8px; margin-bottom:10px; border:2px solid ${s.triggerReason === 'PERIODIC' ? '#3b82f6' : '#ef4444'};">
                    <h4 style="margin:5px 0;">${s.studentId?.name || 'Unknown'} (${s.studentId?.roll_number || 'N/A'})</h4>
                    <p style="margin:3px 0; font-size:0.9rem;">Exam: ${s.examId?.title || 'Unknown'}</p>
                    <p style="margin:3px 0; font-size:0.85rem; color:${s.triggerReason === 'PERIODIC' ? '#60a5fa' : '#f87171'}; font-weight:bold;">Trigger: ${s.triggerReason}</p>
                    <p style="margin:3px 0; font-size:0.8rem; opacity:0.8;">${new Date(s.timestamp).toLocaleString()}</p>
                </div>
            `;
        });
        
        container.innerHTML = html;
        container.style.display = 'grid';
        container.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
        container.style.gap = '20px';
    } catch (err) {
        console.error('Error loading snapshots:', err);
        document.getElementById('snapshotsContainer').innerHTML = '<p style="color:#ff4d4d">Error loading snapshots.</p>';
    }
}
