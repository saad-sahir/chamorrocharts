from flask import Flask, jsonify
from flask_cors import CORS
import yfinance as yf
from datetime import datetime, timedelta
import pandas as pd
import json
import time

app = Flask(__name__)
CORS(app)

wl_dict = {
    1: [
        "EURUSD=X",
        "USDJPY=X",
        "GBPUSD=X",
        "AUDUSD=X",
        "USDCAD=X",
        "USDCHF=X",
        "NZDUSD=X",
        "EURJPY=X",
        "GBPJPY=X",
        "EURGBP=X"
    ]
}

def preprocess(df):
    df = df.drop(['Volume', 'Adj Close'], axis=1)
    rename = {
        'Open': 'o',
        'High': 'h',
        'Low': 'l',
        'Close': 'c',
    }
    if 'Datetime' in df.columns:
        df = df.rename(columns={
            "Datetime": "date",
            **rename,
        })
    elif 'Date' in df.columns:
        df = df.rename(columns={
            "Date": "date",
            **rename,
        })
    df['index'] = range(len(df))

    j = json.loads(df.T.to_json())
    return j

@app.route('/chart/<market>/<interval>', methods=['GET'])
def chart(market, interval):
    now = datetime.now()
    start = now - timedelta(days=29 if interval in ['1d','1h','15m', '5m'] else 364)
    df = yf.download(market, start=start, end=now, interval=interval).reset_index()
    df = preprocess(df)
    return jsonify(df)

@app.route('/watchlist/<int:user>', methods=['GET'])
def watchlist(user):
    global wl_dict
    markets = wl_dict[user]
    wl = {}
    for market in markets:
        d = yf.download(market, start=(datetime.now()-timedelta(hours=12)), end=datetime.now(), interval='1h').reset_index()
        d = preprocess(d)
        i = max(d.keys())
        wl[market[:-2]] = d[i]['c']
        time.sleep(.25)
    return jsonify(wl)

@app.route('/stats/<market>', methods=['GET'])
def statistics(market):

    pair_map = {
        "EURUSD=X": "Euro / US Dollar",
        "USDJPY=X": "US Dollar / Japanese Yen",
        "GBPUSD=X": "British Pound / US Dollar",
        "AUDUSD=X": "Australian Dollar / US Dollar",
        "USDCAD=X": "US Dollar / Canadian Dollar",
        "USDCHF=X": "US Dollar / Swiss Franc",
        "NZDUSD=X": "New Zealand Dollar / US Dollar",
        "EURJPY=X": "Euro / Japanese Yen",
        "GBPJPY=X": "British Pound / Japanese Yen",
        "EURGBP=X": "Euro / British Pound"
    }

    
    df = chart(market,'1D', js=False)[['date', 'c']] \
        .sort_values(by='date', ascending=False) \
        .reset_index() \
        .drop('index', axis=1) \
    
    stats = {
        "name" : market[:-2],
        "fname" : pair_map[market] if pair_map[market] else 0,
        "range" : (min(df['c']), max(df['c'])),
        "c1D" : -df['c'].diff(periods = 2)[2], # change 1D
        "c4D" : -df['c'].diff(periods = 5)[5], # change 4D
        "c1W" : -df['c'].diff(periods = 8)[8], # change 1W
        "c1M" : -df['c'].diff(periods = 31)[31], # change 1M
        "c3M" : -df['c'].diff(periods = 93)[93], # change 3M
        "c3M" : -df['c'].diff(periods = 186)[186], # change 6M
    }

    return jsonify(stats)

if __name__ == '__main__':
    app.run(debug=True)