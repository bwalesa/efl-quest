/**
 * ========================================================================
 * FASE 3: MOTOR NLP (Traductor Lógico - parser.js)
 * Evalúa la gramática DE MOVIMIENTO permitiendo verbos base en presente
 * para todas las misiones.
 * ========================================================================
 */

class LogicTranslator {
    constructor(database, teacherPayload) {
        this.db = database;
        this.config = teacherPayload; 
    }

    evaluate(studentWords) {
        if (!studentWords || studentWords.length === 0) {
            return this._error("Command line is empty.");
        }

        const sentence = studentWords.join(" ").toLowerCase().trim();
        const activeRule = this.config.grammar_rule; 
        
        let logicAction = null;
        let magnitude = 1;
        let directionLogic = null;

        let matchMove, matchTurn;

        // Movimiento universal para todas las misiones, ignorando activeRule
        matchMove = sentence.match(/^(walk|run|go|move) (\d+) (step|steps) (forward|backward|left|right|around)$/);
        matchTurn = sentence.match(/^(turn|rotate) (left|right|around)$/);

        if (matchMove) {
            magnitude = parseInt(matchMove[2]);
            const stepWord = matchMove[3]; 

            if (magnitude === 1 && stepWord === "steps") return this._error("Navigation Error: Use 'step' for 1.");
            if (magnitude > 1 && stepWord === "step") return this._error("Navigation Error: Use 'steps' for plurals.");

            logicAction = "LOGIC_MOVE";
            directionLogic = this._mapDirection(matchMove[4]);
        } 
        else if (matchTurn) {
            logicAction = "LOGIC_TURN";
            directionLogic = this._mapDirection(matchTurn[2]);
        } 
        else {
            return this._error(`Navigation Error: Commands must move the robot.`);
        }

        return {
            status: "success",
            executionCode: { action: logicAction, magnitude: magnitude, direction: directionLogic }
        };
    }

    _mapDirection(dirWord) {
        if (dirWord === "left") return "LOGIC_DIR_LEFT";
        if (dirWord === "right") return "LOGIC_DIR_RIGHT";
        if (dirWord === "around") return "LOGIC_DIR_AROUND";
        if (dirWord === "forward") return "LOGIC_DIR_FORWARD";
        if (dirWord === "backward") return "LOGIC_DIR_BACKWARD";
        return null;
    }

    _error(msg) {
        return { status: "error", message: msg };
    }
}