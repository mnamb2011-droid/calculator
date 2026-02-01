/**
 * HyperCalc Offline Core - Updated
 */

const STATE = {
    expression: '',
    result: null,
    history: [],
    angleMode: 'DEG', // DEG or RAD
    numberMode: 'NORM', // NORM or SCI
    language: 'EN'
};

// --- 1. MATH ENGINE ---
class MathEngine {
    tokenize(expr) {
        // تنظيف التعبير
        expr = expr.replace(/×/g, '*').replace(/÷/g, '/');
        const regex = /([0-9.]+|[a-z]+|\(|\)|\+|-|\*|\/|\^)/g;
        return expr.match(regex) || [];
    }

    toRPN(tokens) {
        const output = [];
        const stack = [];
        const precedence = { '^': 4, '*': 3, '/': 3, '+': 2, '-': 2, '(': 0 };
        
        tokens.forEach(token => {
            if (!isNaN(parseFloat(token))) {
                output.push(parseFloat(token));
            } else if (token in Math) {
                stack.push(token);
            } else if (token === '(') {
                stack.push(token);
            } else if (token === ')') {
                while (stack.length && stack[stack.length - 1] !== '(') {
                    output.push(stack.pop());
                }
                stack.pop();
                if (stack.length && (stack[stack.length - 1] in Math)) output.push(stack.pop());
            } else if (precedence[token]) {
                while (stack.length && precedence[stack[stack.length - 1]] >= precedence[token]) {
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
                    let a = stack.pop();
                    // معالجة الزوايا
                    if (['sin', 'cos', 'tan'].includes(token) && STATE.angleMode === 'DEG') {
                        a = a * (Math.PI / 180);
                    }
                    // إصلاح دالة اللوغاريتم
                    let res;
                    if (token === 'log') res = Math.log10(a);
                    else if (token === 'ln') res = Math.log(a);
                    else res = Math[token](a);
                    
                    stack.push(res);
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
            if (!expression) return "";
            const tokens = this.tokenize(expression);
            const rpn = this.toRPN(tokens);
            const res = this.evaluateRPN(rpn);
            if (!isFinite(res) || isNaN(res)) throw new Error("Error");
            return res;
        } catch (e) {
            return "Error";
        }
    }
}

const engine = new MathEngine();

// --- 2. UI CONTROLLER ---

const displayInput = document.getElementById('input-field');
const displayResult = document.getElementById('result-field');
const historyDiv = document.getElementById('history');

// تحديث الشاشة بناءً على الإعدادات
function updateDisplay() {
    displayInput.value = STATE.expression;
    
    if (STATE.result !== null && STATE.result !== "Error") {
        let finalRes = STATE.result;
        // تطبيق التنسيق العلمي إذا كان مطلوباً
        if (STATE.numberMode === 'SCI') {
            finalRes = finalRes.toExponential(4);
        } else {
            // تقريب الأرقام الطويلة في الوضع العادي
            finalRes = parseFloat(finalRes.toPrecision(12)) / 1; 
        }
        displayResult.innerText = finalRes;
    } else if (STATE.result === "Error") {
        displayResult.innerText = "Error";
    } else {
        displayResult.innerText = "";
    }
}

function handleInput(val) {
    if (val === 'CLEAR') {
        STATE.expression = '';
        STATE.result = null;
    } else if (val === 'DEL') {
        STATE.expression = STATE.expression.toString().slice(0, -1);
    } else if (val === '=') {
        const res = engine.solve(STATE.expression);
        STATE.result = res;
        historyDiv.innerText = STATE.expression + ' =';
        STATE.expression = String(res);
    } else if (val === 'graph') {
        if(STATE.expression.includes('x')) {
            document.getElementById('graph-container').classList.remove('hidden');
            drawGraph(STATE.expression);
        } else {
            alert("اكتب معادلة تحتوي على x أولاً\nمثال: sin(x)");
        }
    } else {
        STATE.expression += val;
    }
    updateDisplay();
}

// --- 3. EVENT LISTENERS (تشغيل الأزرار العلوية) ---

// 1. زر القائمة (Menu)
document.getElementById('menu-btn').addEventListener('click', () => {
    alert("HyperCalc Offline v1.0\nتصميم خاص: HiPER Clone");
});

// 2. زر الزوايا (DEG / RAD)
const modeBtn = document.getElementById('mode-indicator');
modeBtn.addEventListener('click', () => {
    STATE.angleMode = STATE.angleMode === 'DEG' ? 'RAD' : 'DEG';
    modeBtn.innerText = STATE.angleMode;
});

// 3. زر التنسيق (SCI / NORM)
const noteBtn = document.getElementById('notation-indicator');
noteBtn.addEventListener('click', () => {
    STATE.numberMode = STATE.numberMode === 'NORM' ? 'SCI' : 'NORM';
    noteBtn.innerText = STATE.numberMode;
    // إعادة تحديث النتيجة الحالية بالتنسيق الجديد
    if (STATE.result) updateDisplay();
});

// 4. زر اللغة
document.getElementById('lang-btn').addEventListener('click', () => {
    document.body.classList.toggle('rtl');
    const isRTL = document.body.classList.contains('rtl');
    document.getElementById('lang-btn').innerText = isRTL ? 'عربي' : 'EN';
});

// تشغيل أزرار الآلة الحاسبة
document.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', (e) => {
        if (navigator.vibrate) navigator.vibrate(15); // اهتزاز
        const key = btn.dataset.key;
        const fn = btn.dataset.fn;
        const action = btn.dataset.action;
        
        if (key) handleInput(key);
        if (fn) handleInput(fn + (['sin','cos','tan','log','ln','sqrt'].includes(fn) ? '(' : ''));
        if (action === 'graph') handleInput('graph');
    });
});

// إغلاق الرسم البياني
document.getElementById('close-graph').addEventListener('click', () => {
    document.getElementById('graph-container').classList.add('hidden');
});

// --- 4. GRAPHING ---
function drawGraph(expr) {
    const canvas = document.getElementById('graph-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.parentElement.offsetWidth;
    canvas.height = canvas.parentElement.offsetHeight;
    const w = canvas.width, h = canvas.height;
    
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#444"; ctx.beginPath();
    ctx.moveTo(0, h/2); ctx.lineTo(w, h/2);
    ctx.moveTo(w/2, 0); ctx.lineTo(w/2, h);
    ctx.stroke();

    ctx.strokeStyle = "#fa8231"; ctx.lineWidth = 2; ctx.beginPath();
    const scale = 40; 
    let started = false;
    for (let px = 0; px < w; px++) {
        const x = (px - w / 2) / scale;
        try {
            // تعويض بسيط للرسم
            const val = engine.solve(expr.replace(/x/g, `(${x})`));
            const py = h / 2 - (val * scale);
            if (!isNaN(py) && isFinite(py)) {
                if (!started) { ctx.moveTo(px, py); started = true; } 
                else { ctx.lineTo(px, py); }
            }
        } catch(e) {}
    }
    ctx.stroke();
}
