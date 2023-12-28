import React, {useState, useEffect} from "react";
import * as d3 from 'd3';

function Chart() {

    //#region Backend
    const [market, setMarket] = useState('EURUSD')
    const [interval, setInterval] = useState('1d')

    function handleMarketChange(e){
        setMarket(e.target.value);
    }
    function handleIntervalChange(e){
        setInterval(e.target.value);
    }

    const [user, setUser] = useState('1')

    const [chart_data, setChartData] = useState('');
    const [watchlist, setWatchlist] = useState('');
    const [df, setDf] = useState('');
    const [stats, setStats] = useState('');

    const markets = [
        'EURUSD',
        'USDJPY',
        'GBPUSD',
        'AUDUSD',
        'USDCAD',
        'USDCHF',
        'NZDUSD',
        'EURJPY',
        'GBPJPY',
        'EURGBP',
    ];
    const timeframes = [
        /*'1m',
        '5m',
        '15m',
        '30m',*/
        '1h',
        '1d',
        '5d',
        '1wk',
        '1mo',
    ];

    const fetchData = async (endpoint, setter) => {
        try {
            const response = await fetch(`http://127.0.0.1:5000${endpoint}`)
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const json = await response.json();
            setter(json);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    useEffect(() => {
        fetchData(`/chart/${market}=X/${interval}`, setChartData);
    }, [market, interval]);
    useEffect(() => {
        fetchData(`/watchlist/${user}`, setWatchlist);
    }, []);
    useEffect(() => {
        fetchData(`/stats/${market}`, setStats);
    }, [market]);


    useEffect(() => { // df creation
        let tempDf = [];
        for (let i in chart_data) {
          if (chart_data.hasOwnProperty(i)) {
            tempDf.push({
              index: chart_data[i]['index'],
              date: chart_data[i]['date'],
              o: chart_data[i]['o'],
              h: chart_data[i]['h'],
              l: chart_data[i]['l'],
              c: chart_data[i]['c'],
            });
          }
        }
        setDf(tempDf);
      }, [chart_data]);
    
    useEffect(() => { // resize handler
        if (df.length > 0) {
            drawChart();
        }
        
        let resizeTimer;
        const handleResize = () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(drawChart, 250);
        };
        
        window.addEventListener('resize', handleResize);
        
        // Remove event listener on cleanup
        return () => window.removeEventListener('resize', handleResize);
    }, [df]); // Depend on df

    //#endregion

    const drawChart = () => {
        if (chart_data) {

            d3.select('#chart').selectAll("*").remove();

            let green = '#4eb72c',
            red = '#ff3737';

            let w = document.getElementById('chart').offsetWidth,
            h = document.getElementById('chart').offsetHeight,
            m = 40,
            Mh = h - m*1.5,
            Mw = w - m*2;

            let svg = d3.select('#chart')
                .append('svg')
                    .attr('height', h)
                    .attr('width', w)
                    .attr('class', 'container')
                    .append('g')
                        .attr('transform', `translate(${m}, ${m})`);

            let getFrom = (d, key) => {
                let keylist = []
                for (let i = 0; i < d.length; i++) {
                    keylist.push(d[i][key])
                }
                return keylist
            }
            
            const x = d3.scaleBand()
                        .range([0, Mw])
                        .domain(getFrom(df, 'index'));

                svg.append('g')
                    .attr(
                        'transform',
                        `translate(0, ${Mh})`
                    )
                    .call(d3.axisBottom(x));
            
            const minMax = (d) => {
                let everything = [];
                for (const i in d) {
                    for (const k in d[i]) {
                        if (['o','h','l','c'].includes(k)) {
                            everything.push(d[i][k]);
                        }
                    }
                }
                let min = Math.min(...everything),
                    max = Math.max(...everything);
                return [min, max];
            }

            const y = d3.scaleLinear()
                        .domain(minMax(chart_data))
                        .range([Mh, 0])

            svg.append('g')
                .attr(
                    'transform',
                    `translate(${Mw}, 0)`
                )
                .call(d3.axisRight(y));

            let tooltip = d3.select('#chart')
                .append('div')
                .style('opacity', 0)
                .attr('class', 'tooltip')
                .style('background-color', 'white')
                .style('border-radius', '10px')
                .style('border', 'solid')
                .style('border-width', '1px')
                .style('margin-top', '10px')
                .style('padding', '20px');
            
            let mouseOver = function(d) {
                tooltip.style('opacity', 1);
                d3.select(this)
                    .style('stroke', 'black');
            }
    
            let colorAssign = (d, k) => {
                return d[k] === 1 ? green : red;
            }
    
            let mouseMove = function(e, d) {
                tooltip.html(
                    `
                    Open: <div style="color:${colorAssign(d, 'o_signal')}">${d.o.toPrecision(4)}</div>
                    High: <div style="color:${colorAssign(d, 'h_signal')}">${d.h.toPrecision(4)}</div>
                    Low: <div style="color:${colorAssign(d, 'l_signal')}">${d.l.toPrecision(4)}</div>
                    Close: <div style="color:${colorAssign(d, 'c_signal')}">${d.c.toPrecision(4)}</div>
                    `
                )
                .style('position', 'absolute')
                .style('left', `${e.x+20}px`)
                .style('top', `${e.y}px`)
                .style('opacity', 0.9)
            }
    
            let mouseLeave = function(d) {
                tooltip.style('opacity', 0)
                d3.select(this)
                    .style('opacity', 1)
                    .style('stroke', null)
            }


            svg.selectAll('candle')
                .data(df).enter()
                .append('rect')
                .attr('x', function (d) {return x(d['index'])})
                .attr('y', function (d) {
                    return d['o'] < d['c'] ? y(d['c']) : y(d['o'])
                })
                .attr('width', x.bandwidth() - 1)
                .attr('height', function(d) {
                    return Math.abs(y(d['o']) - y(d['c']));
                })
                .attr('fill', function (d) {
                    return d['o'] > d['c'] ? red : green;
                })
                .on('mouseover', mouseOver)
                .on('mousemove', mouseMove)
                .on('mouseleave', mouseLeave)

            svg.selectAll('candle-line')
                .data(df).enter()
                .append('line')
                .attr('x1', function (d){console.log(df); return x(d['index'])})
                .attr('x2', function (d){return x(d['index'])})
                .attr('y1', function (d){return y(d['l'])})
                .attr('y2', function (d){return y(d['h'])})
                .attr('stroke', function (d){return d['o'] > d['c'] ? red:green})
                .attr('stroke-width', 2)
                .attr('class', 'candle-line')
                .attr(
                    'transform',
                    `translate(${x.bandwidth()/2},0)`
                )
        }
    }

    const renderWatchlist = () => {
        if (watchlist) {
            return (
                <table id="watchlist-data">
                    <thead>
                        <tr>
                            <th>Currency</th>
                            <th>Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(watchlist).map(([pair, value]) => (
                            <tr key={pair}>
                                <td>{pair}</td>
                                <td>{value.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            );
        } else {
            return <p>Loading watchlist...</p>;
        }
    };

    const renderStats = () => {
        if (stats) {
            return (
                <div id='stats'>
                    <h3 id="stats-header">{stats['name']}</h3>
                    <h4 id='stats-subheader'>{stats['fname']}</h4>
                </div>

            )
        }
    };

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(drawChart, 250);
    });

    return (
        <div id='body'>
            <div id='header' className="module">
                <img src={require('./logo.png')} id='logo' className="header-element"/>
                <select name="markets" id="market-selector" className="header-element" value={market} onChange={handleMarketChange}>
                    {
                        markets.map(
                            (v, i) => <option key={i} value={v}>{v}</option>
                        )
                    }
                </select>
                <select name="timeframes" id="timeframe-selector" className="header-element" value={interval} onChange={handleIntervalChange}>
                    {
                        timeframes.map(
                            (v, i) => <option key={i} value={v}>{v}</option>
                        )
                    }
                </select>
            </div>
            <div id='main'>
                <div id='chart' className="module">{drawChart()}</div>
                <div id='side'>
                    <div id="watchlist" className="module">
                        <h2>Watchlist</h2>
                        {renderWatchlist()}
                    </div>
                    <div id="stats" className="module">
                        <h2>Stats</h2>
                        {renderStats()}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Chart;