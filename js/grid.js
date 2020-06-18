export class Grid {
    constructor(gridSize, gridColumns, gridRows, gridMin) {
        this.gridSize = gridSize;
        this.gridColumns = gridColumns;
        this.gridRows = gridRows;
        this.gridMin = gridMin;
        this.rects = [];
        this.currentRects = [
            { x: 0, y: 0, w: this.gridColumns, h: this.gridRows }
        ];
    }

    splitCurrentRect() {
        if (this.currentRects.length == 0) {
            return;
        }

        const currentRect = this.currentRects.shift();
        const cutVertical = (currentRect.w > currentRect.h);
        const cutSide = cutVertical ? currentRect.w : currentRect.h;
        const cutSize = cutVertical ? "w" : "h";
        const cutAxis = cutVertical ? "x" : "y";

        if (cutSide > this.gridMin * 2) {
            const rect1Size = this.randomInRange(this.gridMin, cutSide - this.gridMin);
            const rect1 = Object.assign({}, currentRect, { [cutSize]: rect1Size });
            const rect2 = Object.assign({}, currentRect, { [cutAxis]: currentRect[cutAxis] + rect1Size, [cutSize]: currentRect[cutSize] - rect1Size });
            this.currentRects.push(rect1, rect2);
        }
        else {
            this.rects.push(currentRect);
            this.splitCurrentRect();
        }

    }

    generateRects() {
        while ( this.currentRects.length ) {
            this.splitCurrentRect();
        }
        return this.rects;
    }

    randomInRange (min, max) {
        return Math.floor (Math.random() * (max - min + 1)) + min;
    }
}
