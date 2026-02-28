import React, { useEffect, useRef, useMemo, useState } from 'react';
import { Chart, registerables } from 'chart.js';
import { getCleanTeamPlant, getDesc, normalizeMaterial } from '../utils/helpers';

Chart.register(...registerables);

// ===== Detail Modal =====
export function DetailModal({ isOpen, onClose, content }) {
    if (!isOpen) return null;
    return (
        <div className="modal">
            <div className="modal-content">
                <span className="close" onClick={onClose}>×</span>
                <h2>รายละเอียด</h2>
                <div dangerouslySetInnerHTML={{ __html: content }}></div>
            </div>
        </div>
    );
}

// ===== Graph Modal (Stacked Bar Chart) =====
const CHART_COLORS = {
    "รอของเข้า": '#dc3545',
    "สำเร็จ": '#28a745',
    "ระหว่างขนส่ง": '#28a745',
    "เบิกศูนย์อะไหล่": '#6f42c1',
    "ขอซื้อขอซ่อม": '#20c997',
    "เกินLeadtime": '#fd7e14',
    "ดึงจากคลังอื่น": '#17a2b8',
    "เปิดรหัสใหม่": '#007bff',
    "แจ้งCodeผิด": '#e83e8c',
    "รอทดแทน": '#ffc107',
    "Project": '#343a40',
    "ไม่ระบุ": '#6c757d'
};

function hexToRgb(hex) {
    if (!hex || hex.startsWith('var')) return null;
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `${r}, ${g}, ${b}`;
}

export function GraphModal({ isOpen, onClose, data = [], onFilterPendingUnit }) {
    const canvasRef = useRef(null);
    const chartRef = useRef(null);

    useEffect(() => {
        if (!isOpen || !canvasRef.current || data.length === 0) return;

        // Pivot: ค้างหน่วยงาน × StatusCall
        const pivotData = {};
        const ticketCounted = {};
        const statusSet = new Set();

        data.forEach(row => {
            const ticket = row["Ticket Number"];
            if (ticketCounted[ticket]) return;
            ticketCounted[ticket] = true;
            const unit = (row["ค้างหน่วยงาน"] || "ไม่ระบุ").toString().trim();
            const status = row["StatusCall"] || "ไม่ระบุ";
            statusSet.add(status);
            if (!pivotData[unit]) pivotData[unit] = {};
            pivotData[unit][status] = (pivotData[unit][status] || 0) + 1;
        });

        const statusCalls = [...statusSet].sort();
        let pendingUnits = Object.keys(pivotData);

        // Sort by total descending
        pendingUnits.sort((a, b) => {
            const totalA = statusCalls.reduce((s, st) => s + (pivotData[a]?.[st] || 0), 0);
            const totalB = statusCalls.reduce((s, st) => s + (pivotData[b]?.[st] || 0), 0);
            return totalB - totalA;
        });

        if (pendingUnits.length > 200) pendingUnits = pendingUnits.slice(0, 200);

        const datasets = statusCalls
            .filter(st => st !== "ไม่ระบุ" && pendingUnits.some(u => (pivotData[u]?.[st] || 0) > 0))
            .map(status => {
                const colorKey = status === "สำเร็จ" ? "ระหว่างขนส่ง" : status;
                const rgb = hexToRgb(CHART_COLORS[colorKey] || '#6c757d');
                return {
                    label: status === "สำเร็จ" ? "ระหว่างขนส่ง" : status,
                    data: pendingUnits.map(u => pivotData[u]?.[status] || 0),
                    borderColor: CHART_COLORS[colorKey] || '#6c757d',
                    backgroundColor: rgb ? `rgba(${rgb}, 0.8)` : '#6c757d',
                    borderWidth: 2,
                    borderRadius: 4,
                    stack: 'CallStack'
                };
            });

        if (chartRef.current) chartRef.current.destroy();

        const ctx = canvasRef.current.getContext('2d');
        chartRef.current = new Chart(ctx, {
            type: 'bar',
            data: { labels: pendingUnits, datasets },
            options: {
                responsive: true,
                interaction: { intersect: false, mode: 'index' },
                animation: { duration: 2000, easing: 'easeOutQuart' },
                scales: {
                    x: { stacked: true, ticks: { maxRotation: 45, minRotation: 45 }, grid: { display: false } },
                    y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1 } }
                },
                onClick: (event, elements) => {
                    if (elements.length > 0 && onFilterPendingUnit) {
                        const idx = elements[0].index;
                        const unit = pendingUnits[idx];
                        onFilterPendingUnit(unit);
                    }
                },
                plugins: {
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            title: (ctx) => `ค้างหน่วยงาน: ${ctx[0].label}`,
                            label: (ctx) => ctx.parsed.y > 0 ? `${ctx.dataset.label}: ${ctx.parsed.y} Call` : null,
                            footer: (ctx) => {
                                let total = 0;
                                ctx.forEach(c => { if (c.parsed.y > 0) total += c.parsed.y; });
                                return `รวม: ${total} Call`;
                            }
                        }
                    },
                    legend: { display: true, position: 'top', labels: { usePointStyle: true, padding: 20 } }
                }
            },
            plugins: [{
                id: 'totalLabel',
                afterDatasetsDraw(chart) {
                    const { ctx, data: chartData, scales } = chart;
                    const xScale = scales.x;
                    const yScale = scales.y;
                    ctx.save();
                    ctx.textAlign = 'center';
                    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-color') || '#333';
                    ctx.font = 'bold 12px sans-serif';
                    for (let i = 0; i < chartData.labels.length; i++) {
                        let totalVal = 0;
                        chartData.datasets.forEach(ds => { totalVal += (ds.data[i] || 0); });
                        if (totalVal > 0) {
                            const x = xScale.getPixelForValue(i);
                            const y = yScale.getPixelForValue(totalVal);
                            ctx.fillText(totalVal, x, y - 5);
                        }
                    }
                    ctx.restore();
                }
            }]
        });

        return () => {
            if (chartRef.current) {
                chartRef.current.destroy();
                chartRef.current = null;
            }
        };
    }, [isOpen, data, onFilterPendingUnit]);

    if (!isOpen) return null;
    return (
        <div className="modal" onClick={(e) => e.target.className === 'modal' && onClose()}>
            <div className="graph-modal-content">
                <span className="close" onClick={onClose}>×</span>
                <h2>จำนวน Call ตามค้างหน่วยงานและสถานะ</h2>
                <canvas ref={canvasRef} style={{ maxHeight: '600px', height: '60vh' }}></canvas>
            </div>
        </div>
    );
}

