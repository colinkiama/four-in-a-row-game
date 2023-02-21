"use strict";

import { BoardDimensions, BoardToken, BoardTraversalDirection, GameStatus, MoveStatus, PlayerColor } from "./constants/index.js";

export default class FourInARowGame {
    startingColor;
    currentTurn;
    status;
    history;

    /**
     * options = {
     *   startingColor?: PlayerColor
     *   history?: Board[]     
     * 
     * These options are useful for things like: resuming a game in progress
     * from loaded save data or just changing which player 
     * starts the game etc.
     * }
     *  
     */
    constructor(options) {
        let instanceOptions = options || {};
        this.startingColor = instanceOptions.startingColor || PlayerColor.YELLOW;
        this.history = instanceOptions.history;

        if (instanceOptions.history) {
            this.history = instanceOptions.history;
        } else {
            this.history = [FourInARowGame.createBoard()];
        }

        this.status = GameStatus.START;
        this.currentTurn = this.updateCurrentTurn(this.history, this.startingColor);
    }

    static createBoard() {
        let board = new Array(BoardDimensions.ROWS);

        for (let i = 0; i < BoardDimensions.ROWS; i++) {
            board[i] = new Uint8Array(BoardDimensions.COLUMNS);
            board[i].fill(BoardToken.NONE);
        }

        return board;
    }

    static boardTokenToPlayerColor(boardToken) {
        switch (boardToken) {
            case BoardToken.YELLOW:
                return PlayerColor.YELLOW;
            case BoardToken.RED:
                return PlayerColor.RED;
            default:
                return PlayerColor.NONE;
        }
    }

    static playerColorToBoardToken(playerColor) {
        switch (playerColor) {
            case PlayerColor.YELLOW:
                return BoardToken.YELLOW;
            case PlayerColor.RED:
                return BoardToken.RED;
            default:
                return BoardToken.NONE;
        }
    }

    static deepBoardCopy(oldBoard) {
        let newBoard = new Array(BoardDimensions.ROWS);

        for (let rowIndex = 0; rowIndex < BoardDimensions.ROWS; rowIndex++) {
            newBoard[rowIndex] = new Uint8Array(BoardDimensions.COLUMNS);
            for (let columnIndex = 0; columnIndex < BoardDimensions.COLUMNS; columnIndex++) {
                newBoard[rowIndex][columnIndex] = oldBoard[rowIndex][columnIndex];
            }
        }

        return newBoard;
    }

    playMove(columnIndex) {
        switch (this.status) {
            case GameStatus.START:
                this.status = GameStatus.IN_PROGRESS;
                break;
            case GameStatus.DRAW:
            case GameStatus.WIN:
                // The game is over at thispoint so
                // re-evaluate the latest board, returning the same game status
                // and board details. 
                return this.evaluateGame(this.history[this.history.length - 1]);
            default:
                break;
        }

        let moveResults = this.performMove(columnIndex);
        this.currentTurn = this.updateCurrentTurn(this.history, this.startingColor);
        return moveResults;
    }

    updateCurrentTurn(history, startingColor) {
        // Current player's turn change with each go. With each turn history increases by 1.
        // However, by default, history has a length of 1 because of the initial state of the board is pushed first.
        let historyLengthHasEvenParity = history.length % 2 === 0;

        if (startingColor === PlayerColor.YELLOW) {
            return historyLengthHasEvenParity ? PlayerColor.RED : PlayerColor.YELLOW;
        } else {
            return historyLengthHasEvenParity ? PlayerColor.YELLOW : PlayerColor.RED
        }
    }

    performMove(columnIndex) {
        let nextBoard = FourInARowGame.deepBoardCopy(this.history[this.history.length - 1]);

        if (columnIndex < 0 && columnIndex >= BoardDimensions.COLUMNS) {
            return {
                board: nextBoard,
                winner: PlayerColor.NONE,
                status: {
                    message: "Selected column is outside of range of board columns",
                    value: MoveStatus.INVALID
                },
                winLine: []
            }
        }

        let moveResult = this.tryPerformMove(columnIndex, nextBoard);

        if (moveResult.status === MoveStatus.INVALID) {
            return {
                board: nextBoard,
                winner: PlayerColor.NONE,
                status: {
                    message: "Returned column is filled",
                    value: MoveStatus.INVALID
                },
                winLine: []
            }
        }

        // From this point, the board move was successful. 
        this.history.push(moveResult.board);
        return this.evaluateGame(moveResult.board);
    }

    evaluateGame(board) {
        let winCheckResult = this.checkForWin(board);

        if (winCheckResult.winner !== PlayerColor.NONE) {
            this.status = GameStatus.WIN;
            return {
                board: board,
                winner: winCheckResult.winner,
                status: {
                    value: MoveStatus.WIN
                },
                winLine: winCheckResult.winLine
            };
        }

        // If board is full right now, we can assume the game to be a draw
        // since there weren't any winning lines detected.
        if (this.checkForFilledBoard(board)) {
            this.status = GameStatus.DRAW;

            return {
                board: board,
                winner: PlayerColor.NONE,
                status: {
                    value: MoveStatus.DRAW
                },
                winLine: []
            }
        }

        // From this point, we can assume that a succesful move was made and the game will
        // continue on.
        return {
            board: board,
            winner: PlayerColor.NONE,
            status: {
                value: MoveStatus.SUCCESS
            },
            winLine: []
        };
    }

