"use strict";

import { BoardDimensions, BoardToken, GameStatus, MoveStatus, PlayerColor } from "./constants/index.js";

export default class FourInARowGame {
    startingColor;
    currentTurn;
    status;
    history;


    /**
     * options = {
     *   startingColor?: PlayerColor
     *   history?: Board[]      
     * }
     *  
     */
    constructor(options) {
        let instanceOptions = options || {};
        this.startingColor = instanceOptions.startingColor || PlayerColor.YELLOW;
        this.currentTurn = this.startingColor;
        this.history = instanceOptions.history;

        if (instanceOptions.history) {
            this.history = instanceOptions.history;
        } else {
            this.history = [FourInARowGame.createBoard()];
        }

        this.status = GameStatus.START;
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
        if (this.status === GameStatus.START) {
            this.status = GameStatus.IN_PROGRESS;
        }

        let moveResults = this.performMove(columnIndex);
        this.updateCurrentTurn();
        return moveResults;
    }

    updateCurrentTurn() {
        // Current player's turn change with each go. With each turn history increases by 1.
        // However, by default, history has a length of 1 because of the initial state of the board is pushed first.
        let historyLengthHasEvenParity = this.history.length % 2 === 0;
        if (this.startingColor === PlayerColor.RED) {
            this.currentTurn = historyLengthHasEvenParity ? PlayerColor.YELLOW : PlayerColor.RED;
        } else {
            this.currentTurn = historyLengthHasEvenParity ? PlayerColor.RED : PlayerColor.YELLOW
        }
    }

