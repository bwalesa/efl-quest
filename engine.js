/**
 * ========================================================================
 * FASE 4: MOTOR GRÁFICO (Playground Engine)
 * Ejecuta órdenes matemáticas, detecta colisiones y anima el DOM.
 * ========================================================================
 */

class GraphicalEngine {
    constructor(missionData, uiElements, onWinCallback, onUnscramble, onWarning, grammarRule) {
        this.player = { x: missionData.start.x, y: missionData.start.y, rot: missionData.start.rot, inventory: [], recycledCount: 0 };
        this.map = { obstacles: missionData.obstacles || [], interactive: missionData.interactive || [] };
        this.ui = uiElements;
        this.onWin = onWinCallback; 
        
        this.onUnscramble = onUnscramble;
        this.onWarning = onWarning;
        this.grammarRule = grammarRule;

        this._renderVisuals();
    }

    

    executeCommand(executionCode) {
        const self = this; // ESTO ARREGLA EL CRASHEO DE LA CONSOLA
        let success = true;
        let isMove = false;

        if (executionCode.action === "LOGIC_TURN") {
            success = self._handleRotation(executionCode.direction);
        } else if (executionCode.action === "LOGIC_MOVE") {
            success = self._handleMovement(executionCode.magnitude, executionCode.direction);
            isMove = true;
        }
        self._renderVisuals();

        if (success) {
            setTimeout(() => {
                 self._moveEnemies();
                 
                 const enemies = self.map.interactive.filter(i => i.type === 'enemy');
                 const isDead = enemies.some(enemy => enemy.x === self.player.x && enemy.y === self.player.y);
                 
                 if (isDead) {
                     // Si el enemigo te toca, lanza el panel de derrota
                     self._triggerGameOver("The ghost caught you!");
                 } else {
                     self._checkAutoInteractions(isMove);
                 }
            }, 400); 
        }
        return success; 
    }


    _cancelMovement(errorMsg) {
        this._showFeedback(errorMsg, true);
        return false;
    }

    // NUEVA FUNCIÓN: Lanza la pantalla de muerte
    _triggerGameOver(reasonMsg) {
        const self = this;
        self._cancelMovement("MISSION FAILED!");
        self._triggerCrashVisuals();
        
        if (window.unscrambleTimer) clearInterval(window.unscrambleTimer);
        document.getElementById('unscramble-modal').classList.add('hidden');
        document.getElementById('unscramble-modal').classList.remove('flex');
        
        const timerContainer = document.getElementById('bomb-timer-container');
        if(timerContainer) timerContainer.style.display = 'none';
        
        // FORZAR LA CREACIÓN DEL PANEL DE DERROTA SI NO EXISTE EN EL HTML
        let gameOverOverlay = document.getElementById('game-over-overlay');
        if (!gameOverOverlay) {
            gameOverOverlay = document.createElement('div');
            gameOverOverlay.id = 'game-over-overlay';
            gameOverOverlay.className = 'absolute inset-0 bg-slate-900/95 backdrop-blur-sm z-[100] flex flex-col items-center justify-center rounded-lg border-4 border-red-600';
            gameOverOverlay.innerHTML = `
                <div class="text-7xl mb-4 animate-bounce">💀</div>
                <h2 class="text-5xl font-black text-red-500 mb-2">MISSION FAILED</h2>
                <p id="game-over-reason" class="text-lg font-bold text-slate-300 mb-8 text-center px-4"></p>
                <button type="button" onclick="window.location.reload()" class="bg-red-600 hover:bg-red-500 text-white text-xl font-black py-4 px-10 rounded-xl shadow-[0_6px_0_rgb(153,27,27)] active:translate-y-1.5 active:shadow-none transition-all">TRY AGAIN</button>
            `;
            document.body.appendChild(gameOverOverlay);
        }
        
        document.getElementById('game-over-reason').innerText = reasonMsg;
        gameOverOverlay.classList.remove('hidden');
        gameOverOverlay.classList.add('flex');
    }



