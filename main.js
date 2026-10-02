/**
 * ========================================================================
 * ARCHIVO PRINCIPAL (main.js)
 * Orquestador: Conecta el UI del alumno con el Motor NLP y el Motor Gráfico.
 * ========================================================================
 */

let nlpTranslator = null;
let gameEngine = null;
let currentCommand = []; 

let unscrambleTarget = "";
let unscrambleCallback = null;
let unscrambleCurrent = [];
let unscrambleAvailable = [];

window.onload = () => {
    const savedConfig = localStorage.getItem('studentLevelConfig');
    if (!savedConfig) { window.location.href = 'dashboard.html'; return; }
    
    const config = JSON.parse(savedConfig); 
    const unitData = GAME_DATABASE.units[config.unit_id];
    const levelData = unitData.levels[config.mission_id];
    
    const missionData = JSON.parse(JSON.stringify(GAME_DATABASE.missions[config.mission_id]));

    const uiElements = {
        playerSprite: document.getElementById('player'),
        board: document.getElementById('game-board'),
        inventory: document.getElementById('inventory-display'),
        feedback: document.getElementById('feedback')
    };

const SVG_WALL = `<svg class="w-full h-full" viewBox="0 0 90 90"><rect width="90" height="90" fill="#475569"/><line x1="0" y1="30" x2="90" y2="30" stroke="#334155" stroke-width="3"/><line x1="0" y1="60" x2="90" y2="60" stroke="#334155" stroke-width="3"/><line x1="45" y1="0" x2="45" y2="30" stroke="#334155" stroke-width="3"/><line x1="30" y1="30" x2="30" y2="60" stroke="#334155" stroke-width="3"/><line x1="60" y1="30" x2="60" y2="60" stroke="#334155" stroke-width="3"/><line x1="45" y1="60" x2="45" y2="90" stroke="#334155" stroke-width="3"/></svg>`;


    missionData.obstacles.forEach(obs => {
        const wall = document.createElement('div');
        wall.className = 'entity'; 
        wall.style.width = '90px';
        wall.style.height = '90px';
        wall.style.left = `${obs.x * 90}px`;
        wall.style.top = `${obs.y * 90}px`;
        wall.innerHTML = SVG_WALL;
        uiElements.board.appendChild(wall);
    });

    missionData.interactive.forEach(item => {
        const interactEl = document.createElement('div');
        interactEl.id = item.id;
        interactEl.className = 'entity item' + (item.type === 'target' ? ' animate-float' : '');
        
        if(item.type === 'door') interactEl.innerHTML = `<svg class="w-full h-full p-1.5 drop-shadow-md" viewBox="0 0 24 24" fill="#d97706" stroke="#78350f" stroke-width="2"><path d="M6 22V4a2 2 0 012-2h8a2 2 0 012 2v18"/><circle cx="15" cy="12" r="1"/></svg>`;
        else if(item.svg) interactEl.innerHTML = item.svg;
        
        interactEl.style.left = `${item.x * 90}px`;
        interactEl.style.top = `${item.y * 90}px`;
        uiElements.board.appendChild(interactEl);
    });

    const targetObj = GAME_DATABASE.dictionary.nouns.targets.find(t => t.id === levelData.target_id);
    if (targetObj && missionData.target.x !== -1) {
        missionData.interactive.push({ type: 'target', id: targetObj.id, x: missionData.target.x, y: missionData.target.y, word: targetObj.word, svg: targetObj.svg });
        const targetEl = document.createElement('div');
        targetEl.id = targetObj.id;
        targetEl.className = 'entity item animate-float';
        targetEl.innerHTML = targetObj.svg;
        targetEl.style.left = `${missionData.target.x * 90}px`;
        targetEl.style.top = `${missionData.target.y * 90}px`;
        uiElements.board.appendChild(targetEl);
    }

    nlpTranslator = new LogicTranslator(GAME_DATABASE, { grammar_rule: levelData.grammar_rule });
    
    const onWinCallback = () => { document.getElementById('overlay').classList.remove('hidden'); };
    
    gameEngine = new GraphicalEngine(missionData, uiElements, onWinCallback, window.showUnscramble, window.showWarning, levelData.grammar_rule);

    document.getElementById('level-title').innerText = `${unitData.title} - ${levelData.title}`;
    document.getElementById('goal-text').innerText = "Goal: " + levelData.goal;
    
    window.currentGrammarRule = levelData.grammar_rule; 
    buildWordBankUI(levelData.allowed_words || []);
    showRPGDialog(levelData.dialogue);
};

