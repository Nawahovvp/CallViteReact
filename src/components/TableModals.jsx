import React, { useState, useMemo } from 'react';
import { normalizeMaterial, getCleanTeamPlant, getDesc } from '../utils/helpers';
import { saveToGoogleSheet } from '../services/api';

import { PLANT_MAPPING } from '../utils/helpers';

const REVERSE_PLANT_MAP = {};
for (const [name, code] of Object.entries(PLANT_MAPPING)) {
    const cleanName = name.replace(/^Stock\s+/i, '').trim();
    REVERSE_PLANT_MAP[code] = cleanName;
    if (code.startsWith('0')) {
        REVERSE_PLANT_MAP[code.substring(1)] = cleanName;
    }
}

// ===== PO Details Modal =====
export function PoDetailsModal({ isOpen, onClose, material, description, poRawData, nawaRawData }) {
    const details = useMemo(() => {
        if (!isOpen || !material) return [];
        const mat = normalizeMaterial(material);
        if (!poRawData || poRawData.length === 0) return [];
        return poRawData.filter(row => {
            const rMat = normalizeMaterial(row["Material"] || "");
            const qty = parseFloat((row["Still to be delivered (qty)"] + "").replace(/,/g, ''));
            return rMat === mat && !isNaN(qty) && qty > 0;
        });
    }, [isOpen, material, poRawData]);

    const leadtime = useMemo(() => {
        if (!material || !nawaRawData) return "-";
        const mat = normalizeMaterial(material);
        const nMatch = nawaRawData.find(r => normalizeMaterial(r["Material"] || "") === mat);
        return (nMatch && nMatch["Planned Deliv. Time"]) ? nMatch["Planned Deliv. Time"] : "-";
    }, [material, nawaRawData]);

    if (!isOpen) return null;

    return (
        <div className="modal" style={{ zIndex: 1100 }}>
            <div className="premium-modal-content" style={{ maxWidth: '900px' }}>
                <div className="premium-modal-header">
                    <h3><i className="fas fa-file-invoice" style={{ marginRight: 10 }}></i> รายละเอียด PO</h3>
                    <span className="premium-modal-close" onClick={onClose}>&times;</span>
                </div>
                <div className="premium-modal-body">
                    <div className="modal-info-bar">
                        <div className="modal-info-item">
                            <span className="modal-info-label">Material:</span>
                            <span className="modal-info-value">{material}</span>
                        </div>
                        <div className="modal-info-item">
                            <span className="modal-info-label">Description:</span>
                            <span className="modal-info-value">{description}</span>
                        </div>
                    </div>

                    {details.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: '#888' }}>
                            <i className="fas fa-box-open" style={{ fontSize: 48, display: 'block', marginBottom: 10, opacity: 0.3 }}></i>
                            ไม่พบรายละเอียด PO
                        </div>
                    ) : (
                        <div className="compact-table-wrapper">
                            <table className="compact-table">
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: 'center', width: '120px' }}>กำหนดส่ง</th>
                                        <th>Purchasing Document</th>
                                        <th>Supplier</th>
                                        <th style={{ textAlign: 'center', width: '80px' }}>จำนวน</th>
                                        <th style={{ textAlign: 'center', width: '80px' }}>Leadtime</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {details.map((row, i) => {
                                        const dateStr = row["Document Date"] || row["Date"] || row["Delivery Date"] || row["Deliv.Date"] || "-";
                                        const doc = row["Purchasing Document"] || row["Purch.Doc."] || "-";
                                        const supplier = row["Supplier/Supplying Plant"] || "-";
                                        const qty = row["Still to be delivered (qty)"] || "-";

                                        // Overdue logic
                                        let isOverdue = false;
                                        if (dateStr !== "-") {
                                            const [d, m, y] = dateStr.split('/').map(Number);
                                            if (d && m && y) {
                                                const fullYear = y < 100 ? 2000 + y : y;
                                                const deliveryDate = new Date(fullYear, m - 1, d);
                                                const today = new Date();
                                                today.setHours(0, 0, 0, 0);
                                                if (deliveryDate < today) isOverdue = true;
                                            }
                                        }

                                        const cellStyle = { fontSize: '13px', padding: '10px 15px' };

                                        return (
                                            <tr key={i}>
                                                <td style={{ ...cellStyle, textAlign: 'center' }}>
                                                    {isOverdue ? (
                                                        <span style={{
                                                            background: '#fff3cd', color: '#856404',
                                                            padding: '2px 8px', borderRadius: '4px',
                                                            border: '1px solid #ffeeba', fontWeight: '600'
                                                        }}>
                                                            {dateStr}
                                                        </span>
                                                    ) : dateStr}
                                                </td>
                                                <td style={{ ...cellStyle, color: '#007bff' }}>{doc}</td>
                                                <td style={{ ...cellStyle }}>{supplier}</td>
                                                <td style={{ ...cellStyle, textAlign: 'center', fontWeight: 'bold', color: 'var(--success-color)' }}>{qty}</td>
                                                <td style={{ ...cellStyle, textAlign: 'center', color: 'var(--danger-color)', fontWeight: 'bold' }}>{leadtime}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ===== PR Details Modal =====
export function PrDetailsModal({ isOpen, onClose, material, description, prRawData }) {
    const details = useMemo(() => {
        if (!isOpen || !material) return [];
        const mat = normalizeMaterial(material);
        if (!prRawData || prRawData.length === 0) return [];
        return prRawData.filter(row => {
            const rMat = normalizeMaterial(row["Material"] || "");
            const req = parseFloat((row["Quantity requested"] || "0").toString().replace(/,/g, '')) || 0;
            const ord = parseFloat((row["Quantity ordered"] || "0").toString().replace(/,/g, '')) || 0;
            return rMat === mat && (req - ord) > 0;
        });
    }, [isOpen, material, prRawData]);

    if (!isOpen) return null;

    return (
        <div className="modal" style={{ zIndex: 1100 }}>
            <div className="premium-modal-content" style={{ maxWidth: '700px' }}>
                <div className="premium-modal-header">
                    <h3><i className="fas fa-file-alt" style={{ marginRight: 10 }}></i> รายละเอียด PR</h3>
                    <span className="premium-modal-close" onClick={onClose}>&times;</span>
                </div>
                <div className="premium-modal-body">
                    <div className="modal-info-bar">
                        <div className="modal-info-item">
                            <span className="modal-info-label">Material:</span>
                            <span className="modal-info-value">{material}</span>
                        </div>
                        <div className="modal-info-item">
                            <span className="modal-info-label">Description:</span>
                            <span className="modal-info-value">{description}</span>
                        </div>
                    </div>

                    {details.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: '#888' }}>
                            <i className="fas fa-box-open" style={{ fontSize: 48, display: 'block', marginBottom: 10, opacity: 0.3 }}></i>
                            ไม่พบรายละเอียด PR
                        </div>
                    ) : (
                        <div className="compact-table-wrapper">
                            <table className="compact-table">
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: 'center', width: '150px' }}>Requisition date</th>
                                        <th>Purchase Requisition</th>
                                        <th style={{ textAlign: 'center', width: '100px' }}>จำนวน</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {details.map((row, i) => {
                                        const date = row["Requisition date"] || "-";
                                        const doc = row["Purchase Requisition"] || "-";
                                        const req = parseFloat((row["Quantity requested"] || "0").toString().replace(/,/g, '')) || 0;
                                        const ord = parseFloat((row["Quantity ordered"] || "0").toString().replace(/,/g, '')) || 0;
                                        const qty = req - ord;
                                        return (
                                            <tr key={i}>
                                                <td style={{ textAlign: 'center', fontWeight: '500' }}>{date}</td>
                                                <td style={{ fontFamily: 'monospace', color: '#17a2b8' }}>{doc}</td>
                                                <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--success-color)' }}>{qty}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ===== OtherPlant Details Modal =====
export function OtherPlantModal({ isOpen, onClose, material, description, plantStockData }) {
    const plantDetails = useMemo(() => {
        if (!isOpen || !material || !plantStockData) return [];
        const mat = normalizeMaterial(material);
        // Build details from raw plantStockData
        const grouped = {};
        plantStockData.forEach(row => {
            const rMat = normalizeMaterial(row["Material"] || "");
            const plant = (row["Plant"] || "").toString().trim();
            if (rMat !== mat || !plant) return;
            const qty = parseFloat((row["Unrestricted"] + "").replace(/,/g, ''));
            if (!isNaN(qty)) {
                grouped[plant] = (grouped[plant] || 0) + qty;
            }
        });

        const sorted = Object.entries(grouped).map(([plantCode, qty]) => ({
            plantCode,
            displayName: REVERSE_PLANT_MAP[plantCode] || plantCode,
            qty
        }));

        // Sort: No "SA " first, then by quantity descending
        sorted.sort((a, b) => {
            const aHasSa = a.displayName.startsWith("SA ");
            const bHasSa = b.displayName.startsWith("SA ");
            if (aHasSa !== bHasSa) return aHasSa ? 1 : -1;
            return b.qty - a.qty;
        });

        return sorted;
    }, [isOpen, material, plantStockData]);

    if (!isOpen) return null;

    const total = plantDetails.reduce((sum, item) => sum + item.qty, 0);

    return (
        <div className="modal" style={{ zIndex: 1100 }}>
            <div className="premium-modal-content" style={{ maxWidth: '600px' }}>
                <div className="premium-modal-header">
                    <h3><i className="fas fa-warehouse" style={{ marginRight: 10 }}></i> รายละเอียดพื้นที่อื่น</h3>
                    <span className="premium-modal-close" onClick={onClose}>&times;</span>
                </div>
                <div className="premium-modal-body">
                    <div className="modal-info-bar">
                        <div className="modal-info-item">
                            <span className="modal-info-label">Material:</span>
                            <span className="modal-info-value">{material}</span>
                        </div>
                        <div className="modal-info-item">
                            <span className="modal-info-label">Description:</span>
                            <span className="modal-info-value">{description}</span>
                        </div>
                    </div>

                    {plantDetails.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: '#888' }}>
                            <i className="fas fa-store-slash" style={{ fontSize: 48, display: 'block', marginBottom: 10, opacity: 0.3 }}></i>
                            ไม่พบรายละเอียดพื้นที่อื่นสำหรับ Material นี้
                        </div>
                    ) : (
                        <div className="compact-table-wrapper">
                            <table className="compact-table">
                                <thead>
                                    <tr>
                                        <th>คลังสินค้า (Plant)</th>
                                        <th style={{ textAlign: 'center', width: '120px' }}>จำนวนคงเหลือ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {plantDetails.map((item, i) => (
                                        <tr key={i}>
                                            <td style={{ fontWeight: '500' }}>{item.displayName}</td>
                                            <td style={{ textAlign: 'center', fontWeight: 'bold', color: item.qty > 0 ? 'var(--success-color)' : '#999' }}>
                                                {item.qty.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                    <tr style={{ background: 'rgba(0,0,0,0.02)', fontWeight: 'bold' }}>
                                        <td style={{ textAlign: 'right', padding: '12px 15px' }}>รวมทั้งหมด</td>
                                        <td style={{ textAlign: 'center', padding: '12px 15px', color: '#20c997', fontSize: '15px' }}>
                                            {total.toLocaleString()}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ===== Status Edit Modal (StatusX / สถานะอะไหล่) =====
export function StatusEditModal({ isOpen, onClose, row, allData, onSaved }) {
    const [selectedStatus, setSelectedStatus] = useState('');
    const [savingAction, setSavingAction] = useState(null);

    // Build unique status options from allData
    const statusOptions = useMemo(() => {
        const uniqueStatuses = new Set(["เปิดรหัสใหม่", "แจ้งCodeผิด"]);
        if (allData) {
            allData.forEach(r => {
                if (r.StatusX && r.StatusX !== "-" && r.StatusX !== "") {
                    uniqueStatuses.add(r.StatusX);
                }
            });
        }
        return Array.from(uniqueStatuses).sort();
    }, [allData]);

    // Initialize selected status when row changes
    React.useEffect(() => {
        if (row) {
            setSelectedStatus(row.StatusX || "เปิดรหัสใหม่");
        }
    }, [row]);

    if (!isOpen || !row) return null;

    const ticket = String(row["Ticket Number"] || "").replace(/^'/, '').trim();
    const material = String(row["Material"] || "").replace(/^'/, '').trim();

    const handleSubmit = async (actionType) => {
        if (!ticket) return;
        setSavingAction(actionType);
        const payload = {
            ticketNumber: ticket,
            material: material,
            statusCall: row.StatusX || "",
            status: actionType === 'delete' ? "DELETE" : selectedStatus
        };

        try {
            await saveToGoogleSheet(payload);
            if (onSaved) onSaved(actionType, ticket, material, selectedStatus);
            onClose();
        } catch (err) {
            console.error("Error saving status edit", err);
            alert('ไม่สามารถบันทึกข้อมูลได้');
        } finally {
            setSavingAction(null);
        }
    };

    return (
        <div className="modal" style={{ zIndex: 1200 }}>
            <div className="modal-content" style={{ maxWidth: '450px' }}>
                <span className="close" onClick={onClose}>&times;</span>
                <h3 style={{ color: 'var(--header-bg)', marginBottom: 15 }}>แก้ไขสถานะอะไหล่</h3>
                <div style={{ marginBottom: 10 }}><strong>Ticket:</strong> {ticket}</div>
                <div style={{ marginBottom: 15 }}><strong>Material:</strong> {material}</div>

                <div style={{ marginBottom: 15 }}>
                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 5 }}>เลือกสถานะ:</label>
                    <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', fontSize: 14, borderRadius: 8, border: '1px solid #ccc' }}
                    >
                        {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button
                        onClick={() => handleSubmit('delete')}
                        disabled={savingAction !== null}
                        style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: savingAction === 'delete' ? '#e4606d' : '#dc3545', color: '#fff', fontWeight: 'bold', cursor: savingAction !== null ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        {savingAction === 'delete' ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-trash"></i>} ลบ
                    </button>
                    <button
                        onClick={onClose}
                        disabled={savingAction !== null}
                        style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid #ccc', background: '#f8f9fa', cursor: savingAction !== null ? 'not-allowed' : 'pointer' }}
                    >
                        ยกเลิก
                    </button>
                    <button
                        onClick={() => handleSubmit('save')}
                        disabled={savingAction !== null}
                        style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: savingAction === 'save' ? '#4cd26b' : '#28a745', color: '#fff', fontWeight: 'bold', cursor: savingAction !== null ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        {savingAction === 'save' ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>} บันทึก
                    </button>
                </div>
            </div>
        </div>
    );
}

// ===== Project Modal (StatusGroup click) =====
const PROJECT_STATUS_OPTIONS = ["SPACIAL", "รอทดแทน"];

export function ProjectModal({ isOpen, onClose, row, onSaved }) {
    const [selectedStatusCall, setSelectedStatusCall] = useState('SPACIAL');
    const [projectInput, setProjectInput] = useState('');
    const [savingAction, setSavingAction] = useState(null);

    React.useEffect(() => {
        if (row) {
            const currentStatusCall = row.StatusCall === "รอทดแทน" ? "รอทดแทน" : "SPACIAL";
            setSelectedStatusCall(currentStatusCall);
            // Only show data if it's from the manual spreadsheet (_isManualProject)
            const manualValue = row._isManualProject ? row.Answer1 : "";
            setProjectInput(manualValue && manualValue !== "-" && manualValue !== "ไม่ระบุ" ? manualValue : "");
        }
    }, [row]);

    if (!isOpen || !row) return null;

    const ticket = String(row["Ticket Number"] || "").replace(/^'/, '').trim();

    const handleSubmit = async (actionType) => {
        if (!ticket) return;
        setSavingAction(actionType);
        const payload = {
            action: 'project_update',
            ticketNumber: ticket,
            statusCall: selectedStatusCall,
            project: projectInput,
            status: actionType === 'delete' ? "DELETE" : "SAVE"
        };

        try {
            await saveToGoogleSheet(payload);
            if (onSaved) onSaved(actionType, ticket, selectedStatusCall, projectInput);
            onClose();
        } catch (err) {
            console.error("Error saving project data", err);
            alert('ไม่สามารถบันทึกข้อมูลได้');
        } finally {
            setSavingAction(null);
        }
    };

    return (
        <div className="modal" style={{ zIndex: 1200 }}>
            <div className="modal-content" style={{ maxWidth: '500px' }}>
                <span className="close" onClick={onClose}>&times;</span>
                <h3 style={{ color: 'var(--header-bg)', marginBottom: 15 }}>จัดการ SPACIAL / รอทดแทน</h3>
                <div style={{ marginBottom: 15 }}><strong>Ticket:</strong> {ticket}</div>

                <div style={{ marginBottom: 15 }}>
                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 8 }}>เลือก StatusCall:</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {PROJECT_STATUS_OPTIONS.map(opt => (
                            <button
                                key={opt}
                                onClick={() => setSelectedStatusCall(opt)}
                                style={{
                                    flex: 1, padding: '10px 16px', borderRadius: 8, border: '2px solid',
                                    borderColor: selectedStatusCall === opt ? '#0d6efd' : '#dee2e6',
                                    background: selectedStatusCall === opt ? '#0d6efd' : '#fff',
                                    color: selectedStatusCall === opt ? '#fff' : '#333',
                                    fontWeight: 'bold', cursor: 'pointer', fontSize: 14, transition: 'all 0.2s'
                                }}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ marginBottom: 15 }}>
                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 5 }}>SPACIAL / รายละเอียด:</label>
                    <input
                        type="text"
                        value={projectInput}
                        onChange={(e) => setProjectInput(e.target.value)}
                        placeholder="ระบุ SPACIAL หรือรายละเอียด"
                        style={{ width: '100%', padding: '8px 12px', fontSize: 14, borderRadius: 8, border: '1px solid #ccc', boxSizing: 'border-box' }}
                    />
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button
                        onClick={() => handleSubmit('delete')}
                        disabled={savingAction !== null}
                        style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: savingAction === 'delete' ? '#e4606d' : '#dc3545', color: '#fff', fontWeight: 'bold', cursor: savingAction !== null ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        {savingAction === 'delete' ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-trash"></i>} ลบ
                    </button>
                    <button
                        onClick={onClose}
                        disabled={savingAction !== null}
                        style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid #ccc', background: '#f8f9fa', cursor: savingAction !== null ? 'not-allowed' : 'pointer' }}
                    >
                        ยกเลิก
                    </button>
                    <button
                        onClick={() => handleSubmit('save')}
                        disabled={savingAction !== null}
                        style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: savingAction === 'save' ? '#4cd26b' : '#28a745', color: '#fff', fontWeight: 'bold', cursor: savingAction !== null ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        {savingAction === 'save' ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>} บันทึก
                    </button>
                </div>
            </div>
        </div>
    );
}

// ===== Timeline Modal (ดูรายละเอียด) =====
function parseTimeline(timeline) {
    if (!timeline) return [];
    const events = timeline.split('|');
    const rows = [];
    let previousDateObj = null;
    let previousPendingUnitStr = '-';

    events.forEach(event => {
        let eventTrim = event.trim();
        if (!eventTrim) return;

        // 1. Extract Date
        const dateMatch = eventTrim.match(/^(\d{2}\.\d{2})\s/);

        // If NO date match, merge with previous row if possible
        if (!dateMatch && rows.length > 0) {
            const lastIdx = rows.length - 1;
            rows[lastIdx].details = (rows[lastIdx].details ? rows[lastIdx].details + ' ' : '') + eventTrim;
            return; // Skip new row creation
        }

        let date = ''; let person = ''; let status = ''; let details = ''; let pendingUnit = '-'; let duration = '';
        let currentDateObj = null;

        if (dateMatch) {
            date = dateMatch[1];
            eventTrim = eventTrim.slice(dateMatch[0].length);
            const [day, month] = date.split('.').map(Number);
            if (day && month) {
                const today = new Date();
                let year = today.getFullYear();
                let tempDate = new Date(year, month - 1, day);
                if (tempDate.getTime() > today.getTime() + (180 * 24 * 60 * 60 * 1000)) {
                    year--;
                    tempDate = new Date(year, month - 1, day);
                }
                currentDateObj = tempDate;
            }
        }

        // Calculate Duration
        if (currentDateObj) {
            if (previousDateObj) {
                const diffTime = Math.abs(currentDateObj - previousDateObj);
                duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24)).toString();
            }
            previousDateObj = currentDateObj;
        }

        // 2. Extract Person
        if (eventTrim.startsWith('Backlog ')) { person = 'Backlog'; eventTrim = eventTrim.slice(8); }
        else if (eventTrim.startsWith('คุณ')) {
            const personEnd = eventTrim.indexOf(' ', 3);
            if (personEnd > -1) { person = eventTrim.slice(0, personEnd); eventTrim = eventTrim.slice(personEnd + 1); }
            else { person = eventTrim; eventTrim = ''; }
        } else if (eventTrim.startsWith('-')) {
            const personEnd = eventTrim.indexOf(' ', 1);
            if (personEnd > -1) { person = '-'; eventTrim = eventTrim.slice(personEnd + 1); }
        }

        // 3. Extract Pending Unit
        const pendingMarker = "แจ้งค้าง_";
        const pendingIndex = eventTrim.indexOf(pendingMarker);
        if (pendingIndex !== -1) {
            let tempText = eventTrim.substring(pendingIndex + pendingMarker.length);
            const stopKeywords = ['รอ', 'เกิน', 'จัด', 'อยู่', 'ส่ง', 'จอง', 'ซ่อม'];
            let minIndex = tempText.length;
            stopKeywords.forEach(keyword => {
                const index = tempText.indexOf(keyword);
                if (index !== -1 && index < minIndex) minIndex = index;
            });
            pendingUnit = tempText.substring(0, minIndex).trim();
            if (!pendingUnit && tempText.length > 0) {
                const firstSpace = tempText.indexOf(' ');
                pendingUnit = firstSpace > -1 ? tempText.substring(0, firstSpace).trim() : tempText.trim();
            }
        }
        if (!pendingUnit) pendingUnit = '-';

        if ((!pendingUnit || pendingUnit === '-') && date) {
            if (eventTrim.startsWith('แจ้งค้าง_')) {
                const pureStatus = eventTrim.substring(9).trim();
                const spaceIdx = pureStatus.indexOf(' ');
                pendingUnit = spaceIdx > -1 ? pureStatus.substring(0, spaceIdx) : pureStatus;
            }
            if (!pendingUnit) pendingUnit = '-';
        }

        // 4. Extract Status & Details
        if (eventTrim.startsWith('แจ้งค้าง_')) {
            const statusEnd = eventTrim.indexOf(' ', 9);
            if (statusEnd > -1) { status = eventTrim.slice(0, statusEnd); details = eventTrim.slice(statusEnd + 1); }
            else { status = eventTrim; details = ''; }
        } else {
            const statusEnd = eventTrim.indexOf(' ');
            if (statusEnd > -1) { status = eventTrim.slice(0, statusEnd); details = eventTrim.slice(statusEnd + 1); }
            else { status = eventTrim; details = ''; }
        }
        if (details.trim() === '-') details = '';

        let displayPendingUnit = '-';
        if (date) displayPendingUnit = previousPendingUnitStr;

        rows.push({ date, displayPendingUnit, person, duration, pendingUnit, status, details });

        if (pendingUnit && pendingUnit !== '-' && pendingUnit.trim() !== '') {
            previousPendingUnitStr = pendingUnit;
        }
    });

    return rows;
}

export function TimelineModal({ isOpen, onClose, row }) {
    if (!isOpen || !row) return null;

    const timeline = row["TimeLine"] || "";
    const timelineRows = useMemo(() => parseTimeline(timeline), [timeline]);

    function extractDate(dateTimeStr) {
        if (!dateTimeStr || typeof dateTimeStr !== 'string') return dateTimeStr || "-";
        const match = dateTimeStr.match(/^(\d{2}\/\d{2}\/\d{4})/);
        return match ? match[1] : dateTimeStr;
    }

    return (
        <div className="modal" style={{ zIndex: 1100 }}>
            <div className="premium-modal-content" style={{ maxWidth: '1100px' }}>
                <div className="premium-modal-header">
                    <h3><i className="fas fa-history" style={{ marginRight: 10 }}></i> รายละเอียดและประวัติ Timeline</h3>
                    <span className="premium-modal-close" onClick={onClose}>&times;</span>
                </div>

                <div className="premium-modal-body">
                    {/* Quick Info Grid */}
                    <div className="quick-info-grid">
                        <div className="info-card highlight">
                            <span className="info-card-label">Ticket Information</span>
                            <div className="info-card-value" style={{ fontSize: '18px', color: 'var(--info-color)' }}>{row["Ticket Number"] || "-"}</div>
                            <div style={{ fontSize: '13px', marginTop: '5px' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>วันที่แจ้ง:</span> {extractDate(row["DateTime"] || "-")}
                            </div>
                        </div>

                        <div className="info-card">
                            <span className="info-card-label">Parts & Asset</span>
                            <div className="info-card-value">{row["Material"] || "-"}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{getDesc(row) || "-"}</div>
                        </div>

                        <div className="info-card warning">
                            <span className="info-card-label">Location & Team</span>
                            <div className="info-card-value">{getCleanTeamPlant(row["TeamPlant"]) || "-"}</div>
                            <div style={{ fontSize: '13px', marginTop: '5px' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Team:</span> {row["Team"] || "-"}
                            </div>
                        </div>

                        <div className="info-card success">
                            <span className="info-card-label">Current Status</span>
                            <div className="info-card-value" style={{ color: 'var(--success-color)' }}>{row["StatusCall"] || "-"}</div>
                            <div style={{ fontSize: '13px', marginTop: '5px' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>ค้างหน่วยงาน:</span> {row["ค้างหน่วยงาน"] || "-"}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '25px', background: 'rgba(255,255,255,0.5)', padding: '15px', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>ผ่านมา</div>
                            <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{row["DayRepair"] || "-"} วัน</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Brand</div>
                            <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{row["Brand"] || "-"}</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Call Type</div>
                            <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{row["Call Type"] || "-"}</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>นวนคร</div>
                            <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{row["Nawa"] || "-"}</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>วิภาวดี</div>
                            <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{row["Vipa"] || "-"}</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>คลังพื้นที่</div>
                            <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{row["QtyPlant"] || "-"}</div>
                        </div>
                    </div>

                    <h4 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-primary)' }}>
                        <i className="fas fa-stream"></i> ประวัติ Timeline
                    </h4>

                    <div style={{ maxHeight: '500px', overflowY: 'auto', paddingRight: '10px' }}>
                        <ul className="timeline-vertical">
                            {timelineRows.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)', background: 'var(--card-bg)', borderRadius: '12px' }}>
                                    <i className="fas fa-ghost" style={{ fontSize: '30px', marginBottom: '10px', opacity: 0.3 }}></i>
                                    <div>ไม่มีข้อมูล Timeline</div>
                                </div>
                            ) : (
                                timelineRows.map((tr, i) => (
                                    <li key={i} className="timeline-v-item">
                                        <div className="timeline-v-dot"></div>
                                        <div className="timeline-v-card">
                                            <div className="timeline-v-header">
                                                <div className="timeline-v-date">
                                                    <i className="far fa-calendar-alt"></i> วันที่ {tr.date || '-'}
                                                </div>
                                                {tr.duration && (
                                                    <div className="timeline-v-duration">
                                                        ใช้เวลา {tr.duration} วัน
                                                    </div>
                                                )}
                                            </div>

                                            <div className="timeline-v-meta">
                                                <div className="timeline-v-meta-item">
                                                    <span className="timeline-v-label">ผู้แจ้ง:</span>
                                                    <span className="timeline-v-value">{tr.person || '-'}</span>
                                                </div>
                                                <div className="timeline-v-meta-item">
                                                    <span className="timeline-v-label">ค้างหน่วยงาน:</span>
                                                    <span className="timeline-v-value badge-pending">{tr.displayPendingUnit}</span>
                                                </div>
                                                <div className="timeline-v-meta-item">
                                                    <span className="timeline-v-label">แจ้งค้าง:</span>
                                                    <span className="timeline-v-value badge-unit">{tr.pendingUnit}</span>
                                                </div>
                                            </div>

                                            <div className="timeline-v-status">
                                                {tr.status || '-'}
                                            </div>

                                            {tr.details && (
                                                <div className="timeline-v-details">
                                                    {tr.details}
                                                </div>
                                            )}
                                        </div>
                                    </li>
                                ))
                            )}
                        </ul>
                    </div>
                </div>

                <div style={{ padding: '15px 25px', background: '#fff', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        <i className="fas fa-user-edit"></i> ผู้แจ้งผลล่าสุด: <strong>{row["UserAns"] || "-"}</strong> | แจ้งเมื่อ: <strong>{row["วันที่ตอบ"] || "-"}</strong>
                    </div>
                    <button className="action-button" onClick={onClose} style={{ padding: '8px 25px' }}>ปิดหน้าต่าง</button>
                </div>
            </div>
        </div>
    );
}
