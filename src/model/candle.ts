export class Candle {

    constructor(values: number[]) {
        this.date = new Date(values[0] * 1000);
        this.bidOpen = values[1];
        this.bidClose = values[2];
        this.bidHigh = values[3];
        this.bidLow = values[4];
        this.askOpen = values[5];
        this.askClose = values[6];
        this.askHigh = values[7];
        this.askLow = values[8];
        this.volume = values[9];
    }

    public date: Date;
    public bidOpen: number;
    public bidClose: number;
    public bidLow: number;
    public bidHigh: number;
    public askOpen: number;
    public askClose: number;
    public askLow: number;
    public askHigh: number;
    public volume: number;
}