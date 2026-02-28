import React from 'react';

const COLUMNS = [
    { key: 'StatusGroup', label: 'StatusCall' },
    { key: 'DayRepair', label: 'ผ่านมา' },
    { key: 'DateTime', label: 'วันที่แจ้ง' },
    { key: 'Brand', label: 'Brand' },
    { key: 'Call Type', label: 'Call Type' },
    { key: 'Team', label: 'Team' },
    { key: 'TeamPlant', label: 'ศูนย์พื้นที่' },
    { key: 'ค้างหน่วยงาน', label: 'ค้างหน่วยงาน' },
    { key: 'Ticket Number', label: 'Ticket Number' },
    { key: 'Material', label: 'Material' },
    { key: 'Description', label: 'Description' },
    { key: 'Rebuilt', label: 'ทดแทน' },
    { key: 'PR', label: 'PR' },
    { key: 'PO', label: 'PO' },
    { key: 'Nawa', label: 'นวนคร' },
    { key: 'Vipa', label: 'วิภาวดี' },
    { key: 'Request', label: 'นอกรอบ' },
    { key: 'QtyPlant', label: 'คลังพื้นที่' },
    { key: 'OtherPlant', label: 'พื้นที่อื่น' },
    { key: 'PendingStockDays', label: 'ค้างStock' },
    { key: 'StockStartDate', label: 'แจ้งคลัง' },
    { key: 'คลังตอบ', label: 'คลังตอบ' },
    { key: 'StatusCall', label: 'สถานะอะไหล่' },
    { key: 'วันที่ตอบ', label: 'วันที่ตอบ' },
    { key: 'UserAns', label: 'ผู้แจ้ง' },
    { key: 'Answer1', label: 'แจ้งผล' },
];