window.updateInventoryUI = function(inventoryItems) {
    const invEl = document.getElementById('inventory-display');
    if (inventoryItems.length === 0) {
        invEl.classList.add('hidden');
        invEl.classList.remove('flex');
        invEl.innerHTML = '';
    } else {
        invEl.classList.remove('hidden');
        invEl.classList.add('flex');
        const svgsHTML = inventoryItems.map(item => `<div class="w-8 h-8 flex-shrink-0 flex items-center justify-center">${item.svg}</div>`).join('');
        invEl.innerHTML = `<span class="mb-1 text-[9px] opacity-75">INV</span><div class="flex flex-col gap-1">${svgsHTML}</div>`;
    }
}

let unscrambleTimer = null; // Variable global para el cronómetro


window.unscrambleTimer = null; 

window.showUnscramble = function(sentence, callback, timeLimit, onFail) {
    unscrambleTarget = sentence.toLowerCase();
    unscrambleCallback = callback;
    unscrambleAvailable = unscrambleTarget.split(" ").sort(() => Math.random() - 0.5);
    unscrambleCurrent = [];
    
    const modal = document.getElementById('unscramble-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    clearInterval(window.unscrambleTimer);
    document.getElementById('unscramble-feedback').innerText = '';

    // DESTRUCCIÓN PREVIA: Borramos cualquier rastro de mechas anteriores
    const oldTimer = document.getElementById('bomb-timer-container');
    if (oldTimer) oldTimer.remove();

    if (timeLimit) {
        // INYECCIÓN A LA FUERZA BRUTA: Creamos el HTML con CSS puro para que nada lo bloquee
        const dropzone = document.getElementById('unscramble-dropzone');
        const timerDiv = document.createElement('div');
        timerDiv.id = 'bomb-timer-container';
        timerDiv.style.cssText = 'width: 100%; max-width: 32rem; margin-bottom: 1.5rem; background-color: #1e293b; padding: 1rem; border-radius: 0.75rem; border: 2px solid #ef4444; box-shadow: 0 0 15px rgba(239,68,68,0.5); display: block;';
        timerDiv.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
        <div style="display: flex; align-items: center; color: #f87171; font-weight: 900; font-size: 1.25rem; gap: 8px;">
            <svg style="width: 26px; height: 26px;" class="animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="13" r="8"></circle>
                <path d="M12 9v4l2 2"></path>
                <path d="M12 5V2"></path>
                <path d="M16 4l2-2"></path>
                <path d="M8 4L6 2"></path>
            </svg>
            <span>DEFUSE THE BOMB!</span>
        </div>
        <span id="bomb-countdown" style="color: white; font-family: monospace; font-weight: bold; font-size: 1.5rem;">${timeLimit.toFixed(1)}s</span>
    </div>
    <div style="width: 100%; height: 1rem; background-color: #0f172a; border-radius: 9999px; overflow: hidden; position: relative;">
        <div id="bomb-fuse" style="position: absolute; left: 0; top: 0; height: 100%; width: 100%; background: linear-gradient(to right, #facc15, #f97316, #ef4444); box-shadow: 0 0 10px #f59e0b; transition: width 0.1s linear;"></div>
    </div>
`;
        // Lo incrustamos directo en la ventana modal
        dropzone.parentNode.insertBefore(timerDiv, dropzone);

        let timeLeft = timeLimit;
        window.unscrambleTimer = setInterval(() => {
            timeLeft -= 0.1;
            if (timeLeft <= 0) {
                timeLeft = 0;
                clearInterval(window.unscrambleTimer);
                modal.classList.add('hidden');
                modal.classList.remove('flex');
                if (onFail) onFail();
            }
            document.getElementById('bomb-countdown').innerText = timeLeft.toFixed(1) + 's';
            document.getElementById('bomb-fuse').style.width = `${(timeLeft / timeLimit) * 100}%`;
        }, 100);
    }
    
    window.renderUnscramble();
};

window.checkUnscramble = function() {
    if (unscrambleCurrent.join(" ") === unscrambleTarget) {
        clearInterval(window.unscrambleTimer);
        
        // DESTRUIMOS LA MECHA AL RESOLVER EL EJERCICIO
        const oldTimer = document.getElementById('bomb-timer-container');
        if (oldTimer) oldTimer.remove();

        document.getElementById('unscramble-modal').classList.add('hidden');
        document.getElementById('unscramble-modal').classList.remove('flex');
        if (unscrambleCallback) unscrambleCallback();
    } else {
        document.getElementById('unscramble-feedback').innerText = "Incorrect! Structure is [Subject] + [Verb] + [Object]";
    }
};

window.resetUnscramble = function() {
    unscrambleAvailable = unscrambleTarget.split(" ").sort(() => Math.random() - 0.5);
    unscrambleCurrent = [];
    window.renderUnscramble();
    document.getElementById('unscramble-feedback').innerText = ''; // Solo borra el error, no la bomba
};

window.renderUnscramble = function() {
    const dropzone = document.getElementById('unscramble-dropzone');
    const words = document.getElementById('unscramble-words');
    
    dropzone.innerHTML = unscrambleCurrent.map((w, i) => `<button onclick="moveUnscramble('current', ${i})" class="bg-indigo-500 hover:bg-indigo-400 text-white px-4 py-2 rounded-lg font-bold shadow-md transition-all">${w}</button>`).join('');
    words.innerHTML = unscrambleAvailable.map((w, i) => `<button onclick="moveUnscramble('available', ${i})" class="bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-2 rounded-lg font-bold shadow-md transition-all border-b-2 border-slate-300 active:translate-y-1 active:border-b-0">${w}</button>`).join('');
};

window.moveUnscramble = function(source, index) {
    if (source === 'available') unscrambleCurrent.push(unscrambleAvailable.splice(index, 1)[0]);
    else unscrambleAvailable.push(unscrambleCurrent.splice(index, 1)[0]);
    window.renderUnscramble();
    document.getElementById('unscramble-feedback').innerText = '';
};




window.showWarning = function(msg) {
    document.getElementById('warning-text').innerText = msg;
    document.getElementById('warning-modal').classList.remove('hidden');
    document.getElementById('warning-modal').classList.add('flex');
};

function showRPGDialog(text) {
    const overlay = document.getElementById('rpg-dialog-overlay');
    const textEl = document.getElementById('rpg-text');
    const btn = document.getElementById('rpg-start-btn');
    const controlsPanel = document.getElementById('controls-panel');
    
    overlay.classList.remove('hidden');
    btn.classList.add('hidden');
    textEl.innerHTML = '';
    controlsPanel.classList.add('opacity-40', 'pointer-events-none', 'grayscale');

    let i = 0; const speed = 35; 
    function typeWriter() {
        if (i < text.length) {
            textEl.innerHTML += text.charAt(i);
            i++;
            setTimeout(typeWriter, speed);
        } else {
            btn.classList.remove('hidden');
            btn.onclick = () => {
                overlay.classList.add('hidden');
                controlsPanel.classList.remove('opacity-40', 'pointer-events-none', 'grayscale');
            }
        }
    }
    typeWriter();
}

window.addWordToCommand = function(word) {
    currentCommand.push(word);
    renderCommandUI();
};

window.clearCommand = function() {
    currentCommand = [];
    renderCommandUI();
};

function renderCommandUI() {
    const display = document.getElementById('command-display');
    if (currentCommand.length === 0) {
        display.innerHTML = '<span class="text-slate-400 italic">Code movement here...</span>';
        return;
    }
    display.innerHTML = currentCommand.map((word, idx) => 
        `<span class="cmd-item bg-white px-3 py-1.5 rounded-md shadow-sm border border-slate-200 font-bold text-slate-700" onclick="removeWord(${idx})">${word}</span>`
    ).join('');
}

window.removeWord = function(index) {
    currentCommand.splice(index, 1);
    renderCommandUI();
};

window.executeCode = function() {
    if (currentCommand.length === 0) return;

    const evaluationResult = nlpTranslator.evaluate(currentCommand);

    if (evaluationResult.status === "error") {
        gameEngine._showFeedback(evaluationResult.message, true);
        gameEngine._triggerCrashVisuals(); 
        return; 
    }

    if (evaluationResult.status === "success") {
        document.getElementById('feedback').classList.add('hidden');
        
        setTimeout(() => {
            const engineSuccess = gameEngine.executeCommand(evaluationResult.executionCode);
            currentCommand = [];
            renderCommandUI();
            if (!engineSuccess) gameEngine._triggerCrashVisuals();
        }, 300);
    }
};

function buildWordBankUI(rawVocabArray) {
    const bankContainer = document.getElementById('word-bank-container');
    bankContainer.innerHTML = '';
    
    Array.from(rawVocabArray).forEach(word => {
        const btn = document.createElement('button');
        btn.className = "bg-slate-200 hover:bg-indigo-100 text-slate-700 font-bold py-1.5 px-3 rounded-lg shadow-sm border-b-2 border-slate-300 active:border-b-0 active:translate-y-1 transition-all text-[11px]";  
        btn.innerText = word;
        btn.onclick = () => addWordToCommand(word);
        bankContainer.appendChild(btn);
    });
    renderCommandUI();
}










