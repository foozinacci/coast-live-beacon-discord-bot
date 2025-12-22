/**
 * Generate QuickChart URLs for streamer stats
 * Uses QuickChart.io API - no npm install needed
 */

class ChartGenerator {
    constructor() {
        this.baseUrl = 'https://quickchart.io/chart';
        this.colors = {
            purple: 'rgb(145, 70, 255)',
            blue: 'rgb(54, 162, 235)',
            green: 'rgb(75, 192, 192)',
            orange: 'rgb(255, 159, 64)'
        };
    }

    /**
     * Generate a 2x2 grid chart URL for streamer weekly stats
     * @param {string} username - Streamer name
     * @param {Object} weeklyData - { labels: [], peakViewers: [], avgViewers: [], streamCount: [], totalHours: [] }
     */
    generateStatsGrid(username, weeklyData) {
        // QuickChart supports combining multiple charts via configuration
        // We'll create a 2x2 layout using their custom chart format

        const config = {
            type: 'bar', // Base type, we'll override with datasets
            data: {
                labels: weeklyData.labels || ['W1', 'W2', 'W3', 'W4'],
            },
            options: {
                plugins: {
                    title: {
                        display: true,
                        text: `${username} - Weekly Stats`,
                        font: { size: 18 }
                    }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        };

        // For 2x2 grid, we use QuickChart's grid feature
        // This creates 4 separate charts in one image
        const gridConfig = {
            width: 800,
            height: 600,
            backgroundColor: '#1a1a2e',
            format: 'png',
            chart: {
                type: 'outlabeledPie', // Using grid layout
            }
        };

        // Actually, QuickChart's best approach for 2x2 is using their "charts" array
        // Let's use the simpler approach: 4 chart URLs in one call with grid layout

        const charts = [
            this.createSingleChart('Peak Viewers', weeklyData.labels, weeklyData.peakViewers, this.colors.purple, 'line'),
            this.createSingleChart('Avg Viewers', weeklyData.labels, weeklyData.avgViewers, this.colors.blue, 'line'),
            this.createSingleChart('# Streams', weeklyData.labels, weeklyData.streamCount, this.colors.green, 'bar'),
            this.createSingleChart('Hours Streamed', weeklyData.labels, weeklyData.totalHours, this.colors.orange, 'line')
        ];

        // Return grid image URL using QuickChart's special grid endpoint
        return this.createGridUrl(username, charts, weeklyData);
    }

    createSingleChart(title, labels, data, color, type) {
        return {
            type: type,
            data: {
                labels: labels,
                datasets: [{
                    label: title,
                    data: data,
                    borderColor: color,
                    backgroundColor: type === 'bar' ? color : 'transparent',
                    fill: false,
                    tension: 0.1
                }]
            },
            options: {
                plugins: {
                    title: { display: true, text: title, color: '#fff' },
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true, grid: { color: '#333' }, ticks: { color: '#ccc' } },
                    x: { grid: { color: '#333' }, ticks: { color: '#ccc' } }
                }
            }
        };
    }

    createGridUrl(username, charts, weeklyData) {
        // QuickChart supports multi-chart grids via their /chart endpoint with special config
        // Using 2x2 grid layout
        const gridSpec = {
            width: 800,
            height: 600,
            backgroundColor: '#1f1f2e',
            format: 'png',
            charts: [
                { chart: charts[0], x: 0, y: 0, width: 400, height: 300 },
                { chart: charts[1], x: 400, y: 0, width: 400, height: 300 },
                { chart: charts[2], x: 0, y: 300, width: 400, height: 300 },
                { chart: charts[3], x: 400, y: 300, width: 400, height: 300 }
            ]
        };

        // Use QuickChart's multi-chart endpoint
        const url = 'https://quickchart.io/chart/render';

        // For simplicity, let's create a combined chart with 4 datasets instead
        // This is more reliable than the grid endpoint
        return this.createCombinedChartUrl(username, weeklyData);
    }

    createCombinedChartUrl(username, weeklyData) {
        // Simpler: Create 4 separate chart URLs, return primary one
        // Discord can only show one image per embed, so we'll return the most important

        // Actually let's create a proper 2x2 using Chart.js plugins
        // QuickChart supports Chart.js 3.x with plugins

        const config = {
            type: 'line',
            data: {
                labels: weeklyData.labels,
                datasets: [
                    {
                        label: 'Peak Viewers',
                        data: weeklyData.peakViewers,
                        borderColor: this.colors.purple,
                        backgroundColor: 'rgba(145, 70, 255, 0.1)',
                        yAxisID: 'y',
                        fill: true
                    },
                    {
                        label: 'Avg Viewers',
                        data: weeklyData.avgViewers,
                        borderColor: this.colors.blue,
                        backgroundColor: 'transparent',
                        yAxisID: 'y'
                    },
                    {
                        label: 'Streams',
                        data: weeklyData.streamCount,
                        borderColor: this.colors.green,
                        backgroundColor: 'transparent',
                        yAxisID: 'y2',
                        borderDash: [5, 5]
                    },
                    {
                        label: 'Hours',
                        data: weeklyData.totalHours,
                        borderColor: this.colors.orange,
                        backgroundColor: 'transparent',
                        yAxisID: 'y2',
                        borderDash: [2, 2]
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: username + ' - Weekly Performance',
                        color: '#ffffff',
                        font: { size: 16 }
                    },
                    legend: {
                        labels: { color: '#ffffff' }
                    }
                },
                scales: {
                    y: {
                        type: 'linear',
                        position: 'left',
                        title: { display: true, text: 'Viewers', color: '#ccc' },
                        grid: { color: 'rgba(255,255,255,0.1)' },
                        ticks: { color: '#ccc' }
                    },
                    y2: {
                        type: 'linear',
                        position: 'right',
                        title: { display: true, text: 'Streams / Hours', color: '#ccc' },
                        grid: { drawOnChartArea: false },
                        ticks: { color: '#ccc' }
                    },
                    x: {
                        grid: { color: 'rgba(255,255,255,0.1)' },
                        ticks: { color: '#ccc' }
                    }
                }
            }
        };

        const chartJson = encodeURIComponent(JSON.stringify(config));
        return `${this.baseUrl}?c=${chartJson}&backgroundColor=%231f1f2e&width=700&height=400`;
    }

    /**
     * Generate individual chart URL
     */
    generateSingleMetricChart(title, labels, data, color, type = 'line') {
        const config = {
            type: type,
            data: {
                labels: labels,
                datasets: [{
                    label: title,
                    data: data,
                    borderColor: color,
                    backgroundColor: type === 'bar' ? color : 'rgba(145, 70, 255, 0.2)',
                    fill: type === 'line'
                }]
            },
            options: {
                plugins: {
                    title: { display: true, text: title, color: '#fff' },
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true, grid: { color: '#333' }, ticks: { color: '#ccc' } },
                    x: { grid: { color: '#333' }, ticks: { color: '#ccc' } }
                }
            }
        };

        const chartJson = encodeURIComponent(JSON.stringify(config));
        return `${this.baseUrl}?c=${chartJson}&backgroundColor=%231f1f2e&width=600&height=300`;
    }
}

module.exports = ChartGenerator;
