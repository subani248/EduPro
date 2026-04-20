document.addEventListener('DOMContentLoaded', () => {
    const user = checkAuth('Student');
    if(user) {
        document.getElementById('userName').textContent = `Welcome, ${user.name}`;
        loadExams();
        loadResults();
    }
});

async function loadExams() {
    try {
        const exams = await fetchAPI('/exams');
        const container = document.getElementById('examList');
        container.innerHTML = '';
        
        exams.forEach(exam => {
            const card = document.createElement('div');
            card.className = 'card';
            const now = new Date();
            const start = new Date(exam.startTime);
            const end = new Date(exam.endTime);
            
            let status = 'Upcoming';
            let actionText = '';
            let btnClass = 'btn btn-secondary';
            let disabled = true;
            
            if (now >= start && now <= end) {
                status = '<span style="color:#10b981;">Active</span>';
                actionText = 'Start Exam';
                btnClass = 'btn';
                disabled = false;
            } else if (now > end) {
                status = '<span style="color:#ef4444;">Ended</span>';
                actionText = 'Missed / Ended';
            } else {
                actionText = `Starts at ${start.toLocaleString()}`;
            }

            card.innerHTML = `
                <h3>${exam.title} (${exam.subject})</h3>
                <p>Status: ${status}</p>
                <p>Duration: ${exam.duration} mins</p>
                <button class="${btnClass}" ${disabled ? 'disabled' : ''} onclick="startExam('${exam._id}')">${actionText}</button>
            `;
            container.appendChild(card);
        });
    } catch(err) {
        console.error(err);
    }
}

async function loadResults() {
    try {
        const results = await fetchAPI('/exams/results');
        const container = document.getElementById('resultsTableContainer');
        if(results.length === 0) {
            container.innerHTML = '<p>No results yet.</p>';
        } else {
            let html = `<table>
                <thead>
                    <tr>
                        <th>Exam</th>
                        <th>Subject</th>
                        <th>Score</th>
                        <th>Correct / Total</th>
                        <th>Auto Submitted</th>
                    </tr>
                </thead>
                <tbody>`;
            results.forEach(r => {
                html += `
                    <tr>
                        <td>${r.examId?.title || 'N/A'}</td>
                        <td>${r.examId?.subject || 'N/A'}</td>
                        <td>${r.score}</td>
                        <td>${r.correctCount} / ${r.correctCount + r.incorrectCount}</td>
                        <td>${r.autoSubmitted ? 'Yes' : 'No'}</td>
                    </tr>
                `;
            });
            html += `</tbody></table>`;
            container.innerHTML = html;
        }
    } catch(err) {
        console.error(err);
    }
}

function startExam(id) {
    const url = `exam.html?id=${id}`;
    // Precise features to make it look like a dedicated popup
    const width = 1000;
    const height = 700;
    const left = (screen.width - width) / 2;
    const top = (screen.height - height) / 2;

    const windowFeatures = `popup=yes,width=${width},height=${height},top=${top},left=${left},resizable=no,scrollbars=yes`;
    window.open(url, "ExamWindow", windowFeatures);
}
