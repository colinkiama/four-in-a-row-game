export const GameStatus = {
    IN_PROGRESS: 'in-progress',
    START: 'start',
    WIN: 'win',
    DRAW: 'draw'
};

export const MoveStatus = {
    INVALID: 'invalid',
    WIN: 'win',
    SUCCESS: 'success',
    DRAW: 'draw'
};

export const PlayerColor = {
    NONE: 'none',
    RED: 'red',
    YELLOW: 'yellow'
};

export const BoardDimensions = {
    ROWS: 6,
    COLUMNS: 7,
    WIN_LINE_LENGTH: 4
};

export const BoardToken = {
    NONE: 0,
    YELLOW: 1,
    RED: 2
};