    _checkAutoInteractions(isMove) {
        const self = this;
        if (!isMove) return;

        let currentObj = self.map.interactive.find(i => i.x === self.player.x && i.y === self.player.y && i.unscrambleText);
        
        if (currentObj) {
            if (currentObj.reqId && !self.player.inventory.some(i => i.id === currentObj.reqId)) {
                if (self.onWarning) self.onWarning(currentObj.warningMsg || "Prerequisite missing!");
                return;
            }

            self.onUnscramble(currentObj.unscrambleText, () => {
                
                if (currentObj.behavior === 'collect') {
                    self.player.inventory.push(currentObj);
                    document.getElementById(currentObj.id).style.opacity = '0';
                    self.map.interactive = self.map.interactive.filter(i => i.id !== currentObj.id);
                }
                else if (currentObj.behavior === 'defuse') {
    self.player.inventory.push(currentObj);
    
    // 1. CAMBIO VISUAL (GRIS Y SEMITRANSPARENTE)
    const bombEl = document.getElementById(currentObj.id);
    if (bombEl) {
        bombEl.style.filter = 'grayscale(100%) opacity(0.4)';
        bombEl.style.pointerEvents = 'none';
        
        // Detenemos la animación de pulso del SVG interno si existe
        const svgInBomb = bombEl.querySelector('svg');
        if (svgInBomb) svgInBomb.classList.remove('animate-pulse');
    }
    
    // 2. DESACTIVAR RE-TRIGGER
    currentObj.unscrambleText = null;
}
                else if (currentObj.behavior === 'activate') {
                    if (currentObj.reqId) self.player.inventory = self.player.inventory.filter(i => i.id !== currentObj.reqId);
                    if (currentObj.removeTargetId) {
                        const targetEl = document.getElementById(currentObj.removeTargetId);
                        if (targetEl) targetEl.style.opacity = '0.2';
                        self.map.interactive = self.map.interactive.filter(i => i.id !== currentObj.removeTargetId);
                    }
                    const el = document.getElementById(currentObj.id);
                    if (el && currentObj.colorChange) {
                        el.innerHTML = currentObj.svg.replace(currentObj.colorChange.from, currentObj.colorChange.to);
                    }
                }
                else if (currentObj.behavior === 'recycle') {
                    if (currentObj.reqId) self.player.inventory = self.player.inventory.filter(i => i.id !== currentObj.reqId);
                    self.player.recycledCount++;
                    const containerEl = document.getElementById(currentObj.id);
                    if (containerEl) {
                        containerEl.style.filter = 'grayscale(100%) opacity(0.4)';
                        containerEl.style.pointerEvents = 'none';
                    }
                    currentObj.unscrambleText = null; 
                }

                if (window.updateInventoryUI) window.updateInventoryUI(self.player.inventory);
                self._showFeedback("Action Success: " + (currentObj.successMsg || "Done!"), false);
                self._checkWinCondition();

            }, currentObj.timeLimit, () => {
                self._triggerGameOver("BOOM! The bomb exploded.");
            });
        }
    }

    _moveEnemies() {
        const enemies = this.map.interactive.filter(i => i.type === 'enemy');
        enemies.forEach(enemy => {
            let dx = this.player.x - enemy.x;
            let dy = this.player.y - enemy.y;
            
            let nextX = enemy.x;
            let nextY = enemy.y;

            if (Math.abs(dx) > Math.abs(dy) && dx !== 0) {
                nextX += dx > 0 ? 1 : -1;
                // Si choca en el eje X, intenta esquivar por el eje Y
                if (this.map.obstacles.some(obs => obs.x === nextX && obs.y === nextY)) {
                    nextX = enemy.x;
                    // Si está alineado, elige un lado al azar para no atascarse infinitamente
                    nextY += dy !== 0 ? (dy > 0 ? 1 : -1) : (Math.random() > 0.5 ? 1 : -1);
                }
            } else {
                nextY += dy > 0 ? 1 : (dy < 0 ? -1 : 0);
                // Si choca en el eje Y (como el muro de la misión F5), intenta esquivar por el eje X
                if (this.map.obstacles.some(obs => obs.x === nextX && obs.y === nextY)) {
                    nextY = enemy.y;
                    // Si el jugador está justo abajo (dx=0), se desliza al azar hasta encontrar la puerta
                    nextX += dx !== 0 ? (dx > 0 ? 1 : -1) : (Math.random() > 0.5 ? 1 : -1);
                }
            }

            // Validación final estricta: que el nuevo desvío no sea otro muro ni se salga del mapa
            if (!this.map.obstacles.some(obs => obs.x === nextX && obs.y === nextY) && nextX >= 0 && nextX <= 5 && nextY >= 0 && nextY <= 5) {
                enemy.x = nextX;
                enemy.y = nextY;
            }

            // Animar el DOM
            const enemyEl = document.getElementById(enemy.id);
            if (enemyEl) {
                enemyEl.style.left = `${enemy.x * 90}px`;
                enemyEl.style.top = `${enemy.y * 90}px`;
            }
        });
    }

    

    _handleRotation(direction) {
        if (direction === "LOGIC_DIR_LEFT") this.player.rot -= 90;
        else if (direction === "LOGIC_DIR_RIGHT") this.player.rot += 90;
        else if (direction === "LOGIC_DIR_AROUND") this.player.rot += 180;
        this.player.rot = (this.player.rot % 360 + 360) % 360;
        return true;
    }

