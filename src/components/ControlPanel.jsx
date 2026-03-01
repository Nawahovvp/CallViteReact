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

function FilterButton({ label, count, isActive, onClick, textColor }) {
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

function FilterRow({ label, id, options, activeValue, onSelect, useStatusColors, isAreaCenter }) {
    // Sort by count descending
    const sorted = Object.entries(options || {}).sort((a, b) => b[1] - a[1]);

    if (isAreaCenter) {
        const nonSA = sorted.filter(([key]) => !key.startsWith('SA'));
        const sa = sorted.filter(([key]) => key.startsWith('SA'));

        return (
            <div className="filter-row area-center-row">
                <label className="modern-label" style={{ minWidth: '100px' }}>{label}</label>
                <div className="filter-groups-container" style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                    {/* Line 1: Normal buttons + All button */}
                    <div className="filter-group" style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                        <FilterButton
                            label="ทั้งหมด"
                            isActive={!activeValue}
                            onClick={() => onSelect('')}
                        />
                        {nonSA.map(([key, count]) => (
                            <FilterButton
                                key={key}
                                label={key}
                                count={count}
                                isActive={activeValue === key}
                                onClick={() => onSelect(activeValue === key ? '' : key)}
                                textColor={useStatusColors ? STATUS_COLORS[key] : undefined}
                            />
                        ))}
                    </div>
                    {/* Line 2: SA buttons */}
                    <div className="filter-group" style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                        {sa.map(([key, count]) => (
                            <FilterButton
                                key={key}
                                label={key}
                                count={count}
                                isActive={activeValue === key}
                                onClick={() => onSelect(activeValue === key ? '' : key)}
                                textColor={useStatusColors ? STATUS_COLORS[key] : undefined}
                            />
                        ))}
                    </div>
                </div>
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
                />
                {sorted.map(([key, count]) => (
                    <FilterButton
                        key={key}
                        label={key}
                        count={count}
                        isActive={activeValue === key}
                        onClick={() => onSelect(activeValue === key ? '' : key)}
                        textColor={useStatusColors ? STATUS_COLORS[key] : undefined}
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
                isAreaCenter={true}
            />
            <FilterRow
                label="ค้างหน่วยงาน"
                id="pendingFilter"
                options={availableFilters?.pendingUnit}
                activeValue={pendingUnitFilter}
                onSelect={onPendingUnitChange}
            />
            <FilterRow
                label="คลังตอบ"
                id="stockFilter"
                options={availableFilters?.stockAnswer}
                activeValue={stockAnswerFilter}
                onSelect={onStockAnswerChange}
                useStatusColors={true}
            />
            <FilterRow
                label="Status"
                id="statusCallFilter"
                options={availableFilters?.statusCall}
                activeValue={statusCallFilter}
                onSelect={onStatusCallChange}
                useStatusColors={true}
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
