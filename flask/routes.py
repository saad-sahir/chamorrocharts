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
    stats_map = {
        'EURUSD=X' : {
            'value': 1.102,
            'cv': 0.0011,

            'day':([0.9948, 1.00364], [1.001, 1.0025]),
            'week':([0.98641, 1.17557], [1.001, 1.0425]),

            '1w': 0.19,
            '1m': -1.59,
            '3m': -5.09,
            '6m': -9.41,
            '1y': -14.89
        }
    }
    return jsonify(stats_map[market])

if __name__ == '__main__':
    app.run(debug=True)