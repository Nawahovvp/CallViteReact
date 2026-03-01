import React from 'react';

function GroupCard({ label, value, percent, id, onClick, isActive, typeClass }) {
    return (
        <div
            className={`dashboard-card group-card ${typeClass} ${isActive ? 'active' : ''}`}
            onClick={() => onClick(id)}
            style={{ minWidth: '150px' }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', marginBottom: '4px' }}>
                <h3 style={{ fontSize: '0.9em', margin: 0 }}>{label}</h3>
                {isActive && (
                    <div className="active-badge" style={{
                        background: '#fff',
                        color: '#28a745',
                        borderRadius: '50%',
                        width: '18px',
                        height: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        flexShrink: 0,
                        marginLeft: '4px'
                    }}>
                        <i className="fas fa-check" style={{ fontSize: '10px', fontWeight: 'bold' }}></i>
                    </div>
                )}
            </div>
            <div className="value" style={{ fontSize: '1.5em' }}>{value}</div>
            <div className="progress-container" style={{ height: '4px', backgroundColor: 'rgba(255,255,255,0.2)' }}>
                <div className="progress-bar" style={{ width: `${percent}%`, backgroundColor: '#fff' }}></div>
            </div>
            <div className="progress-text" style={{ color: '#fff' }}>{percent}%</div>
        </div>
    );
}

export default function GroupCards({ title, stats = [], onCardClick, activeFilter, prefix }) {
    if (!stats || stats.length === 0) return null;

    const getTypeClass = (label) => {
        if (prefix === 'calltype_') {
            const cleanLabel = String(label).toLowerCase();
            return `calltype-${cleanLabel}-card`;
        }
        if (prefix === 'gm_') return 'gm-card';
        return '';
    };

    return (
        <div className="group-cards-section" style={{ marginTop: '40px' }}>
            <h2 style={{
                fontSize: '1.2em',
                marginBottom: '20px',
                paddingLeft: '12px',
                color: 'var(--text-primary)',
                borderLeft: '4px solid var(--info-color)'
            }}>
                {title}
            </h2>
            <div className="dashboard group-dashboard">
                {stats.filter(item => item.value > 0).map((item, index) => (
                    <GroupCard
                        key={index}
                        label={item.label}
                        value={item.value}
                        percent={item.percent}
                        id={`${prefix}${item.label}`}
                        onClick={onCardClick}
                        isActive={activeFilter === `${prefix}${item.label}` || activeFilter === item.label}
                        typeClass={getTypeClass(item.label)}
                    />
                ))}
            </div>
        </div>
    );
}
