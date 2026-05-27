const API_KEY = "AIzaSyDcz_QuucA4vV2LWV8vWZnMMoFa22x1O0U"; // Your active key

// DOM Elements
const codeInput = document.getElementById('codeInput');
const analyzeBtn = document.getElementById('analyzeBtn');
const loadingMsg = document.getElementById('loadingMsg');
const analysisOutput = document.getElementById('analysisOutput');
const generateSection = document.getElementById('generateSection');
const generateBtn = document.getElementById('generateBtn');
const solutionSection = document.getElementById('solutionSection');
const codeOutput = document.getElementById('codeOutput');
const complexityDisplay = document.getElementById('complexityDisplay');
const commitMessage = document.getElementById('commitMessage');
const copyBtn = document.getElementById('copyBtn');
const detectedLangBadge = document.getElementById('detectedLangBadge'); 

let globalAIResponse = null; 

function extractJSON(text) {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Invalid AI formatting. Please try again.");
}

function renderDiagnosticReport(rawCode, issues) {
    const lines = rawCode.split('\n');
    let htmlContent = '';

    lines.forEach((line, index) => {
        const currentLineNum = index + 1;
        const issue = issues.find(i => parseInt(i.line_number) === currentLineNum);
        const safeLine = line.replace(/</g, "&lt;").replace(/>/g, "&gt;");

        if (issue) {
            htmlContent += `<span class="code-line error-line">${safeLine || ' '}</span>\n`;
            htmlContent += `
                <div class="error-explanation-box">
                    <div class="error-title">Issue: ${issue.explanation}</div>
                    <div class="error-logic">Logic: ${issue.logic}</div>
                </div>`;
        } else {
            htmlContent += `<span class="code-line">${safeLine || ' '}</span>\n`;
        }
    });

    if (issues.length === 0) {
        htmlContent = `<div class="empty-state" style="color: #10b981;">No issues found. Code structure is optimal.</div>`;
    }

    analysisOutput.innerHTML = htmlContent;
}

analyzeBtn.addEventListener('click', async () => {
    const rawCode = codeInput.value.trim();
    if (!rawCode) return alert("Please enter source code for analysis.");

    analyzeBtn.disabled = true;
    loadingMsg.classList.remove('hidden');
    analysisOutput.innerHTML = `<div class="empty-state" style="color:#2563eb;">Running diagnostics...</div>`;
    generateSection.classList.add('hidden');
    solutionSection.classList.add('hidden');
    
    // 🔥 ULTRA-STRICT PROMPT FOR SHORT & CRISP CODE 🔥
    const systemPrompt = `You are an Enterprise Code Analysis AI. Analyze the code provided.
    Auto-detect the language.
    Return ONLY a strict JSON object with this exact structure (do not use markdown wrapping):
    {
      "detected_language": "Language",
      "issues_found": [
        {
          "line_number": 6,
          "type": "Error/Warning",
          "explanation": "Short description of the error.",
          "logic": "1-2 sentences explaining the professional logic/reasoning behind fixing this."
        }
      ],
      "fixed_code": "Refactor the code to be extremely short, modern, and elegant. Remove ALL boilerplate, redundant logic, unused variables, and unnecessary loops. Use the most efficient built-in methods available for that language. Keep it absolutely crisp and minimal.",
      "complexity": "Time: O(n) | Space: O(1)",
      "git_commit_message": "refactor: concise commit message"
    }
    Code to analyze: \n\n${rawCode}`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: systemPrompt }] }] })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error?.message || response.statusText);
        }

        const data = await response.json();
        globalAIResponse = extractJSON(data.candidates[0].content.parts[0].text);

        if(detectedLangBadge) {
            detectedLangBadge.innerText = `Language: ${globalAIResponse.detected_language}`;
            detectedLangBadge.classList.remove('hidden');
        }

        renderDiagnosticReport(rawCode, globalAIResponse.issues_found || []);

        generateSection.classList.remove('hidden');

    } catch (error) {
        console.error(error);
        analysisOutput.innerHTML = `<div class="empty-state" style="color: #ef4444;">API Error: ${error.message}</div>`;
    } finally {
        analyzeBtn.disabled = false;
        loadingMsg.classList.add('hidden');
    }
});

generateBtn.addEventListener('click', () => {
    if (!globalAIResponse) return;

    codeOutput.value = globalAIResponse.fixed_code;
    complexityDisplay.innerText = globalAIResponse.complexity || "N/A";
    commitMessage.innerText = globalAIResponse.git_commit_message || "N/A";

    solutionSection.classList.remove('hidden');
    solutionSection.scrollIntoView({ behavior: 'smooth' });
});

copyBtn.addEventListener('click', () => {
    if (codeOutput.value) {
        navigator.clipboard.writeText(codeOutput.value);
        copyBtn.innerText = "Copied!";
        setTimeout(() => copyBtn.innerText = "Copy to Clipboard", 2000);
    }
});
