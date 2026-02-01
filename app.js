/**
 * HyperCalc Offline Core
 * Architecture: MVC (Model-View-Controller)
 */

// --- 1. CONFIGURATION & STATE ---
const STATE = {
    expression: '',
    result: '',
    history: [],
    angleMode: 'DEG', // DEG or RAD
    isGraphMode: false,
    language: 'EN'
};

const I18N = {
    EN: { error: "Error", graph: "Graph" },
    AR: { error: "خطأ", graph: "رسم بياني" }
};

// --- 2. MATH ENGINE (The Brain) ---

class MathEngine {
    constructor() {
        // High precision map (Simulated for vanilla JS without libraries)
        // In a real full-scale app, we would use a BigInt implementation here.
        this.precision = 15; // Standard JS float precision
    }

    tokenize(expr) {
        // Splits string into numbers and operators
        // Regex looks for: numbers, operators, function names, parentheses
        const regex = /([0-9.]+|[a-z]+|\(|\)|\+|-|\*|\/|\^)/g;
        return expr.match(regex) || [];
    }

    // Shunting-yard algorithm to parse expression to RPN
    toRPN(tokens) {
        const output = [];
        const stack = [];
        const precedence = { '^': 4, '*': 3, '/': 3, '+': 2, '-': 2, '(': 0 };
        const associativity = { '^': 'Right', '*': 'Left', '/': 'Left', '+': 'Left', '-': 'Left' };

        tokens.forEach(token => {
            if (!isNaN(parseFloat(token))) {
                output.push(parseFloat(token));
            } else if (token in Math) { // Functions like sin, cos
                stack.push(token);
            } else if (token === '(') {
                stack.push(token);
            } else if (token === ')') {
                while (stack.length && stack[stack.length - 1] !== '(') {
                    output.push(stack.pop());
                }
                stack.pop(); // Pop '('
                if (stack.length && (stack[stack.length - 1] in Math)) {
                    output.push(stack.pop()); // Pop function
                }
            } else if (precedence[token]) {
                while (stack.length && precedence[stack[stack.length - 1]] >= precedence[token]) {
                    if (precedence[stack[stack.length - 1]] === precedence[token] && associativity[token] === 'Right') break;
                    output.push(stack.pop());
                }
                stack.push(token);
            }
        });

        while (stack.length) output.push(stack.pop());
        return output;
    }

    evaluateRPN(rpn) {
        const stack = [];
        rpn.forEach(token => {
            if (typeof token === 'number') {
                stack.push(token);
            } else if (typeof token === 'string') {
                if (token in Math) {
                    const a = stack.pop();
                    let val = a;
                    // Handle Angle Modes
                    if (['sin', 'cos', 'tan'].includes(token) && STATE.angleMode === 'DEG') {
                        val = a * (Math.PI / 180);
                    }
                    stack.push(Math[token](val));
                } else {
                    const b = stack.pop();
                    const a = stack.pop();
                    switch (token) {
                        case '+': stack.push(a + b); break;
                        case '-': stack.push(a - b); break;
                        case '*': stack.push(a * b); break;
                        case '/': stack.push(a / b); break;
                        case '^': stack.push(Math.pow(a, b)); break;
                    }
                }
            }
        });
        return stack[0];
    }

    solve(expression) {
        try {
            // sanitize: replace '×' with '*', '÷' with '/'
            let cleanExpr = expression.replace(/×/g, '*').replace(/÷/g, '/');
            const tokens = this.tokenize(cleanExpr);
            const rpn = this.toRPN(tokens);
            const res = this.evaluateRPN(rpn);
            
            if (!isFinite(res) || isNaN(res)) throw new Error("NaN");
            return res;
        } catch (e) {
            return "Error";
        }
    }
}

const engine = new MathEngine();

// --- 3. GRAPHING ENGINE (Canvas) ---

function drawGraph(expression) {
    const canvas = document.getElementById('graph-canvas');
    const ctx = canvas.getContext('2d');
    
    // Fit canvas to container
    canvas.width = canvas.parentElement.offsetWidth;
    canvas.height = canvas.parentElement.offsetHeight;
    
    const w = canvas.width;
    const h = canvas.height;
    
    // Clear
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    
    // Draw Axis
    ctx.strokeStyle = "#444";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h/2); ctx.lineTo(w, h/2); // X axis
    ctx.moveTo(w/2, 0); ctx.lineTo(w/2, h); // Y axis
    ctx.stroke();
    
    // Plot Function
    ctx.strokeStyle = "#fa8231";
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    const scale = 40; // Pixels per unit
    const startX = -w / 2 / scale;
    const endX = w / 2 / scale;
    
    // Replace x in string and evaluate
    // Note: In a full app, we would use the compiled parsing tree for speed
    let started = false;
    for (let px = 0; px < w; px++) {
        const x = (px - w / 2) / scale;
        try {
            // Basic substitution (simple implementation)
            const evalStr = expression.replace(/x/g, `(${x})`);
            const y = engine.solve(evalStr);
            
            const py = h / 2 - (y * scale);
            
            if (!isNaN(py) && isFinite(py)) {
                if (!started) { ctx.moveTo(px, py); started = true; }
                else { ctx.lineTo(px, py); }
            }
        } catch (e) {}
    }
    ctx.stroke();
}

// --- 4. CONTROLLER (UI Logic) ---

const displayInput = document.getElementById('input-field');
const displayResult = document.getElementById('result-field');
const historyDiv = document.getElementById('history');

function updateDisplay() {
    displayInput.value = STATE.expression;
}

function handleInput(val) {
    if (val === 'CLEAR') {
        STATE.expression = '';
        STATE.result = '';
        displayResult.innerText = '';
    } else if (val === 'DEL') {
        STATE.expression = STATE.expression.slice(0, -1);
    } else if (val === '=') {
        const res = engine.solve(STATE.expression);
        STATE.result = res;
        displayResult.innerText = res;
        STATE.history.push(`${STATE.expression} = ${res}`);
        historyDiv.innerText = `${STATE.expression} =`;
        STATE.expression = String(res); // Chain calculation
    } else if (val === 'graph') {
        // Simple heuristic: if 'x' is in string, graph it
        if(STATE.expression.includes('x')) {
            document.getElementById('graph-container').classList.remove('hidden');
            drawGraph(STATE.expression);
        } else {
            alert("Enter an expression with 'x' (e.g. sin(x))");
        }
    } else {
        // Append input
        STATE.expression += val;
    }
    updateDisplay();
}

// Event Listeners
document.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', (e) => {
        // Haptic Feedback
        if (navigator.vibrate) navigator.vibrate(10);
        
        const key = btn.dataset.key;
        const fn = btn.dataset.fn;
        const action = btn.dataset.action;
        
        if (key) handleInput(key);
        if (fn) handleInput(fn + (['sin','cos','tan','log','ln','sqrt'].includes(fn) ? '(' : ''));
        if (action === 'graph') handleInput('graph');
    });
});

// Mode toggles
document.getElementById('lang-btn').addEventListener('click', () => {
    STATE.language = STATE.language === 'EN' ? 'AR' : 'EN';
    document.body.classList.toggle('rtl');
});

document.getElementById('close-graph').addEventListener('click', () => {
    document.getElementById('graph-container').classList.add('hidden');
});

// Register Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js')
        .then(() => console.log('Service Worker Registered'));
}
