import { FxcmApi, FxcmEnvironment, Instrument, FxcmTimeUnit } from "../src/index";

let fxcmApi: FxcmApi;

let instruments: Instrument[];

require('dotenv').config()

beforeAll(async () => {
    if (process.env.FXCM_TOKEN === undefined) {
        console.error("Please create a .env file in the root of the repository and set FXCM_TOKEN=<your token> in it.");

        throw "Missing .env configuration. Create it with FXCM_TOKEN env var.";
    }

    fxcmApi = new FxcmApi(FxcmEnvironment.demo, process.env.FXCM_TOKEN);

    jest.setTimeout(60000);
    await fxcmApi.connect();

    instruments = await fxcmApi.getInstruments();
});

afterAll(() => {
    fxcmApi.disconnect();
});

test("Get candles from outside available range returns empty results", async () => {
    var offerId = await getOfferId();
    var from = new Date("1990-01-01T00:00:00.000Z");

    var candles = await fxcmApi.getCandles(offerId, FxcmTimeUnit.m1, from);

    expect(candles).toHaveLength(0);
});

test("Instruments, Offers, Subscribe, Unsbscribe work", async () => {
    const testInstrument = instruments.filter(i => !i.visible)[0];

    var res = await fxcmApi.getOffers();

    expect(res.map(r => r.currency)).not.toContainEqual(testInstrument.symbol);

    await fxcmApi.subscribe(testInstrument.symbol);

    var res = await fxcmApi.getOffers();

    expect(res.map(r => r.currency)).toContainEqual(testInstrument.symbol);

    await fxcmApi.unsubscribe(testInstrument.symbol);

    res = await fxcmApi.getOffers();

    expect(res.map(r => r.currency)).not.toContainEqual(testInstrument.symbol);
});

test("get candles works when called correctly", async () => {
    var offerId = await getOfferId();

    var from = new Date("2017-04-02T11:00:00.000Z");

    var to = new Date("2017-04-12T18:00:00.000Z");

    var candles = await fxcmApi.getCandles(offerId, FxcmTimeUnit.m1, from, to);

    expect(candles.length).toEqual(11364);
});

test("subscribe fail when symbol does not exist", async () => {

    try {
        await fxcmApi.subscribe("abrak");
    } catch (e) {
        expect(e).toEqual("Invalid symbol.");
    }
});

test("unsubscribe fail when symbol does not exist", async () => {
    try {
        await fxcmApi.unsubscribe("abrak");
    } catch (e) {
        expect(e).toEqual("Invalid symbol.");
    }
});


let getOfferId = async () => {

    var offers = await fxcmApi.getOffers();

    let offerId: number;

    if (offers.length > 0) {
        offerId = offers[0].offerId;
    }
    else {
        await fxcmApi.subscribe(instruments.filter(i => !i.visible)[0].symbol);

        var offers = await fxcmApi.getOffers();

        offerId = offers[0].offerId;
    }

    return offerId;
}