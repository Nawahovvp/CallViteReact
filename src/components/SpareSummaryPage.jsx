import React, { useState, useMemo } from 'react';
import { getDesc, normalizeMaterial } from '../utils/helpers';
import { PoDetailsModal, PrDetailsModal, OtherPlantModal } from './TableModals';

export default function SpareSummaryPage({ data = [], rawSources = {}, isLoading, onClose }) {
    const [prgFilter, setPrgFilter] = useState('');
    const [supplierFilter, setSupplierFilter] = useState('');

    // Modal states
    const [poModal, setPoModal] = useState({ open: false, row: null });
    const [prModal, setPrModal] = useState({ open: false, row: null });
    const [otherPlantModal, setOtherPlantModal] = useState({ open: false, row: null });

    const computedData = useMemo(() => {
        if (!data || data.length === 0) return null;
        const { nawaRawData = [], poRawData = [], prRawData = [] } = rawSources;

        const filteredRows = data.filter(row => {
            const sc = (row["StatusCall"] || "").trim();
            const mat = (row["Material"] || "").trim();
            return sc !== "ระหว่างขนส่ง" && mat !== "";
        });
        if (filteredRows.length === 0) return null;

        const pendingUnitsSet = new Set();
        filteredRows.forEach(row => {
            const unit = (row["ค้างหน่วยงาน"] || "ไม่ระบุ").replace(/Stock\s*/gi, '').trim();
            if (unit) pendingUnitsSet.add(unit);
        });
        const pendingUnits = [...pendingUnitsSet].sort();

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

    const displayRows = useMemo(() => {
        if (!computedData) return [];
        const { sortedMaterials, pivotData, prgMap, poDetailMap, nawaMap } = computedData;

        return sortedMaterials.filter(matDesc => {
            const [material] = matDesc.split('|');
            const nawaVal = nawaMap[material] || 0;
            const total = pivotData[matDesc].total;

            if (total <= nawaVal && nawaVal > 0) return false;
            if (prgFilter && prgMap[material] !== prgFilter) return false;
            if (supplierFilter) {
                const detail = poDetailMap[material];
                if (!detail || detail.supplier !== supplierFilter) return false;
            }
            return true;
        });
    }, [computedData, prgFilter, supplierFilter]);

    if (isLoading && (!data || data.length === 0)) {
        return (
            <div className="spare-page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
                <div className="spinner" style={{ width: '80px', height: '80px', border: '8px solid rgba(0,0,0,0.1)', borderTopColor: 'var(--info-color)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                <p style={{ marginTop: '20px', fontSize: '18px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>กำลังเตรียมข้อมูลสรุปอะไหล่...</p>
                <style>{`
                    @keyframes spin { to { transform: rotate(360deg); } }
                `}</style>
            </div>
        );
    }

    if (!computedData) {
        return (
            <div className="spare-page-container">
                <div style={{ textAlign: 'center', padding: '100px', color: '#888' }}>
                    <i className="fas fa-box-open" style={{ fontSize: 64, opacity: 0.3, marginBottom: 20 }}></i>
                    <h2>ไม่พบรายการอะไหล่รอของเข้า</h2>
                    <button onClick={onClose} className="action-button logout-button">ปิดหน้านี้</button>
                </div>
            </div>
        );
    }

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
        <div className="spare-page-container" style={{ padding: '20px', backgroundColor: 'var(--bg-color)', minHeight: '100vh' }}>
            <div className="premium-modal-content" style={{ width: '100%', margin: '0', animation: 'none' }}>
                <div className="premium-modal-header">
                    <h3><i className="fas fa-list-alt" style={{ marginRight: 10 }}></i> สรุปรายการอะไหล่รอของเข้า (Standalone Page)</h3>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={() => window.print()} className="detail-button" style={{ background: 'rgba(255,255,255,0.2)', fontSize: '14px', padding: '10px 20px' }}>
                            <i className="fas fa-print"></i> พิมพ์
                        </button>
                        <button onClick={onClose} className="premium-modal-close" title="ปิดหน้านี้">&times;</button>
                    </div>
                </div>

                <div className="premium-modal-body">
                    {/* Filters & Actions Bar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 15 }}>
                        <div style={{ display: 'flex', gap: 15, flexWrap: 'wrap' }}>
                            <div className="modal-info-bar" style={{ margin: 0, padding: '5px 15px' }}>
                                <div className="modal-info-item">
                                    <i className="fas fa-filter" style={{ color: 'var(--info-color)' }}></i>
                                    <span className="modal-info-label">PRG:</span>
                                    <select value={prgFilter} onChange={(e) => setPrgFilter(e.target.value)}
                                        style={{ border: 'none', background: 'transparent', fontWeight: 600, color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}>
                                        <option value="">ทั้งหมด</option>
                                        {prgOptions.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                                <div className="modal-info-item" style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: 15 }}>
                                    <i className="fas fa-truck" style={{ color: 'var(--success-color)' }}></i>
                                    <span className="modal-info-label">Supplier:</span>
                                    <select value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)}
                                        style={{ border: 'none', background: 'transparent', fontWeight: 600, color: 'var(--text-primary)', outline: 'none', cursor: 'pointer', maxWidth: '200px' }}>
                                        <option value="">ทั้งหมด</option>
                                        {supplierOptions.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={exportCSV} className="action-button" style={{ background: '#198754' }}>
                                <i className="fas fa-file-csv"></i> Export CSV
                            </button>
                        </div>
                    </div>

                    {/* Quick Stats Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 15, marginBottom: 20 }}>
                        <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                            <div style={{ width: 45, height: 45, borderRadius: '50%', background: 'rgba(0,123,255,0.1)', color: 'var(--info-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                                <i className="fas fa-box"></i>
                            </div>
                            <div>
                                <div className="stat-label">จำนวนรายการ</div>
                                <div className="stat-value" style={{ fontSize: 20, fontWeight: 800 }}>{displayRows.length}</div>
                            </div>
                        </div>
                        <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                            <div style={{ width: 45, height: 45, borderRadius: '50%', background: 'rgba(40,167,69,0.1)', color: 'var(--success-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                                <i className="fas fa-boxes-stacked"></i>
                            </div>
                            <div>
                                <div className="stat-label">จำนวนชิ้นรวม</div>
                                <div className="stat-value" style={{ fontSize: 20, fontWeight: 800 }}>{totalQuantity}</div>
                            </div>
                        </div>
                        <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: 15, gridColumn: 'span 1' }}>
                            <div style={{ width: 45, height: 45, borderRadius: '50%', background: 'rgba(220,53,69,0.1)', color: 'var(--danger-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                                <i className="fas fa-fire"></i>
                            </div>
                            <div style={{ overflow: 'hidden' }}>
                                <div className="stat-label">รอมากที่สุด</div>
                                <div className="stat-value" style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{topMaterial}</div>
                            </div>
                        </div>
                    </div>

                    {/* Main Table Content */}
                    <div className="compact-table-wrapper" style={{ maxHeight: 'calc(100vh - 350px)', overflow: 'auto' }}>
                        <table className="compact-table ultra-compact">
                            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                                <tr>
                                    <th style={{ width: '1%' }}>Material</th>
                                    <th style={{ textAlign: 'left' }}>Description</th>
                                    <th style={{ textAlign: 'center', width: '1%' }}>PRG</th>
                                    <th className="narrow-cell">PR</th>
                                    <th className="narrow-cell">PO</th>
                                    <th style={{ textAlign: 'center', width: '1%' }}>กำหนดส่ง</th>
                                    <th style={{ textAlign: 'left' }}>Supplier</th>
                                    <th className="narrow-cell">จำนวนส่ง</th>
                                    <th className="narrow-cell">นวนคร</th>
                                    <th className="narrow-cell" style={{ background: 'rgba(0,123,255,0.1)', color: 'var(--info-color)' }}>รวม</th>
                                    {pendingUnits.map(u => <th key={u} className="narrow-cell">{u}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {displayRows.map(matDesc => {
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
                                            <td style={{ fontWeight: 700, color: 'var(--info-color)' }}>{material}</td>
                                            <td style={{ color: 'var(--text-secondary)' }}>{description}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span style={{
                                                    padding: '1px 6px', borderRadius: 4,
                                                    background: materialPrg === 'ในประเทศ' ? 'rgba(13,110,253,0.1)' : materialPrg === 'ต่างประเทศ' ? 'rgba(220,53,69,0.1)' : 'rgba(0,0,0,0.05)',
                                                    color: materialPrg === 'ในประเทศ' ? '#0d6efd' : materialPrg === 'ต่างประเทศ' ? '#dc3545' : 'inherit',
                                                    fontWeight: 600, fontSize: '10.5px', display: 'inline-block'
                                                }}>
                                                    {materialPrg}
                                                </span>
                                            </td>
                                            <td className="narrow-cell">
                                                {prVal > 0 ? (
                                                    <span className="request-pill" style={{ cursor: 'pointer', background: '#e83e8c' }}
                                                        onClick={() => setPrModal({ open: true, row: { Material: material, Description: description } })}>
                                                        {prVal}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td className="narrow-cell">
                                                {poVal > 0 ? (
                                                    <span className="request-pill" style={{ cursor: 'pointer', background: '#0d6efd' }}
                                                        onClick={() => setPoModal({ open: true, row: { Material: material, Description: description } })}>
                                                        {poVal}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                {detail.delivDate !== '-' ? (
                                                    <span style={{ fontWeight: 600 }}>{detail.delivDate}</span>
                                                ) : '-'}
                                            </td>
                                            <td title={detail.supplier}>
                                                {detail.supplier}
                                            </td>
                                            <td className="narrow-cell" style={{ fontWeight: 700, color: detail.qtyDeliv !== '-' ? '#198754' : '#ccc' }}>
                                                {detail.qtyDeliv}
                                            </td>
                                            <td className="narrow-cell" style={{ fontWeight: 700, color: nawaVal > 0 ? '#1a237e' : '#ccc' }}>
                                                {nawaVal > 0 ? nawaVal : '-'}
                                            </td>
                                            <td className="narrow-cell" style={{ background: 'rgba(0,123,255,0.03)' }}>
                                                <span style={{
                                                    background: 'var(--danger-color)', color: '#fff',
                                                    padding: '1px 5px', borderRadius: 10, fontWeight: 800, fontSize: '10px'
                                                }}>
                                                    {d.total}
                                                </span>
                                            </td>
                                            {pendingUnits.map(u => (
                                                <td key={u} className="narrow-cell" style={{
                                                    fontWeight: d[u] > 0 ? 700 : 400,
                                                    color: d[u] > 0 ? 'var(--text-primary)' : '#eee',
                                                    background: d[u] > 0 ? 'rgba(0,0,0,0.01)' : 'transparent',
                                                    cursor: d[u] > 0 ? 'pointer' : 'default'
                                                }} onClick={() => d[u] > 0 && setOtherPlantModal({ open: true, row: { Material: material, Description: description } })}>
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

            {/* Redesigned Modals Integration */}
            <PoDetailsModal
                isOpen={poModal.open}
                onClose={() => setPoModal({ open: false, row: null })}
                material={poModal.row?.["Material"]}
                description={poModal.row?.["Description"]}
                poRawData={rawSources.poRawData}
                nawaRawData={rawSources.nawaRawData}
            />
            <PrDetailsModal
                isOpen={prModal.open}
                onClose={() => setPrModal({ open: false, row: null })}
                material={prModal.row?.["Material"]}
                description={prModal.row?.["Description"]}
                prRawData={rawSources.prRawData}
            />
            <OtherPlantModal
                isOpen={otherPlantModal.open}
                onClose={() => setOtherPlantModal({ open: false, row: null })}
                material={otherPlantModal.row?.["Material"]}
                description={otherPlantModal.row?.["Description"]}
                plantStockData={rawSources.plantStockData}
            />
        </div>
    );
}