    tryPerformMove(columnIndex, nextBoard) {
        let isMoveValid = false;

        for (let i = nextBoard.length - 1; i > -1; i--) {
            let boardRow = nextBoard[i];
            let boardPosition = boardRow[columnIndex];

            if (boardPosition !== BoardToken.NONE) {
                continue;
            }

            boardRow[columnIndex] = FourInARowGame.playerColorToBoardToken(this.currentTurn);
            isMoveValid = true;
            break;
        }

        if (!isMoveValid) {
            return {
                status: MoveStatus.INVALID,
            };
        }

        return {
            status: MoveStatus.SUCCESS,
            board: nextBoard
        };
    }

    checkForFilledBoard(board) {
        for (let j = 0; j < board.length; j++) {
            let boardColumn = board[j];
            for (let i = 0; i < boardColumn.length; i++) {
                let boardPosition = boardColumn[i];
                if (boardPosition === BoardToken.NONE) {
                    return false;
                }
            }
        }

        return true;
    }

    // Each win line is an array of board position coordinates:
    // e.g: winLine = [{row: 0, column: 0}, {row: 0, column: 1}, {row: 0, column : 2}, {row: 0, column: 3}] 
    checkForWin(board) {
        // Starts from bottom left of the board and ends on top right of board
        for (let columnIndex = 0; columnIndex < BoardDimensions.COLUMNS; columnIndex++) {
            for (let rowIndex = BoardDimensions.ROWS - 1; rowIndex > -1; rowIndex--) {
                // Check for vertical win
                let verticalWinCheckResult = this.tryFindWinningLine(board, {
                    startRowIndex: rowIndex,
                    startColumnIndex: columnIndex,
                    rowCountStep: -1,
                });

                if (verticalWinCheckResult.winner) {
                    return verticalWinCheckResult;
                }

                let horizontalWinCheckResult = this.tryFindWinningLine(board, {
                    startRowIndex: rowIndex,
                    startColumnIndex: columnIndex,
                    columnCountStep: -1,
                });

                if (horizontalWinCheckResult.winner) {
                    return horizontalWinCheckResult;
                }

                let leftDiagonalWinCheck = this.tryFindWinningLine(board, {
                    startRowIndex: rowIndex,
                    startColumnIndex: columnIndex,
                    rowCountStep: -1,
                    columnCountStep: -1
                });

                if (leftDiagonalWinCheck.winner) {
                    return leftDiagonalWinCheck;
                }

                let rightDiagonalWinCheck = this.tryFindWinningLine(board, {
                    startRowIndex: rowIndex,
                    startColumnIndex: columnIndex,
                    rowCountStep: -1,
                    columnCountStep: 1
                });

                if (rightDiagonalWinCheck.winner) {
                    return rightDiagonalWinCheck;
                }
            }
        }

        return {
            winLine: [],
            winner: PlayerColor.NONE
        };
    }

    /**
     * 
     * options: {
     *     startRowIndex,
     *     startColumnIndex,
     *     rowCountStep,
     *     columnCountStep
     * }
     * 
     * Any missing options will be 0 by default.
     */
    tryFindWinningLine(board, options) {
        // If `options` is null/undefined, set it's value to an empty object.
        options = options || {};

        let config = {
            startRowIndex: options.startRowIndex || 0,
            startColumnIndex: options.startColumnIndex || 0,
            rowCountStep: options.rowCountStep || 0,
            columnCountStep: options.columnCountStep || 0
        };

        let count = 0;
        let tokenToCheck = BoardToken.NONE;
        let winLine = [];

        for (let i = 0; i < BoardDimensions.WIN_LINE_LENGTH; i++) {
            let row = config.startRowIndex + config.rowCountStep * i;
            let column = config.startColumnIndex + config.columnCountStep * i;

            if (this.checkIfOutOfBounds(row, column)) {
                break;
            }

            let currentToken = board[row][column];
            if (currentToken === BoardToken.NONE) {
                break;
            }

            if (tokenToCheck === BoardToken.NONE) {
                tokenToCheck = currentToken;
            }

            if (currentToken === tokenToCheck) {
                count++;
            }

            winLine.push({ row: row, column: column });
        }

        if (count === BoardDimensions.WIN_LINE_LENGTH) {
            return {
                winLine: winLine,
                winner: FourInARowGame.boardTokenToPlayerColor(tokenToCheck),
            };
        }

        return {
            winLine: []
        };
    }

    checkIfOutOfBounds(row, column) {
        return row < 0
            || row > BoardDimensions.ROWS
            || column < 0
            || column > BoardDimensions.COLUMNS;
    }
} 