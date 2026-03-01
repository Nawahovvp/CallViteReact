import React from 'react';

const STATUS_COLORS = {
    "รอของเข้า": "var(--danger-color)",
    "สำเร็จ": "var(--success-color)",
    "ระหว่างขนส่ง": "var(--success-color)",
    "เบิกนวนคร": "var(--info-color)",
    "เบิกวิภาวดี": "#fd7e14",
    "เบิกศูนย์อะไหล่": "var(--info-color)",
    "รอตรวจสอบ": "var(--danger-color)",
    "ดำเนินการแล้ว": "var(--success-color)",
    "เกินLeadtime": "var(--danger-color)",
    "ดึงจากคลังอื่น": "#3f51b5",
    "เปิดรหัสใหม่": "#6f42c1",
    "ขอซื้อขอซ่อม": "#20c997",
    "SPACIAL": "#6c757d",
    "รอทดแทน": "#ffc107",
    "แจ้งCodeผิด": "#e83e8c"
};

function FilterButton({ label, count, isActive, onClick, textColor, isCard, isMini, variant }) {
    if (isCard) {
        return (
            <div
                className={`filter-card ${isActive ? 'active' : ''} ${isMini ? 'mini' : ''} ${variant ? `${variant}-variant` : ''}`}
                onClick={onClick}
                style={!isActive && textColor ? { borderColor: textColor } : {}}
            >
                <div className="filter-card-label">{label}</div>
                {!isMini && <div className="filter-card-count">{count !== undefined ? count : 0}</div>}
                {isActive && (
                    <div style={{
                        position: 'absolute',
                        top: '-6px',
                        right: '-6px',
                        background: '#fff',
                        borderRadius: '50%',
                        width: '18px',
                        height: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        zIndex: 2
                    }}>
                        <i className="fas fa-check-circle" style={{ fontSize: '16px', color: '#e74c3c' }}></i>
                    </div>
                )}
            </div>
        );
    }
    return (
        <button
            className={`modern-filter-btn ${isActive ? 'active' : ''}`}
            onClick={onClick}
            style={!isActive && textColor ? { color: textColor, fontWeight: 'bold' } : {}}
        >
            {label}
            {count !== undefined && <span className="filter-badge">{count}</span>}
        </button>
    );
}

