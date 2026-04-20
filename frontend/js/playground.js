let editor;
const languageConfigs = {
    'python': { id: 71, language: 'python', defaultValue: 'print("Hello, World!")' },
    'javascript': { id: 63, language: 'javascript', defaultValue: 'console.log("Hello, World!");' },
    'java': { id: 62, language: 'java', defaultValue: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}' },
    'cpp': { id: 54, language: 'cpp', defaultValue: '#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}' },
    'c': { id: 50, language: 'c', defaultValue: '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}' }
};

// Initialize Monaco Editor
require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.36.1/min/vs' } });

require(['vs/editor/editor.main'], function () {
    const user = checkAuth('Student');
    if (!user) return;

    const lang = localStorage.getItem('last_language') || 'python';
    document.getElementById('language-select').value = lang;

    const savedCode = localStorage.getItem(`code_${lang}`);

    editor = monaco.editor.create(document.getElementById('editor-container'), {
        value: savedCode || languageConfigs[lang].defaultValue,
        language: lang,
        theme: 'vs-dark',
        automaticLayout: true,
        fontSize: 14,
        fontFamily: "'Fira Code', monospace",
        minimap: { enabled: false },
        lineNumbers: 'on',
        renderWhitespace: 'selection',
        scrollbar: {
            vertical: 'visible',
            horizontal: 'visible'
        }
    });

    // Auto-save to localStorage
    editor.onDidChangeModelContent(() => {
        const currentLang = document.getElementById('language-select').value;
        localStorage.setItem(`code_${currentLang}`, editor.getValue());
    });
});

// Switch Language
document.getElementById('language-select').addEventListener('change', (e) => {
    const lang = e.target.value;
    localStorage.setItem('last_language', lang);
    
    // Save current content before switching
    const currentModel = editor.getModel();
    const oldLang = currentModel.getLanguageId();
    localStorage.setItem(`code_${oldLang}`, editor.getValue());

    // Switch to new language
    const newCode = localStorage.getItem(`code_${lang}`) || languageConfigs[lang].defaultValue;
    
    monaco.editor.setModelLanguage(currentModel, lang);
    editor.setValue(newCode);
});

// Run Code
document.getElementById('run-btn').addEventListener('click', async () => {
    const runBtn = document.getElementById('run-btn');
    const statusDiv = document.getElementById('execution-status');
    const stdoutDiv = document.getElementById('stdout');
    const statsDiv = document.getElementById('result-stats');

    const sourceCode = editor.getValue();
    const lang = document.getElementById('language-select').value;
    const stdin = document.getElementById('stdin').value;

    runBtn.disabled = true;
    statusDiv.style.color = '#e2e8f0';
    statusDiv.innerText = 'Running...';
    stdoutDiv.innerText = 'Executing code, please wait...';
    statsDiv.innerText = '';

    try {
        const response = await fetchAPI('/playground/run', {

            method: 'POST',
            body: {
                source_code: sourceCode,
                language_id: languageConfigs[lang].id,
                stdin: stdin
            }
        });

        runBtn.disabled = false;

        if (response.status && (response.status.id === 3 || response.status.id === 4)) { // 3 = Accepted, 4 = Wrong Answer (still executed)
            statusDiv.style.color = '#4ade80';
            statusDiv.innerText = 'Finished';
            stdoutDiv.style.color = '#4ade80';
            stdoutDiv.innerText = response.stdout || 'Program executed successfully with no output.';
        } else {
            statusDiv.style.color = '#f87171';
            statusDiv.innerText = response.status ? response.status.description : 'Error';
            stdoutDiv.style.color = '#f87171';
            stdoutDiv.innerText = response.compile_output || response.stderr || 'Execution failed.';
        }

        if (response.time) {
            statsDiv.innerHTML = `<span>Time: ${response.time}s</span> <span>Memory: ${Math.round(response.memory / 1024)}KB</span>`;
        }

    } catch (err) {
        runBtn.disabled = false;
        statusDiv.style.color = '#f87171';
        statusDiv.innerText = 'Connection Error';
        stdoutDiv.style.color = '#f87171';
        stdoutDiv.innerText = 'Failed to connect to execution server. Please check your internet connection.';
        console.error(err);
    }
});

// Reset Code
document.getElementById('reset-code').addEventListener('click', () => {
    if (confirm('Reset editor to default template?')) {
        const lang = document.getElementById('language-select').value;
        editor.setValue(languageConfigs[lang].defaultValue);
        localStorage.removeItem(`code_${lang}`);
    }
});

// Command + Enter or Ctrl + Enter to run
window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        document.getElementById('run-btn').click();
    }
});