// ===== Summary Modal (Pivot: TeamPlant × StatusCall) =====
export function SummaryModal({ isOpen, onClose, data = [] }) {
    const summaryHtml = useMemo(() => {
        if (!data || data.length === 0) return '<p>ไม่มีข้อมูล</p>';

        const ticketCounts = {};
        const pivotData = {};
        const teamPlantSet = new Set();
        const statusCallSet = new Set();

        data.forEach(row => {
            const ticket = row["Ticket Number"];
            if (ticketCounts[ticket]) return;
            ticketCounts[ticket] = true;
            const tp = getCleanTeamPlant(row["TeamPlant"] || "ไม่ระบุ");
            const status = row["StatusCall"] || "ไม่ระบุ";
            teamPlantSet.add(tp);
            statusCallSet.add(status);
            if (!pivotData[tp]) pivotData[tp] = {};
            pivotData[tp][status] = (pivotData[tp][status] || 0) + 1;
        });

        const teamPlants = [...teamPlantSet];
        const statusCalls = [...statusCallSet].sort();
        const totalCalls = Object.keys(ticketCounts).length;

        // Sort team plants by total descending
        const sorted = teamPlants.map(tp => {
            const total = statusCalls.reduce((s, st) => s + (pivotData[tp]?.[st] || 0), 0);
            return { tp, total };
        }).sort((a, b) => b.total - a.total);

        const headerCells = statusCalls.map(s => `<th class='fixed-width'>${s}</th>`).join('');
        const bodyRows = sorted.map(({ tp, total }) => {
            const cells = statusCalls.map(s => {
                const val = pivotData[tp]?.[s] || 0;
                return `<td class='fixed-width'>${val === 0 ? '-' : val}</td>`;
            }).join('');
            return `<tr><td>${tp}</td><td class='fixed-width'>${total === 0 ? '-' : total}</td>${cells}</tr>`;
        }).join('');

        const totalRow = statusCalls.map(s => {
            const total = teamPlants.reduce((sum, tp) => sum + (pivotData[tp]?.[s] || 0), 0);
            return `<td class='fixed-width'><strong>${total === 0 ? '-' : total}</strong></td>`;
        }).join('');

        return `
            <div><span class='label'>จำนวน Call ทั้งหมด:</span> <span class='value'>${totalCalls} Call</span></div>
            <h3>จำนวน Call ค้างตามศูนย์พื้นที่และสถานะ Call</h3>
            <table class='detail-table summary-table'>
                <thead><tr><th>ศูนย์พื้นที่</th><th class='fixed-width'>รวม</th>${headerCells}</tr></thead>
                <tbody>${bodyRows}
                <tr><td><strong>รวม</strong></td><td class='fixed-width'><strong>${totalCalls === 0 ? '-' : totalCalls}</strong></td>${totalRow}</tr>
                </tbody>
            </table>`;
    }, [data]);

    if (!isOpen) return null;
    return (
        <div className="modal" onClick={(e) => e.target.className === 'modal' && onClose()}>
            <div className="modal-content">
                <div className="summary-shell">
                    <div className="summary-topbar">
                        <div className="summary-title">
                            <span className="summary-badge">Summary</span>
                            <span>สรุปข้อมูล Call ค้าง</span>
                        </div>
                        <div>
                            <button className="print-button" onClick={() => {
                                const w = window.open('', '_blank');
                                w.document.write(`<html><head><title>สรุปข้อมูล</title><style>table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:center}th{background:#f4f4f4}</style></head><body>${summaryHtml}</body></html>`);
                                w.document.close();
                                w.print();
                            }}>
                                <i className="fas fa-print"></i> <span>พิมพ์สรุป</span>
                            </button>
                            <span className="close" onClick={onClose}>×</span>
                        </div>
                    </div>
                    <div className="summary-body">
                        <div dangerouslySetInnerHTML={{ __html: summaryHtml }}></div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ===== Spare Summary Modal (Full Port from call.js) =====
export function SpareSummaryModal({ isOpen, onClose, data = [], rawSources = {} }) {
    const [prgFilter, setPrgFilter] = useState('');
    const [supplierFilter, setSupplierFilter] = useState('');

    const computedData = useMemo(() => {
        if (!data || data.length === 0) return null;
        const { nawaRawData = [], poRawData = [], prRawData = [] } = rawSources;

        // Filter: exclude ระหว่างขนส่ง, only rows with material
        const filteredRows = data.filter(row => {
            const sc = (row["StatusCall"] || "").trim();
            const mat = (row["Material"] || "").trim();
            return sc !== "ระหว่างขนส่ง" && mat !== "";
        });
        if (filteredRows.length === 0) return null;

        // Collect pending units
        const pendingUnitsSet = new Set();
        filteredRows.forEach(row => {
            const unit = (row["ค้างหน่วยงาน"] || "ไม่ระบุ").replace(/Stock\s*/gi, '').trim();
            if (unit) pendingUnitsSet.add(unit);
        });
        const pendingUnits = [...pendingUnitsSet].sort();

        // Build pivot: Material|Description → { total, [pendingUnit]: count }
        const pivotData = {};
        let totalQuantity = 0;
        filteredRows.forEach(row => {
            const matDesc = row["Material"] + '|' + getDesc(row);
            const pending = (row["ค้างหน่วยงาน"] || "ไม่ระบุ").replace(/Stock\s*/gi, '').trim();
            if (!pivotData[matDesc]) {
                pivotData[matDesc] = { total: 0 };
                pendingUnits.forEach(u => pivotData[matDesc][u] = 0);
            }
            if (pending) {
                pivotData[matDesc].total++;
                pivotData[matDesc][pending]++;
                totalQuantity++;
            }
        });

        const sortedMaterials = Object.keys(pivotData).sort((a, b) => pivotData[b].total - pivotData[a].total);
        const topMaterial = sortedMaterials.length > 0 ? sortedMaterials[0].replace('|', '\t') : '-';

        // PRG lookup from nawaRawData
        const prgMap = {};
        const nm = (mat) => String(mat || '').trim().replace(/^0+/, '');

        sortedMaterials.forEach(matDesc => {
            const [material] = matDesc.split('|');
            const matNorm = nm(material);
            let prgVal = '-';
            if (nawaRawData.length > 0) {
                const nMatch = nawaRawData.find(r => nm(r["Material"] || "") === matNorm);
                if (nMatch) {
                    const pgKey = Object.keys(nMatch).find(k =>
                        k.trim() === "Purchasing Group" || k.trim() === "Purch. Group" || k.trim() === "PG"
                    );
                    if (pgKey && nMatch[pgKey]) {
                        const pg = nMatch[pgKey].toString().trim();
                        if (pg === "301") prgVal = "ในประเทศ";
                        else if (pg === "302") prgVal = "ต่างประเทศ";
                        else prgVal = pg;
                    }
                }
            }
            prgMap[material] = prgVal;
        });

        // PR lookup from prRawData
        const prMap = {};
        if (prRawData.length > 0) {
            prRawData.forEach(r => {
                const matKey = nm(r["Material"] || "");
                const qty = parseFloat(String(r["Order Quantity"] || r["Quantity"] || "0").replace(/,/g, ''));
                if (matKey && !isNaN(qty) && qty > 0) {
                    prMap[matKey] = (prMap[matKey] || 0) + qty;
                }
            });
        }

        // PO lookups from poRawData
        const poMap = {};
        const poDetailMap = {};
        if (poRawData.length > 0) {
            sortedMaterials.forEach(matDesc => {
                const [material] = matDesc.split('|');
                const matNorm = nm(material);
                const poRecords = poRawData.filter(r => {
                    const rMat = nm(r["Material"] || "");
                    const qty = parseFloat(String(r["Still to be delivered (qty)"] || "0").replace(/,/g, ''));
                    return rMat === matNorm && !isNaN(qty) && qty > 0;
                });

                let totalPo = 0;
                poRecords.forEach(r => {
                    const qty = parseFloat(String(r["Still to be delivered (qty)"] || "0").replace(/,/g, ''));
                    if (!isNaN(qty)) totalPo += qty;
                });
                poMap[material] = totalPo;

                // Find closest delivery date PO record
                if (poRecords.length > 0) {
                    let closest = poRecords[0];
                    let closestDate = null;
                    poRecords.forEach(r => {
                        const dateStr = r["Document Date"] || r["Date"] || r["Delivery Date"] || r["Deliv.Date"] || "";
                        let d = null;
                        if (dateStr) {
                            const parts = dateStr.split('/');
                            if (parts.length === 3) {
                                d = new Date(parseInt(parts[2]) < 2000 ? parseInt(parts[2]) + 2000 : parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
                            } else {
                                d = new Date(dateStr);
                            }
                        }
                        if (d && !isNaN(d.getTime())) {
                            if (!closestDate || d < closestDate) { closestDate = d; closest = r; }
                        }
                    });
                    poDetailMap[material] = {
                        delivDate: closest["Document Date"] || closest["Date"] || closest["Delivery Date"] || closest["Deliv.Date"] || "-",
                        poDoc: closest["Purchasing Document"] || closest["Purch.Doc."] || "-",
                        supplier: (closest["Supplier/Supplying Plant"] || "-").trim(),
                        qtyDeliv: closest["Still to be delivered (qty)"] || "-"
                    };
                }
            });
        }

        // Nawa lookup
        const nawaMap = {};
        if (nawaRawData.length > 0) {
            sortedMaterials.forEach(matDesc => {
                const [material] = matDesc.split('|');
                const matNorm = nm(material);
                const nMatch = nawaRawData.find(r => nm(r["Material"] || "") === matNorm);
                if (nMatch && nMatch["Unrestricted"]) {
                    const val = parseFloat(nMatch["Unrestricted"].toString().replace(/,/g, '')) || 0;
                    nawaMap[material] = val;
                } else {
                    nawaMap[material] = 0;
                }
            });
        }

        // Collect filter options
        const prgOptions = new Set();
        Object.values(prgMap).forEach(v => { if (v && v !== "-") prgOptions.add(v); });

        const supplierOptions = new Set();
        Object.values(poDetailMap).forEach(v => {
            if (v.supplier && v.supplier !== "-") supplierOptions.add(v.supplier);
        });

        return {
            filteredRows, sortedMaterials, pivotData, pendingUnits,
            totalQuantity, topMaterial, prgMap, prMap, poMap, poDetailMap, nawaMap,
            prgOptions: [...prgOptions].sort(),
            supplierOptions: [...supplierOptions].sort()
        };
    }, [data, rawSources]);

    // Apply PRG + Supplier filter to rows
    const displayRows = useMemo(() => {
        if (!computedData) return [];
        const { sortedMaterials, pivotData, prgMap, poDetailMap, nawaMap } = computedData;

        return sortedMaterials.filter(matDesc => {
            const [material] = matDesc.split('|');
            const nawaVal = nawaMap[material] || 0;
            const total = pivotData[matDesc].total;

            // Skip rows where total <= nawa (matching original)
            if (total <= nawaVal && nawaVal > 0) return false;

            // PRG filter
            if (prgFilter && prgMap[material] !== prgFilter) return false;

            // Supplier filter
            if (supplierFilter) {
                const detail = poDetailMap[material];
                if (!detail || detail.supplier !== supplierFilter) return false;
            }

            return true;
        });
    }, [computedData, prgFilter, supplierFilter]);

    if (!isOpen) return null;
    if (!computedData) return (
        <div className="modal" onClick={(e) => e.target.className === 'modal' && onClose()}>
            <div className="modal-content">
                <span className="close" onClick={onClose}>×</span>
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                    <i className="fas fa-box-open" style={{ fontSize: '48px', marginBottom: '10px', opacity: 0.5 }}></i>
                    <p>ไม่พบรายการอะไหล่รอของเข้า</p>
                </div>
            </div>
        </div>
    );

    const { pivotData, pendingUnits, totalQuantity, topMaterial, prgMap, prMap, poMap, poDetailMap, nawaMap, prgOptions, supplierOptions } = computedData;

    const exportCSV = () => {
        const rows = [['Material', 'Description', 'PRG', 'PR', 'PO', 'กำหนดส่ง', 'PO Document', 'Supplier', 'จำนวนส่ง', 'นวนคร', 'รวม', ...pendingUnits]];
        displayRows.forEach(matDesc => {
            const [material, description] = matDesc.split('|');
            const d = pivotData[matDesc];
            const detail = poDetailMap[material] || {};
            rows.push([
                material, description, prgMap[material] || '-',
                prMap[normalizeMaterial(material)] || '-',
                poMap[material] || '-',
                detail.delivDate || '-', detail.poDoc || '-', detail.supplier || '-', detail.qtyDeliv || '-',
                nawaMap[material] || '-',
                d.total, ...pendingUnits.map(u => d[u] || 0)
            ]);
        });
        const csv = rows.map(r => r.map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'spare_summary.csv';
        link.click();
    };

    return (
        <div className="modal" onClick={(e) => e.target.className === 'modal' && onClose()}>
            <div className="modal-content" style={{ maxWidth: '95vw', width: '95vw' }}>
                <span className="close" onClick={onClose}>×</span>

                {/* Header with filters */}
                <div className="spare-header" style={{ margin: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <div className="spare-title" style={{ fontWeight: 'bold', fontSize: '1.1em' }}>
                            <i className="fas fa-cube"></i> สรุปรายการอะไหล่ (ยกเว้นระหว่างขนส่ง)
                        </div>
                        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                            <i className="fas fa-filter" style={{ position: 'absolute', left: '10px', color: '#fd7e14', fontSize: '11px', pointerEvents: 'none' }}></i>
                            <select value={prgFilter} onChange={(e) => { setPrgFilter(e.target.value); }}
                                style={{ padding: '6px 14px 6px 28px', borderRadius: '20px', border: '2px solid #fd7e14', fontSize: '12px', fontWeight: 600, color: '#fd7e14', background: '#fff', cursor: 'pointer', outline: 'none', minWidth: '120px' }}>
                                <option value="">PRG: ทั้งหมด</option>
                                {prgOptions.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                            <i className="fas fa-truck" style={{ position: 'absolute', left: '10px', color: '#6f42c1', fontSize: '11px', pointerEvents: 'none' }}></i>
                            <select value={supplierFilter} onChange={(e) => { setSupplierFilter(e.target.value); }}
                                style={{ padding: '6px 14px 6px 28px', borderRadius: '20px', border: '2px solid #6f42c1', fontSize: '12px', fontWeight: 600, color: '#6f42c1', background: '#fff', cursor: 'pointer', outline: 'none', minWidth: '140px' }}>
                                <option value="">Supplier: ทั้งหมด</option>
                                {supplierOptions.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span className="pill" style={{ background: 'var(--info-color)', color: '#fff', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
                            {computedData.filteredRows.length} รายการ
                        </span>
                        <button onClick={exportCSV} title="Export CSV" style={{
                            width: '36px', height: '36px', borderRadius: '50%', border: 'none',
                            background: 'linear-gradient(135deg, #198754, #20c997)', color: '#fff',
                            fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', boxShadow: '0 3px 8px rgba(25,135,84,0.35)'
                        }}><i className="fas fa-file-csv"></i></button>
                        <button onClick={() => {
                            const printContent = document.getElementById('spareSummaryTableArea');
                            if (printContent) {
                                const w = window.open('', '_blank');
                                w.document.write(`<html><head><title>สรุปอะไหล่</title><style>table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:6px;text-align:center;font-size:11px}th{background:#f4f4f4}</style></head><body>${printContent.innerHTML}</body></html>`);
                                w.document.close(); w.print();
                            }
                        }} title="พิมพ์" style={{
                            width: '36px', height: '36px', borderRadius: '50%', border: 'none',
                            background: 'linear-gradient(135deg, #0d6efd, #6ea8fe)', color: '#fff',
                            fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', boxShadow: '0 3px 8px rgba(13,110,253,0.35)'
                        }}><i className="fas fa-print"></i></button>
                    </div>
                </div>

                {/* Stat Cards */}
                <div className="spare-stats" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2.5fr', gap: '10px', margin: '10px' }}>
                    <div className="stat-card" style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '12px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }}>
                        <div style={{ fontSize: '11px', opacity: 0.7 }}>จำนวนรายการรวม</div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--info-color)' }}>{displayRows.length}</div>
                    </div>
                    <div className="stat-card" style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '12px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }}>
                        <div style={{ fontSize: '11px', opacity: 0.7 }}>จำนวนชิ้นรวม</div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--warning-color)' }}>{totalQuantity}</div>
                    </div>
                    <div className="stat-card" style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '12px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }}>
                        <div style={{ fontSize: '11px', opacity: 0.7 }}>รอมากที่สุด</div>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--danger-color)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={topMaterial}>{topMaterial}</div>
                    </div>
                </div>

                {/* Table */}
                <div id="spareSummaryTableArea" style={{ margin: '10px', overflow: 'auto', maxHeight: '60vh' }}>
                    <table className="detail-table" style={{ fontSize: '12px', width: '100%' }}>
                        <thead>
                            <tr>
                                <th style={{ width: '12%' }}>Material</th>
                                <th style={{ width: '22%' }}>Description</th>
                                <th style={{ width: '7%', backgroundColor: '#fd7e14', color: '#fff' }}>PRG</th>
                                <th style={{ width: '5%' }}>PR</th>
                                <th style={{ width: '5%' }}>PO</th>
                                <th style={{ width: '7%' }}>กำหนดส่ง</th>
                                <th style={{ width: '7%' }}>PO Document</th>
                                <th style={{ width: '8%' }}>Supplier</th>
                                <th style={{ width: '5%' }}>จำนวนส่ง</th>
                                <th style={{ width: '5%', backgroundColor: '#fd7e14', color: '#fff' }}>นวนคร</th>
                                <th className="fixed-width" style={{ background: 'rgba(0,0,0,0.02)' }}>รวม</th>
                                {pendingUnits.map(u => <th key={u} className="fixed-width">{u}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {displayRows.length === 0 ? (
                                <tr><td colSpan={11 + pendingUnits.length} style={{ textAlign: 'center', padding: '20px' }}>ไม่มีข้อมูล</td></tr>
                            ) : displayRows.map(matDesc => {
                                const [material, description] = matDesc.split('|');
                                const d = pivotData[matDesc];
                                const materialPrg = prgMap[material] || '-';
                                const matNorm = normalizeMaterial(material);
                                const prVal = prMap[matNorm] || 0;
                                const poVal = poMap[material] || 0;
                                const detail = poDetailMap[material] || {};
                                const nawaVal = nawaMap[material] || 0;

                                return (
                                    <tr key={matDesc}>
                                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{material}</td>
                                        <td style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'left' }}>{description}</td>
                                        <td style={{ textAlign: 'center', color: materialPrg === 'ในประเทศ' ? '#0d6efd' : materialPrg === 'ต่างประเทศ' ? '#dc3545' : '#fd7e14', fontWeight: 'bold' }}>{materialPrg}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            {prVal > 0 ? <span className="request-pill" style={{ backgroundColor: '#e83e8c', color: '#fff', cursor: 'pointer' }}>{prVal}</span> : '-'}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            {poVal > 0 ? <span className="request-pill" style={{ backgroundColor: '#0d6efd', color: '#fff', cursor: 'pointer' }}>{poVal}</span> : '-'}
                                        </td>
                                        <td style={{ textAlign: 'center', fontSize: '11px' }}>{detail.delivDate || '-'}</td>
                                        <td style={{ textAlign: 'center', fontSize: '11px' }}>{detail.poDoc || '-'}</td>
                                        <td style={{ textAlign: 'left', fontSize: '11px' }}>{detail.supplier || '-'}</td>
                                        <td style={{ textAlign: 'center', fontSize: '11px', fontWeight: 'bold', color: '#198754' }}>{detail.qtyDeliv || '-'}</td>
                                        <td style={{ textAlign: 'center', color: '#1a237e', fontWeight: 'bold' }}>{nawaVal > 0 ? nawaVal : '-'}</td>
                                        <td className="fixed-width" style={{ background: 'rgba(0,0,0,0.02)' }}>
                                            {d.total === 0 ? '-' : <span style={{ backgroundColor: 'var(--danger-color)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '2px 10px', borderRadius: '99px', fontWeight: 'bold', fontSize: '13px' }}>{d.total}</span>}
                                        </td>
                                        {pendingUnits.map(u => (
                                            <td key={u} className="fixed-width" style={{ fontWeight: d[u] > 0 ? 'bold' : 'normal', color: d[u] > 0 ? 'var(--danger-color)' : '#ccc' }}>
                                                {d[u] === 0 ? '-' : d[u]}
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// ===== Action Modal =====
export function ActionModal({
    isOpen,
    onClose,
    title,
    ticket,
    material,
    children,
    onSubmit,
    onDelete,
    cancelText = "ยกเลิก"
}) {
    if (!isOpen) return null;
    return (
        <div className="modal">
            <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center' }}>
                <span className="close" onClick={onClose}>×</span>
                <h2>{title}</h2>
                <p style={{ marginBottom: '20px' }}>
                    Ticket: <span style={{ fontWeight: 'bold' }}>{ticket}</span><br />
                    {material && <>Material: <span style={{ fontWeight: 'bold' }}>{material}</span></>}
                </p>
                {children}
                <div style={{ display: 'grid', gridTemplateColumns: onDelete ? '1fr 1fr 1fr' : '1fr 1fr', gap: '10px', marginTop: '15px' }}>
                    <button className="action-button" style={{ background: 'var(--success-color)', width: '100%' }} onClick={onSubmit}>
                        <i className="fas fa-check"></i> ตกลง
                    </button>
                    {onDelete && (
                        <button className="action-button" style={{ background: 'var(--danger-color)', width: '100%' }} onClick={onDelete}>
                            <i className="fas fa-trash"></i> ลบ
                        </button>
                    )}
                    <button className="action-button logout-button" style={{ width: '100%', fontSize: '0.9em', padding: '10px 5px' }} onClick={onClose}>
                        <i className="fas fa-times"></i> {cancelText}
                    </button>
                </div>
            </div>
        </div>
    );
}