    performMove(columnIndex) {
        // TODO: Replace slice with a deep copy method.
        // Inner arrays in 2D arrays in JavaScript are still references 
        // when you use the slice method!
        // let nextBoard = this.history.slice(this.history.length - 1)[0];
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

        let boardChangeResult = this.tryPerformMove(columnIndex, nextBoard);
        if (boardChangeResult.status === MoveStatus.INVALID) {
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
        this.history.push(boardChangeResult.board);

        let winCheckResult = this.checkForWin(nextBoard);
        if (winCheckResult.winner !== PlayerColor.NONE) {
            this.status = GameStatus.WIN;
            return {
                board: nextBoard,
                winner: winCheckResult.winner,
                status: {
                    value: MoveStatus.WIN
                },
                winLine: winCheckResult.winLine
            };
        }

        // If board is full right now, we can assume the game to be a draw
        // since there weren't any winning lines detected.
        if (this.checkForFilledBoard(nextBoard)) {
            this.status = GameStatus.DRAW;

            return {
                board: nextBoard,
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
            board: nextBoard,
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

    checkForWin(board) {
        // Each win line is an array of board position coordinates:
        // e.g: winLines.horizontal = [{row: 0, column: 0}, {row: 0, column: 1}, {row: 0, column : 2}, {row: 0, column: 3}]
        //
        // If there isn't a win line for a direction, the win line will be an empty array 
        // e.g winLines.diagonal = []

        let verticalWinCheck = this.checkForVerticalWin(board);
        if (verticalWinCheck.winner) {
            return {
                winner: verticalWinCheck.winner,
                winLine: verticalWinCheck.winLine
            };
        }

        let horizontalWinCheck = this.checkForHorizontalWin(board);
        if (horizontalWinCheck.winner) {
            return {
                winner: horizontalWinCheck.winner,
                winLine: horizontalWinCheck.winLine
            };
        }

        let diagonalWinCheck = this.checkForDiagonalWin(board);
        if (diagonalWinCheck.winner) {
            return {
                winner: diagonalWinCheck.winner,
                winLine: diagonalWinCheck.winLine
            };
        }

        return {
            winner: PlayerColor.NONE
        };
    }

    checkForVerticalWin(board) {
        if (BoardDimensions.ROWS < BoardDimensions.WIN_LINE_LENGTH) {
            return {
                winLine: []
            };
        }

        const tokenCheck = (rowIndex, columnIndex, tokenType) => {
            if (tokenType === board[rowIndex][columnIndex]
                && tokenType === board[rowIndex - 1][columnIndex]
                && tokenType === board[rowIndex - 2][columnIndex]
                && tokenType === board[rowIndex - 3][columnIndex]) {
                return {
                    winLine: [
                        { row: rowIndex, column: columnIndex },
                        { row: rowIndex - 1, column: columnIndex },
                        { row: rowIndex - 2, column: columnIndex },
                        { row: rowIndex - 3, column: columnIndex },
                    ],
                    winner: FourInARowGame.boardTokenToPlayerColor(tokenType)
                }
            }

            return {
                winLine: []
            }
        }

        let additionalBoardPositions = BoardDimensions.ROWS - BoardDimensions.WIN_LINE_LENGTH;
        for (let columnIndex = 0; columnIndex < BoardDimensions.COLUMNS; columnIndex++) {
            for (let rowIndex = BoardDimensions.ROWS - 1; rowIndex - additionalBoardPositions > -1; rowIndex--) {

                let yellowTokenCheckResult = tokenCheck(rowIndex, columnIndex, BoardToken.YELLOW);
                if (yellowTokenCheckResult.winLine.length > 0) {
                    return yellowTokenCheckResult;
                }

                let redTokenCheckResult = tokenCheck(rowIndex, columnIndex, BoardToken.RED);
                if (redTokenCheckResult.winLine.length > 0) {
                    return redTokenCheckResult;
                }
            }
        }

        return {
            winLine: []
        };

    }

    checkForHorizontalWin(board) {
        if (BoardDimensions.COLUMNS < BoardDimensions.WIN_LINE_LENGTH) {
            return {
                winLine: []
            };
        }

        const tokenCheck = (rowIndex, columnIndex, tokenType) => {
            if (tokenType === board[rowIndex][columnIndex]
                && tokenType === board[rowIndex][columnIndex - 1]
                && tokenType === board[rowIndex][columnIndex - 2]
                && tokenType === board[rowIndex][columnIndex - 3]) {
                return {
                    winLine: [
                        { row: rowIndex, column: columnIndex },
                        { row: rowIndex, column: columnIndex - 1 },
                        { row: rowIndex, column: columnIndex - 2 },
                        { row: rowIndex, column: columnIndex - 3 },
                    ],
                    winner: FourInARowGame.boardTokenToPlayerColor(tokenType)
                }
            }

            return {
                winLine: []
            }
        }

        let additionalBoardPositions = BoardDimensions.COLUMNS - BoardDimensions.WIN_LINE_LENGTH;
        for (let rowIndex = 0; rowIndex < BoardDimensions.ROWS; rowIndex++) {
            for (let columnIndex = BoardDimensions.COLUMNS - 1; columnIndex - additionalBoardPositions > -1; columnIndex--) {
                let yellowTokenCheckResult = tokenCheck(rowIndex, columnIndex, BoardToken.YELLOW);
                if (yellowTokenCheckResult.winLine.length > 0) {
                    return yellowTokenCheckResult;
                }

                let redTokenCheckResult = tokenCheck(rowIndex, columnIndex, BoardToken.RED);
                if (redTokenCheckResult.winLine.length > 0) {
                    return redTokenCheckResult;
                }
            }
        }

        return {
            winLine: []
        };
    }

    checkForDiagonalWin(board) {
        if (BoardDimensions.COLUMNS < BoardDimensions.WIN_LINE_LENGTH || BoardDimensions.ROWS < BoardDimensions.WIN_LINE_LENGTH) {
            return {
                winLine: []
            };
        }

        const tokenCheck = (rowIndex, columnIndex, tokenType) => {
            // Try left direction first (starting down, going upwards
            // towards left side of the board)

            if (rowIndex + 1 >= BoardDimensions.WIN_LINE_LENGTH
                && columnIndex + 1 >= BoardDimensions.WIN_LINE_LENGTH) {
                if (board[rowIndex][columnIndex]
                    === board[rowIndex - 1][columnIndex - 1]
                    === board[rowIndex - 2][columnIndex - 2]
                    === board[rowIndex - 3][columnIndex - 3]
                    === tokenType) {
                    return {
                        winLine: [
                            { row: rowIndex, column: columnIndex },
                            { row: rowIndex - 1, column: columnIndex - 1 },
                            { row: rowIndex - 2, column: columnIndex - 2 },
                            { row: rowIndex - 3, column: columnIndex - 3 },
                        ],
                        winner: FourInARowGame.boardTokenToPlayerColor(tokenType)
                    }
                }
            }

            // Now try right direction (starting down, going upwards towards
            // right side of the board)
            if (rowIndex + 1 >= BoardDimensions.WIN_LINE_LENGTH
                && columnIndex + BoardDimensions.WIN_LINE_LENGTH - 1 < BoardDimensions.COLUMNS) {
                if (tokenType == board[rowIndex][columnIndex]
                    && tokenType === board[rowIndex - 1][columnIndex + 1]
                    && tokenType === board[rowIndex - 2][columnIndex + 2]
                    && tokenType === board[rowIndex - 3][columnIndex + 3]) {
                    return {
                        winLine: [
                            { row: rowIndex, column: columnIndex },
                            { row: rowIndex - 1, column: columnIndex + 1 },
                            { row: rowIndex - 2, column: columnIndex + 2 },
                            { row: rowIndex - 3, column: columnIndex + 3 },
                        ],
                        winner: FourInARowGame.boardTokenToPlayerColor(tokenType)
                    }
                }
            }

            // No win lines found at this position

            return {
                winLine: []
            }
        }

        let additionalBoardPositions = BoardDimensions.ROWS - BoardDimensions.WIN_LINE_LENGTH;
        for (let columnIndex = 0; columnIndex < BoardDimensions.COLUMNS; columnIndex++) {
            for (let rowIndex = BoardDimensions.ROWS - 1; rowIndex - additionalBoardPositions > -1; rowIndex--) {
                let yellowTokenCheckResult = tokenCheck(rowIndex, columnIndex, BoardToken.YELLOW);
                if (yellowTokenCheckResult.winLine.length > 0) {
                    return yellowTokenCheckResult;
                }

                let redTokenCheckResult = tokenCheck(rowIndex, columnIndex, BoardToken.RED);
                if (redTokenCheckResult.winLine.length > 0) {
                    return redTokenCheckResult;
                }
            }
        }

        return {
            winLine: []
        };
    }
} 