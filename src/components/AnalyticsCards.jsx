import React from 'react';

export default function AnalyticsCards({
    data = {},
    onOpenGraph,
    onOpenSpareSummary,
    onOver7Click,
    onWaitingResponseClick,
    onMaxCardClick,
    dashboardFilter
}) {
    const summary = {
        over7: data.over7 || 0,
        over7Percent: data.over7Percent || '0%',
        waitingResponse: data.waitingResponse || 0,
        waitingResponsePercent: data.waitingResponsePercent || '0%',
        maxPendingUnit: data.maxPendingUnit || '-',
        maxPendingCount: data.maxPendingCount || 0
    };

    return (
        <div className="dashboard" style={{ marginTop: '12px' }}>
            <div
                id="over7Card"
                className={`dashboard-card over7-card ${dashboardFilter === 'over7' ? 'active' : ''}`}
                onClick={onOver7Click}
                style={{ cursor: 'pointer' }}
            >
                <h3>Call เกิน 7 วัน</h3>
                <div className="value">{summary.over7}</div>
                <div className="progress-container">
                    <div className="progress-bar" style={{ width: summary.over7Percent }}></div>
                </div>
                <div className="progress-text">{summary.over7Percent}</div>
            </div>

            <div
                id="waitingResponseCard"
                className={`dashboard-card new-card ${dashboardFilter === 'waitingResponse' ? 'active' : ''}`}
                onClick={onWaitingResponseClick}
                style={{ cursor: 'pointer' }}
            >
                <h3>Call (รอตรวจสอบ)</h3>
                <div className="value">{summary.waitingResponse}</div>
                <div className="progress-container">
                    <div className="progress-bar" style={{ width: summary.waitingResponsePercent }}></div>
                </div>
                <div className="progress-text">{summary.waitingResponsePercent}</div>
            </div>

            <div
                id="maxCard"
                className="dashboard-card max-card"
                onClick={onMaxCardClick}
                style={{ cursor: 'pointer' }}
            >
                <h3>Call ค้างสูงสุด</h3>
                <div className="value" style={{ fontSize: '1.4em', paddingBottom: '5px' }}>
                    {summary.maxPendingUnit}
                </div>
                <div className="progress-text" style={{ fontSize: '1em', color: 'rgba(255,255,255,0.9)' }}>
                    {summary.maxPendingCount} Call
                </div>
            </div>

            <div id="graphCard" className="dashboard-card graph-card" style={{ cursor: 'pointer' }} onClick={onOpenGraph}>
                <h3><i className="fas fa-chart-line"></i> กราฟสรุป</h3>
                <div className="value"><i className="fas fa-chart-line"></i></div>
            </div>

            <div id="spareSummaryCard" className="dashboard-card spare-card" style={{ cursor: 'pointer' }} onClick={onOpenSpareSummary}>
                <h3><i className="fas fa-list-alt"></i> สรุปอะไหล่</h3>
                <div className="value"><i className="fas fa-list-alt"></i></div>
            </div>
        </div>
    );
}
