import React from 'react';

// Reusable card component
function DashboardCard({ title, value, percent, idBase, gradient = false, onClick, isActive }) {
    const isPercentString = typeof percent === 'string';
    const displayPercent = isPercentString ? percent : `${percent}%`;
    const widthPercent = isPercentString ? Number(percent.replace('%', '')) : percent;

    const style = gradient ? { background: 'linear-gradient(135deg, #6c757d 0%, #495057 100%)' } : {};
    const progressStyle = { width: `${widthPercent || 0}%`, ...gradient ? { backgroundColor: '#fff' } : {} };

    return (
        <div
            id={`${idBase}Card`}
            className={`dashboard-card ${idBase}-card ${isActive ? 'active' : ''}`}
            style={style}
            onClick={() => onClick(idBase)}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3>{title}</h3>
                {isActive && <i className="fas fa-check-circle" style={{ fontSize: '0.9em', color: '#fff' }}></i>}
            </div>
            <div className="value" id={`${idBase}Value`}>{value}</div>
            <div className="progress-container">
                <div id={`${idBase}Progress`} className="progress-bar" style={progressStyle}></div>
            </div>
            <div className="progress-text" id={`${idBase}Percent`}>{displayPercent}</div>
        </div>
    );
}

export default function DashboardCards({ data = {}, onCardClick, activeCard }) {
    // Use mock values or defaults if data is empty
    const summary = {
        total: data.total || 0,
        exceedLeadtime: data.exceedLeadtime || 0,
        exceedLeadtimePercent: data.exceedLeadtimePercent || '0%',
        pending: data.pending || 0,
        pendingPercent: data.pendingPercent || '0%',
        otherPlant: data.otherPlant || 0,
        otherPlantPercent: data.otherPlantPercent || '0%',
        success: data.success || 0,
        successPercent: data.successPercent || '0%',
        nawaVipa: data.nawaVipa || 0,
        nawaVipaPercent: data.nawaVipaPercent || '0%',
        spacial: data.spacial || 0,
        spacialPercent: data.spacialPercent || '0%',
        request: data.request || 0,
        requestPercent: data.requestPercent || '0%',
        newPart: data.newPart || 0,
        newPartPercent: data.newPartPercent || '0%',
    };

    // totalCard is active when activeCard is null (show all)
    const isActive = (id) => {
        if (id === 'total') return activeCard === null || activeCard === 'total';
        return activeCard === id;
    };

    return (
        <div id="dashboard" className="dashboard">
            <DashboardCard title="Call ทั้งหมด" value={summary.total} percent="100%" idBase="total" onClick={onCardClick} isActive={isActive('total')} />
            {summary.exceedLeadtime > 0 && (
                <DashboardCard title="Call (เกิน Leadtime)" value={summary.exceedLeadtime} percent={summary.exceedLeadtimePercent} idBase="exceedLeadtime" onClick={onCardClick} isActive={isActive('exceedLeadtime')} />
            )}
            {summary.pending > 0 && (
                <DashboardCard title="Call ค้าง (รอของเข้า)" value={summary.pending} percent={summary.pendingPercent} idBase="pending" onClick={onCardClick} isActive={isActive('pending')} />
            )}
            {summary.otherPlant > 0 && (
                <DashboardCard title="Call (ดึงจากคลังอื่น)" value={summary.otherPlant} percent={summary.otherPlantPercent} idBase="otherPlant" onClick={onCardClick} isActive={isActive('otherPlant')} />
            )}
            {summary.success > 0 && (
                <DashboardCard title="Call (ระหว่างขนส่ง)" value={summary.success} percent={summary.successPercent} idBase="success" onClick={onCardClick} isActive={isActive('success')} />
            )}
            {summary.nawaVipa > 0 && (
                <DashboardCard title="Call (เบิกศูนย์อะไหล่)" value={summary.nawaVipa} percent={summary.nawaVipaPercent} idBase="nawaVipa" onClick={onCardClick} isActive={isActive('nawaVipa')} />
            )}
            {summary.spacial > 0 && (
                <DashboardCard title="Call (SPACIAL)" value={summary.spacial} percent={summary.spacialPercent} idBase="spacial" gradient={true} onClick={onCardClick} isActive={isActive('spacial')} />
            )}
            {summary.request > 0 && (
                <DashboardCard title="Call (ขอซื้อขอซ่อม)" value={summary.request} percent={summary.requestPercent} idBase="request" onClick={onCardClick} isActive={isActive('request')} />
            )}
            {summary.newPart > 0 && (
                <DashboardCard title="Call (เปิดรหัสใหม่)" value={summary.newPart} percent={summary.newPartPercent} idBase="newPart" onClick={onCardClick} isActive={isActive('newPart')} />
            )}
        </div>
    );
}
