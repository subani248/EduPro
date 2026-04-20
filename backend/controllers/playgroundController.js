const axios = require('axios');

const LANGUAGE_MAP = {
    'c': 50,
    'cpp': 54,
    'java': 62,
    'python': 71,
    'javascript': 63
};

exports.runCode = async (req, res) => {
    let { source_code, language_id, stdin } = req.body;
    
    try {
        const judge0Url = process.env.JUDGE0_URL || 'https://ce.judge0.com';
        const apiKey = process.env.JUDGE0_API_KEY;

        // If language_id is a string (e.g., 'python'), map it to its ID
        let actualLanguageId = typeof language_id === 'string' ? (LANGUAGE_MAP[language_id] || 71) : language_id;

        const config = {
            headers: { 
                'Content-Type': 'application/json',
                'X-Auth-Token': apiKey || "" // Optional: for private instances
            }
        };

        if (apiKey && judge0Url.includes('rapidapi')) {
            config.headers['X-RapidAPI-Key'] = apiKey;
            config.headers['X-RapidAPI-Host'] = 'judge0-ce.p.rapidapi.com';
        }

        const response = await axios.post(`${judge0Url}/submissions?base64_encoded=true&wait=true`, {
            source_code: Buffer.from(source_code).toString('base64'),
            language_id: actualLanguageId,
            stdin: stdin ? Buffer.from(stdin).toString('base64') : ""
        }, config);

        const result = response.data;
        
        res.json({
            stdout: result.stdout ? Buffer.from(result.stdout, 'base64').toString() : null,
            stderr: result.stderr ? Buffer.from(result.stderr, 'base64').toString() : null,
            compile_output: result.compile_output ? Buffer.from(result.compile_output, 'base64').toString() : null,
            status: result.status,
            time: result.time,
            memory: result.memory
        });

    } catch (error) {
        console.error('Judge0 Error:', error.response ? error.response.data : error.message);
        res.status(500).json({ 
            message: 'Code execution failed', 
            error: error.response ? error.response.data : error.message 
        });
    }
};