function FilterRow({ label, id, options, activeValue, onSelect, useStatusColors, isAreaCenter, isCard, isSectioned, isMini }) {
    // Sort by count descending
    const sorted = Object.entries(options || {}).sort((a, b) => b[1] - a[1]);

    if (isSectioned) {
        const nonSA = sorted.filter(([key]) => !key.startsWith('SA'));
        const sa = sorted.filter(([key]) => key.startsWith('SA'));

        return (
            <div className="filter-section">
                {/* Line 1: Normal buttons */}
                {(nonSA.length > 0) && (
                    <>
                        <div className="filter-group-header">
                            <i className={isAreaCenter ? "fas fa-building" : (label === 'คลังตอบ' ? "fas fa-reply-all" : "fas fa-layer-group")}></i>
                            {isAreaCenter ? " ศูนย์บริการ / คลัง" : (label === 'คลังตอบ' ? " สถานะการตอบ" : " หน่วยงาน")}
                        </div>
                        <div className="filter-group-line">
                            {nonSA.map(([key, count]) => (
                                <FilterButton
                                    key={key}
                                    label={key}
                                    count={count}
                                    isActive={activeValue === key}
                                    onClick={() => onSelect(activeValue === key ? '' : key)}
                                    textColor={useStatusColors ? STATUS_COLORS[key] : undefined}
                                    isCard={isCard}
                                    variant="non-sa"
                                />
                            ))}
                        </div>
                    </>
                )}
                {/* Line 2: SA buttons */}
                {(sa.length > 0) && (
                    <>
                        <div className="filter-group-header">
                            <i className="fas fa-user-tie"></i> Service Advisor (SA)
                        </div>
                        <div className="filter-group-line">
                            {sa.map(([key, count]) => (
                                <FilterButton
                                    key={key}
                                    label={key}
                                    count={count}
                                    isActive={activeValue === key}
                                    onClick={() => onSelect(activeValue === key ? '' : key)}
                                    textColor={useStatusColors ? STATUS_COLORS[key] : undefined}
                                    isCard={isCard}
                                    variant="sa"
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="filter-row">
            <label className="modern-label">{label}</label>
            <div id={id} style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                <FilterButton
                    label="ทั้งหมด"
                    isActive={!activeValue}
                    onClick={() => onSelect('')}
                    isCard={isCard}
                />
                {sorted.map(([key, count]) => (
                    <FilterButton
                        key={key}
                        label={key}
                        count={count}
                        isActive={activeValue === key}
                        onClick={() => onSelect(activeValue === key ? '' : key)}
                        textColor={useStatusColors ? STATUS_COLORS[key] : undefined}
                        isCard={isCard}
                    />
                ))}
            </div>
        </div>
    );
}

export default function ControlPanel({
    searchTerm,
    onSearchChange,
    onSearch,
    onPrintTable,
    onExportCSV,
    onOpenSummary,
    onUpdateGuide,
    onRefresh,
    lastUpdated,
    availableFilters,
    // Single-select filter values
    teamPlantFilter,
    pendingUnitFilter,
    stockAnswerFilter,
    statusCallFilter,
    // Single-select filter setters
    onTeamPlantChange,
    onPendingUnitChange,
    onStockAnswerChange,
    onStatusCallChange
}) {
    return (
        <div id="searchContainer">
            <FilterRow
                label="ศูนย์พื้นที่"
                id="employeeFilter"
                options={availableFilters?.teamPlant}
                activeValue={teamPlantFilter}
                onSelect={onTeamPlantChange}
                isCard={true}
                isSectioned={true}
                isAreaCenter={true}
            />
            <FilterRow
                label="ค้างหน่วยงาน"
                id="pendingFilter"
                options={availableFilters?.pendingUnit}
                activeValue={pendingUnitFilter}
                onSelect={onPendingUnitChange}
                isCard={true}
                isSectioned={true}
            />
            <FilterRow
                label="คลังตอบ"
                id="stockFilter"
                options={availableFilters?.stockAnswer}
                activeValue={stockAnswerFilter}
                onSelect={onStockAnswerChange}
                useStatusColors={true}
                isCard={true}
                isSectioned={true}
            />


            <div className="search-row">
                <input
                    type="text"
                    id="searchInput"
                    placeholder="ค้นหา Ticket Number, Team, Material, TeamPlant, Brand, Call Type, ค้างหน่วยงาน, ผู้แจ้ง, Nawa, คลังตอบ, StatusCall, วันที่ตอบ..."
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                />
                <button id="searchButton" className="action-button" onClick={onSearch}>
                    <i className="fas fa-search"></i> ค้นหา
                </button>
                <button id="printTableButton" className="action-button" onClick={onPrintTable}>
                    <i className="fas fa-print"></i> พิมพ์
                </button>
                <button id="exportCsvButton" className="action-button" onClick={onExportCSV}>
                    <i className="fas fa-file-csv"></i> Export CSV
                </button>
                <button id="summaryButton" className="action-button" onClick={onOpenSummary}>
                    <i className="fas fa-list"></i> สรุปข้อมูล
                </button>
                <a
                    id="dataButton"
                    className="action-button"
                    href="https://docs.google.com/spreadsheets/d/18mvLsq44nr8hSIDU3e94ZbW1g2wu2AtWek_NwvxfWlA/edit?gid=1305837217#gid=1305837217"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <i className="fas fa-database"></i> Data
                </a>
                <span className="date-update-inline">
                    Data Update: <strong id="updateValue">{lastUpdated || '-'}</strong>
                </span>
                <button id="updateGuideButton" className="action-button ghost" onClick={onUpdateGuide}>
                    <i className="fas fa-info-circle"></i> วิธีอัพข้อมูล
                </button>
                <button id="refreshButton" className="action-button ghost" onClick={onRefresh}>
                    <i className="fas fa-sync-alt"></i> Refresh
                </button>
            </div>
        </div>
    );
}