export default function DataTable({
    data = [],
    isLoading,
    sortConfig,
    onSort,
    selectedRows,
    onSelectAll,
    onSelectRow,
    currentPage,
    itemsPerPage,
    onPageChange,
    onItemsPerPageChange,
    totalPages,
    onPoClick,
    onPrClick,
    onOtherPlantClick,
    onStatusXClick,
    onStatusGroupClick,
    onDetailClick,
    onNawaClick,
    onTicketClick
}) {
    const dataWithGroup = React.useMemo(() => {
        let lastTicket = null;
        let isEvenGroup = false;
        return data.map(row => {
            const currentTicket = row['Ticket Number'];
            if (currentTicket !== lastTicket) {
                isEvenGroup = !isEvenGroup;
                lastTicket = currentTicket;
            }
            return { ...row, _groupClass: isEvenGroup ? 'row-group-even' : 'row-group-odd' };
        });
    }, [data]);

    return (
        <>
            <div className="table-container">
                <table id="data-table" className="compact">
                    <thead>
                        <tr>
                            <th style={{ width: 28, minWidth: 28, textAlign: 'center' }}>
                                <input type="checkbox" onChange={onSelectAll} />
                            </th>
                            {COLUMNS.map(col => (
                                <th
                                    key={col.key}
                                    data-column={col.key}
                                    className="sortable"
                                    onClick={() => onSort(col.key)}
                                >
                                    {col.label}
                                    {sortConfig?.key === col.key && (
                                        <span className="arrow">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                                    )}
                                </th>
                            ))}
                            <th data-column="detail" style={{ width: 70, minWidth: 70 }}>รายละเอียด</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan={COLUMNS.length + 2} style={{ textAlign: 'center' }}>กำลังโหลดข้อมูล...</td></tr>
                        ) : dataWithGroup.length === 0 ? (
                            <tr><td colSpan={COLUMNS.length + 2} style={{ textAlign: 'center' }}>ไม่พบข้อมูล</td></tr>
                        ) : (
                            dataWithGroup.map((row, index) => {
                                const nawaVal = pf(row['Nawa']);
                                const vipaVal = pf(row['Vipa']);
                                const requestVal = pf(row['Request']);
                                const qtyPlantVal = pf(row['QtyPlant']);
                                const otherPlantVal = pf(row['OtherPlant']);
                                const prVal = pf(row['PR']);
                                const poVal = pf(row['PO']);
                                const statusXVal = row['StatusX'] || row['StatusCall'] || '';
                                const pendingUnit = (row['ค้างหน่วยงาน'] || '').trim();
                                const paddingClass = row._highlight ? `row-pulse-${row._highlight}` : '';
                                const rowClassName = [row._groupClass, paddingClass].filter(Boolean).join(' ');
                                return (
                                    <tr key={row.id || index} className={rowClassName}>
                                        <td style={{ textAlign: 'center', width: 28 }}>
                                            <input type="checkbox" checked={selectedRows?.includes(row.id)} onChange={() => onSelectRow(row.id)} />
                                        </td>
                                        {/* StatusGroup */}
                                        <td data-column="StatusGroup">
                                            <span style={{
                                                cursor: 'pointer', textDecoration: 'underline',
                                                color: getStatusColor(row['StatusCall']), fontWeight: 'bold'
                                            }} onClick={(e) => { e.stopPropagation(); onStatusGroupClick?.(row); }}>
                                                {row['StatusCall']}
                                            </span>
                                        </td>
                                        {/* DayRepair */}
                                        <td data-column="DayRepair" style={{ textAlign: 'center' }}>
                                            {!isNaN(parseFloat(row['DayRepair'])) ? Math.floor(parseFloat(row['DayRepair'])) : '-'}
                                        </td>
                                        <td data-column="DateTime">{extractDate(row['DateTime'])}</td>
                                        <td data-column="Brand">{row['Brand']}</td>
                                        <td data-column="Call Type">{row['Call Type']}</td>
                                        <td data-column="Team">{row['Team']}</td>
                                        <td data-column="TeamPlant">{cleanTeamPlant(row['TeamPlant'])}</td>
                                        <td data-column="ค้างหน่วยงาน">{row['ค้างหน่วยงาน']}</td>
                                        <td data-column="Ticket Number">
                                            <span style={{ cursor: 'pointer', textDecoration: 'underline', color: '#0d6efd', fontWeight: 'bold' }}
                                                onClick={(e) => { e.stopPropagation(); onTicketClick?.(row); }}>
                                                {row['Ticket Number']}
                                            </span>
                                        </td>
                                        <td data-column="Material">{row['Material']}</td>
                                        <td data-column="Description">{row['Description']}</td>
                                        {/* Rebuilt */}
                                        <td data-column="Rebuilt" style={{ textAlign: 'center' }}>
                                            {row['Rebuilt'] && String(row['Rebuilt']).trim() !== '-' && String(row['Rebuilt']).trim() !== '0' ? (
                                                <span className="request-pill" style={{ backgroundColor: '#0d6efd', color: '#fff' }}>{row['Rebuilt']}</span>
                                            ) : ''}
                                        </td>
                                        {/* PR */}
                                        <td data-column="PR" style={{ textAlign: 'center' }}>
                                            {prVal > 0 ? (
                                                <span className="request-pill" style={{ backgroundColor: '#e83e8c', color: '#fff', cursor: 'pointer' }}
                                                    onClick={(e) => { e.stopPropagation(); onPrClick?.(row); }}>{row['PR']}</span>
                                            ) : ''}
                                        </td>
                                        {/* PO */}
                                        <td data-column="PO" style={{ textAlign: 'center' }}>
                                            {poVal > 0 ? (
                                                <span className="request-pill" style={{ backgroundColor: '#0d6efd', color: '#fff', cursor: 'pointer' }}
                                                    onClick={(e) => { e.stopPropagation(); onPoClick?.(row); }}>{row['PO']}</span>
                                            ) : ''}
                                        </td>
                                        {/* Nawa */}
                                        <td data-column="Nawa" style={{ textAlign: 'center' }}>
                                            {nawaVal > 0 ? (
                                                <span className="request-pill" style={{ backgroundColor: 'var(--success-color)', color: '#fff', cursor: 'pointer' }}
                                                    onClick={(e) => { e.stopPropagation(); onNawaClick?.(row); }}>{row['Nawa']}</span>
                                            ) : ''}
                                        </td>
                                        {/* Vipa */}
                                        <td data-column="Vipa" style={{ textAlign: 'center' }}>
                                            {vipaVal > 0 ? (
                                                <span className="request-pill" style={{ backgroundColor: '#fd7e14', color: '#fff' }}>{row['Vipa']}</span>
                                            ) : ''}
                                        </td>
                                        {/* Request */}
                                        <td data-column="Request" style={{ textAlign: 'center' }}>
                                            {requestVal > 0 ? (<span className="request-pill">{row['Request']}</span>) : ''}
                                        </td>
                                        {/* QtyPlant */}
                                        <td data-column="QtyPlant" style={{ textAlign: 'center' }}>
                                            {qtyPlantVal > 0 ? (
                                                <span className="request-pill" style={{ backgroundColor: '#6f42c1', color: '#fff' }}>{row['QtyPlant']}</span>
                                            ) : ''}
                                        </td>
                                        {/* OtherPlant */}
                                        <td data-column="OtherPlant" style={{ textAlign: 'center' }}>
                                            {otherPlantVal > 0 ? (
                                                <span className="request-pill" style={{ backgroundColor: '#e91e63', color: '#fff', cursor: 'pointer' }}
                                                    onClick={(e) => { e.stopPropagation(); onOtherPlantClick?.(row); }}>{row['OtherPlant']}</span>
                                            ) : ''}
                                        </td>
                                        {/* PendingStockDays */}
                                        <td data-column="PendingStockDays" style={{ fontWeight: 'bold', color: 'var(--danger-color)', textAlign: 'center' }}>
                                            {row['PendingStockDays'] === "0" || !row['PendingStockDays'] ? "" : row['PendingStockDays']}
                                        </td>
                                        {/* StockStartDate */}
                                        <td data-column="StockStartDate">{row['StockStartDate'] === "-" || !row['StockStartDate'] ? "" : row['StockStartDate']}</td>
                                        {/* คลังตอบ */}
                                        <td data-column="คลังตอบ" style={{
                                            color: row['คลังตอบ'] === 'รอตรวจสอบ' ? 'var(--danger-color)' :
                                                row['คลังตอบ'] === 'ดำเนินการแล้ว' ? 'var(--success-color)' : 'inherit',
                                            fontWeight: ['รอตรวจสอบ', 'ดำเนินการแล้ว'].includes(row['คลังตอบ']) ? 'bold' : 'normal'
                                        }}>{row['คลังตอบ']}</td>
                                        {/* StatusCall (StatusX) */}
                                        <td data-column="StatusCall" style={{
                                            cursor: 'pointer', textDecoration: 'underline',
                                            color: getStatusColor(statusXVal), fontWeight: 'bold'
                                        }} onClick={(e) => { e.stopPropagation(); onStatusXClick?.(row); }}>
                                            {statusXVal}
                                        </td>
                                        <td data-column="วันที่ตอบ">{row['วันที่ตอบ']}</td>
                                        <td data-column="UserAns">{row['UserAns']}</td>
                                        <td data-column="Answer1">{row['Answer1']}</td>
                                        {/* Detail */}
                                        <td data-column="detail">
                                            <button className="detail-button" onClick={() => onDetailClick?.(row)}>ดูรายละเอียด</button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <div className="pagination">
                <button onClick={() => onPageChange(1)} disabled={currentPage === 1}><i className="fas fa-chevron-left"></i><i className="fas fa-chevron-left"></i></button>
                <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}><i className="fas fa-chevron-left"></i></button>
                <div id="pageNumbers"><span>{currentPage} / {totalPages || 1}</span></div>
                <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}><i className="fas fa-chevron-right"></i></button>
                <button onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages}><i className="fas fa-chevron-right"></i><i className="fas fa-chevron-right"></i></button>
                <div className="items-per-page">
                    <label htmlFor="itemsPerPage">รายการต่อหน้า:</label>
                    <select id="itemsPerPage" value={itemsPerPage} onChange={(e) => onItemsPerPageChange(Number(e.target.value))}>
                        <option value="10">10</option>
                        <option value="20">20</option>
                        <option value="30">30</option>
                    </select>
                </div>
            </div>
        </>
    );
}

// Utilities
function pf(val) { return parseFloat((val || "0").toString().replace(/,/g, '')) || 0; }
function extractDate(s) { if (!s || typeof s !== 'string') return s || "-"; const m = s.match(/^(\d{2}\/\d{2}\/\d{4})/); return m ? m[1] : s; }
function cleanTeamPlant(tp) { return (tp || "").replace(/Stock\s*/gi, '').trim(); }
function getStatusColor(status) {
    const c = {
        "รอของเข้า": "var(--danger-color)", "เกินLeadtime": "#8b0000", "ดึงจากคลังอื่น": "#3f51b5",
        "เปิดรหัสใหม่": "#6f42c1", "สำเร็จ": "var(--success-color)", "ระหว่างขนส่ง": "var(--success-color)",
        "เบิกนวนคร": "var(--info-color)", "เบิกศูนย์อะไหล่": "var(--info-color)", "เบิกวิภาวดี": "#fd7e14",
        "ขอซื้อขอซ่อม": "#20c997", "Project": "#6c757d", "รอทดแทน": "#ffc107", "แจ้งCodeผิด": "var(--danger-color)"
    };
    return c[status] || "#6c757d";
}
