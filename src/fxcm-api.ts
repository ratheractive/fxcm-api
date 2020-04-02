import io from 'socket.io-client';
import got from 'got';

import { Instrument, Offer, FxcmTimeUnit, Candle } from './model';

export enum FxcmEnvironment {
    prod = "prod",
    demo = "demo"
};

export class FxcmApi {

    private url: string;

    constructor(environment: FxcmEnvironment, private token: string) {

        this.url = environment === FxcmEnvironment.demo
            ? "https://api-demo.fxcm.com/"
            : "https://api.fxcm.com/";
    }

    socket: SocketIOClient.Socket;

    public async connect(): Promise<void> {

        return new Promise((resolve, reject) => {
            this.socket = io(this.url, {
                path: '/socket.io/',
                query: {
                    access_token: this.token
                },
            })

            this.socket.on('connect', async () => {
                console.debug('Socket.IO session has been opened: ', this.socket.id);

                this.socket.removeListener("error", onConnectionError)
                resolve();
            });

            var onConnectionError = (error: any) => {
                console.log('Socket.IO session error: ', error);
                reject(`Connection Error: ${error}`);
            };

            this.socket.on('error', onConnectionError);

            this.socket.on('disconnect', () => {
                console.log('Socket disconnected, terminating client.');
            });

            this.socket.on('connect_error', (error: any) => {
                console.error('failed to connect.');
                reject(`Connection Error: ${error}`);
            });
        });
    }

    public disconnect(): void {
        this.socket.disconnect();
    }

    public async getInstruments(): Promise<Instrument[]> {
        const resp = await this.get("trading/get_instruments");

        return resp.data.instrument;
    }

    public async subscribe(symbol: string): Promise<void> {
        await this.updateSubscriptions(symbol, true);
    }

    public async unsubscribe(symbol: string): Promise<void> {
        await this.updateSubscriptions(symbol, false);
    }

    public async getCandles(offerId: number, timeUnit: FxcmTimeUnit, from: Date, to: Date = null): Promise<Candle[]> {

        if (to != null) {
            const totalDays = Math.floor((to.getTime() - from.getTime()) / (1000 * 3600 * 24));

            if (totalDays > 15) {
                throw "The requested date range can not be longer then 15 days";
            }
        } else {
            var maxTo = new Date(from.valueOf());
            maxTo.setDate(maxTo.getDate() + 15);
            to = maxTo;
        }

        var fromInt = (from.valueOf() / 1000);

        var toInt = to.valueOf() / 1000;

        var resp = await this.get(`candles/${offerId}/${timeUnit}/?from=${fromInt}&to=${toInt}`);

        var respCandles: number[][] = resp.candles;

        return respCandles.map(d => new Candle(d));
    }

    private async updateSubscriptions(symbol: string, visible: boolean)
        : Promise<object> {

        return await this.post<object>("trading/update_subscriptions",
            {
                'symbol': symbol, 'visible': visible.toString()
            });
    }

    public async getOffers(): Promise<Offer[]> {
        const reqUrl = this.getModelPath('Offer');
        const responce = await this.get(reqUrl);
        return responce["offers"];
    }

    private getModelPath(model: string): string {
        return `trading/get_model?models=${model}`;
    }

    private async post<T>(path: string, body: any): Promise<T> {
        const options = this.buildReqOptions(body);
        const resp = await got.post(`${this.url}${path}`, options).json<any>();

        if (!resp.response.executed) {
            throw resp.response.error;
        }

        return resp as T;
    }

    private async get(path: string, body: any = undefined): Promise<any> {
        const options = this.buildReqOptions(body);
        const resp = await got.get(`${this.url}${path}`, options).json<any>();

        if (!resp.response.executed) {
            throw resp.response.error;
        }

        return resp;
    }

    private buildReqOptions(body: any): any {
        return {
            headers: {
                'Authorization': 'Bearer ' + this.socket.id + this.token,
            },
            json: body,
            responseType: 'json'
        };
    }
}