    _handleMovement(steps, moveDir) {
        let dx = 0, dy = 0;
        
        let tempRot = this.player.rot;
        if (moveDir === "LOGIC_DIR_BACKWARD") tempRot = (tempRot + 180) % 360;
        else if (moveDir === "LOGIC_DIR_LEFT") tempRot = (tempRot - 90 + 360) % 360;
        else if (moveDir === "LOGIC_DIR_RIGHT") tempRot = (tempRot + 90) % 360;

        if (tempRot === 0) dy = -1;         
        else if (tempRot === 90) dx = 1;    
        else if (tempRot === 180) dy = 1;   
        else if (tempRot === 270) dx = -1;  

        let tempX = this.player.x, tempY = this.player.y;

        for (let i = 0; i < steps; i++) {
            let nextX = tempX + dx, nextY = tempY + dy;

            if (nextX < 0 || nextX > 5 || nextY < 0 || nextY > 5) return this._cancelMovement("Crash! You hit the map boundary.");
            if (this.map.obstacles.some(obs => obs.x === nextX && obs.y === nextY)) return this._cancelMovement("Crash! You hit a wall.");
            
            const laser = this.map.interactive.find(item => item.type === 'laser_gate');
            if (laser && nextX === laser.x && nextY === laser.y) {
                return this._cancelMovement("Crash! The laser is active. Turn on the generator first.");
            }


            const door = this.map.interactive.find(item => item.type === 'door');
            if (door) {
                // Si el robot está en la puerta e intenta AVANZAR hacia adelante (hacia la zona prohibida y < door.y) sin llave
                if (tempX === door.x && tempY === door.y && nextY < door.y) {
                    if (!this.player.inventory.some(i => i.type === 'key')) {
                        if (this.onWarning) this.onWarning("You need to pick up the key first!");
                    } else {
                        if (this.onWarning) this.onWarning("You need to open the door first!");
                    }
                    return false;
                }

                // Si el robot se está moviendo hacia la casilla de la puerta desde abajo
                if (nextX === door.x && nextY === door.y) {
                    tempX = nextX;
                    tempY = nextY;
                    this.player.x = tempX;
                    this.player.y = tempY;
                    
                    if (!this.player.inventory.some(i => i.type === 'key')) {
                        if (this.onWarning) this.onWarning("You need to pick up the key first!");
                    } else {
                        setTimeout(() => { this._triggerDoorInteraction(door); }, 200);
                    }
                    return true;
                }
            }

            // 4. Efectuar el paso actual
            tempX = nextX; tempY = nextY;

            // 5. NUEVO: INTERRUPCIÓN FORZOSA POR OBJETOS INTERACTIVOS (BOMBAS)
            // Si en este paso exacto pisa algo que tiene un ejercicio (unscrambleText), cortamos el avance.
            let steppedObj = this.map.interactive.find(item => item.x === tempX && item.y === tempY && item.unscrambleText);
            if (steppedObj) {
                break; 
            }
        }

        this.player.x = tempX;
        this.player.y = tempY;
        return true;
    }

    _triggerDoorInteraction(door) {
        let sentence = this.grammarRule === "past_simple" ? "the robot opened the door" : "the robot opens the door";
        this.onUnscramble(sentence, () => {
            document.getElementById(door.id).style.opacity = '0';
            this.map.interactive = this.map.interactive.filter(i => i.id !== door.id);
            this._showFeedback("Action Success: Door opened.", false);
            this._checkWinCondition();
        });
    }

    

    _renderVisuals() {
        const CELL_SIZE = 90; 
        this.ui.playerSprite.style.transform = `translate(${this.player.x * CELL_SIZE}px, ${this.player.y * CELL_SIZE}px) rotate(${this.player.rot}deg)`;
    }

    _triggerCrashVisuals() {
        this.ui.board.classList.remove('crash');
        void this.ui.board.offsetWidth; 
        this.ui.board.classList.add('crash');
        setTimeout(() => { this.ui.board.classList.remove('crash'); }, 400);
    }

    _showFeedback(message, isError) {
        const fb = this.ui.feedback;
        fb.innerText = message;
        
        // Lo sacamos del panel y lo convertimos en un Toast flotante (fixed), anclado arriba al centro.
        // Al usar 'fixed', literalmente desaparece del flujo y jamás empujará a los botones.
        fb.className = `fixed top-6 left-1/2 z-[200] px-6 py-3 rounded-full font-black text-sm shadow-2xl transition-all duration-300 ease-out ${isError ? 'bg-red-600 text-white shadow-red-500/50' : 'bg-emerald-500 text-white shadow-emerald-500/50'}`;
        
        // Animación de entrada
        fb.style.opacity = '1';
        fb.style.transform = 'translate(-50%, 0) scale(1)';

        // Comportamiento de Toast real: Desaparece solo después de 2.5 segundos
        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => {
            fb.style.opacity = '0';
            fb.style.transform = 'translate(-50%, -20px) scale(0.95)';
            // Lo ocultamos por completo una vez que termina la transición
            setTimeout(() => { if(fb.style.opacity === '0') fb.className = 'hidden'; }, 300);
        }, 2500);
    }

    _checkWinCondition() {
        const targetsInMap = this.map.interactive.filter(item => item.type === 'target').length;
        const containersInMap = this.map.interactive.filter(item => item.type === 'container').length;

        if (containersInMap === 0) {
            if (targetsInMap === 0 && this.player.inventory.some(i => i.type === 'target' || i.type === 'key')) {
                setTimeout(() => { if (this.onWin) this.onWin(); }, 500);
            }
        } else {
            const targetsInInv = this.player.inventory.filter(item => item.type === 'target').length;
            if (targetsInMap === 0 && targetsInInv === 0 && this.player.recycledCount > 0) {
                setTimeout(() => { if (this.onWin) this.onWin(); }, 500);
            }
        }
    }
}