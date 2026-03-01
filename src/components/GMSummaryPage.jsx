import React, { useMemo } from 'react';

export default function GMSummaryPage({ data = [], summary = {}, onClose }) {
    const gmPerformance = useMemo(() => {
        if (!data || data.length === 0) return [];

        const gmGroups = {};
        data.forEach(row => {
            const ticket = row["Ticket Number"];
            if (!ticket || String(ticket).trim() === "" || String(ticket).trim() === "-") return;

            const baseGm = String(row.GM || "ไม่ระบุ").trim();
            const callType = String(row["Call Type"] || "").toUpperCase();
            const isSA = callType.includes("SA");
            const designation = isSA ? "SA" : "COMPANY";
            const gmKey = `${baseGm}_${designation}`;

            if (!gmGroups[gmKey]) {
                gmGroups[gmKey] = {
                    name: baseGm,
                    designation: designation,
                    total: 0,
                    success: 0,
                    pending: 0,
                    overdue: 0,
                    other: 0,
                    over7: 0,
                    _tickets: new Set(),
                    statusCounts: {},
                    units: {}
                };
            }
            const g = gmGroups[gmKey];
            const status = row.StatusCall || "";

            // Count unique tickets per GM + Designation
            if (!g._tickets.has(ticket)) {
                g._tickets.add(ticket);
                g.total++;

                const statusName = status || "ไม่ระบุ";
                g.statusCounts[statusName] = (g.statusCounts[statusName] || 0) + 1;

                if (status === "ระหว่างขนส่ง") g.success++;
                else if (status === "รอของเข้า" || status === "เบิกศูนย์อะไหล่") g.pending++;
                else if (status === "เกินLeadtime") g.overdue++;
                else g.other++;

                if (parseFloat(row["DayRepair"] || 0) > 7) g.over7++;
            }

            // Backlog units (count occurrences)
            if (status !== "ระหว่างขนส่ง") {
                const unit = (row["ค้างหน่วยงาน"] || "ไม่ระบุ").replace(/Stock\s*/gi, '').trim();
                g.units[unit] = (g.units[unit] || 0) + 1;
            }
        });

        return Object.values(gmGroups).map(g => {
            const successRate = g.total > 0 ? Math.round((g.success / g.total) * 100) : 0;
            const topUnits = Object.entries(g.units)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([name, count]) => ({ name, count }));

            return { ...g, successRate, topUnits };
        }).sort((a, b) => {
            if (a.name !== b.name) return a.name.localeCompare(b.name);
            return a.designation === "SA" ? -1 : 1;
        });
    }, [data]);

    // Overall Executive KPIs
    const totalTickets = gmPerformance.reduce((sum, g) => sum + g.total, 0);
    const avgSuccessRate = gmPerformance.length > 0
        ? Math.round(gmPerformance.reduce((sum, g) => sum + g.successRate, 0) / gmPerformance.length)
        : 0;
    const totalOver7 = gmPerformance.reduce((sum, g) => sum + g.over7, 0);

    const allStatuses = useMemo(() => {
        const statuses = new Set();
        data.forEach(row => {
            const ticket = row["Ticket Number"];
            if (!ticket || String(ticket).trim() === "" || String(ticket).trim() === "-") return;
            if (row.StatusCall) statuses.add(row.StatusCall);
        });
        return [...statuses].sort();
    }, [data]);

    return (
        <div className="spare-page-container" style={{ padding: '30px', backgroundColor: 'var(--bg-color)', minHeight: '100vh', overflowY: 'auto' }}>
            <div className="gm-summary-header">
                <div>
                    <h2 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '5px' }}>
                        แดชบอร์ดสรุปผลผู้บริหาร (GM)
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>สรุปผลการดำเนินงานและสถานะงานค้างรายบุคคล</p>
                </div>
                <button onClick={onClose} className="action-button logout-button" style={{ padding: '12px 25px' }}>
                    <i className="fas fa-times"></i> ปิด Dashboard
                </button>
            </div>

            <div className="executive-stats-grid">
                <div className="dashboard-card" style={{ background: 'linear-gradient(135deg, #2980b9, #3498db)', minHeight: '100px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <span className="gm-label" style={{ color: 'rgba(255,255,255,0.8)' }}>จำนวนงานทั้งหมด (Call Tickets)</span>
                    <div className="value" style={{ fontSize: '2.5em' }}>{totalTickets}</div>
                </div>
                <div className="dashboard-card" style={{ background: 'linear-gradient(135deg, #27ae60, #2ecc71)', minHeight: '100px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <span className="gm-label" style={{ color: 'rgba(255,255,255,0.8)' }}>อัตราความสำเร็จ (Success Rate)</span>
                    <div className="value" style={{ fontSize: '2.5em' }}>{avgSuccessRate}%</div>
                </div>
                <div className="dashboard-card" style={{ background: 'linear-gradient(135deg, #e67e22, #f39c12)', minHeight: '100px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <span className="gm-label" style={{ color: 'rgba(255,255,255,0.8)' }}>งานค้างวิกฤต (&gt;7 วัน)</span>
                    <div className="value" style={{ fontSize: '2.5em' }}>{totalOver7}</div>
                </div>
            </div>

            <div className="warehouse-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                {gmPerformance.map((g, i) => (
                    <div key={i} className="gm-performance-card">
                        <div className="gm-card-header">
                            <div className="gm-name-group">
                                <span className="gm-label">สายงาน / GM</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span className="gm-main-name">{g.name}</span>
                                    <span style={{
                                        fontSize: '10px',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        background: g.designation === 'SA' ? 'rgba(41, 128, 185, 0.1)' : 'rgba(127, 140, 141, 0.1)',
                                        color: g.designation === 'SA' ? '#2980b9' : '#7f8c8d',
                                        fontWeight: '800',
                                        border: `1px solid ${g.designation === 'SA' ? 'rgba(41, 128, 185, 0.2)' : 'rgba(127, 140, 141, 0.2)'}`
                                    }}>
                                        {g.designation}
                                    </span>
                                </div>
                            </div>
                            <div className={`gm-score-ring ${g.successRate >= 80 ? 'high' : g.successRate >= 50 ? 'mid' : 'low'}`}>
                                {g.successRate}%
                            </div>
                        </div>

                        <div className="gm-status-distribution" style={{ marginBottom: '15px' }}>
                            <div className="dist-segment dist-success" style={{ width: `${(g.success / g.total) * 100}%` }} title="สำเร็จ"></div>
                            <div className="dist-segment dist-pending" style={{ width: `${(g.pending / g.total) * 100}%` }} title="รอของ"></div>
                            <div className="dist-segment dist-overdue" style={{ width: `${(g.overdue / g.total) * 100}%` }} title="เกิน Leadtime"></div>
                            <div className="dist-segment dist-other" style={{ width: `${(g.other / g.total) * 100}%` }} title="อื่นๆ"></div>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '15px' }}>
                            {Object.entries(g.statusCounts).map(([name, count], idx) => (
                                <div key={idx} style={{
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    background: 'rgba(0,0,0,0.04)',
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px'
                                }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>{name}:</span>
                                    <span style={{ color: 'var(--info-color)', fontWeight: '800' }}>{count}</span>
                                </div>
                            ))}
                        </div>

                        <div className="gm-metrics-mini">
                            <div className="mini-stat">
                                <span className="mini-stat-label">งานทั้งหมด</span>
                                <span className="mini-stat-value">{g.total}</span>
                            </div>
                            <div className="mini-stat">
                                <span className="mini-stat-label">ค้างเกิน 7 วัน</span>
                                <span className="mini-stat-value" style={{ color: g.over7 > 0 ? 'var(--danger-color)' : 'inherit' }}>{g.over7}</span>
                            </div>
                        </div>

                        <div className="gm-backlog-list">
                            <span className="gm-label" style={{ fontSize: '10px', marginBottom: '4px' }}>หน่วยงานที่ค้างสูงสุด</span>
                            {g.topUnits.map((u, idx) => (
                                <div key={idx} className="backlog-item">
                                    <span className="backlog-unit">{u.name}</span>
                                    <span className="backlog-count">{u.count}</span>
                                </div>
                            ))}
                            {g.topUnits.length === 0 && (
                                <div style={{ fontSize: '12px', color: '#999', textAlign: 'center', padding: '10px' }}>ไม่มีงานค้าง</div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            <div className="gm-summary-table-section" style={{ marginTop: '40px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '22px', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <i className="fas fa-table" style={{ color: 'var(--info-color)' }}></i> รายละเอียดสถานะงานแยกรายบุคคล (Executive Overview)
                    </h3>
                </div>

                <div className="compact-table-wrapper" style={{ background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'auto' }}>
                    <table className="compact-table ultra-compact" style={{ margin: 0, width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'rgba(0,0,0,0.03)' }}>
                                <th style={{ textAlign: 'left', padding: '15px', position: 'sticky', left: 0, background: 'var(--card-bg)', zIndex: 5 }}>ผู้จัดการฝ่ายภูมิภาค (GM)</th>
                                {allStatuses.map(status => (
                                    <th key={status} style={{ textAlign: 'center', minWidth: '100px', fontSize: '11px', whiteSpace: 'nowrap' }}>{status}</th>
                                ))}
                                <th style={{ textAlign: 'center', background: 'rgba(0,123,255,0.05)', fontWeight: '800' }}>รวมทั้งสิ้น</th>
                                <th style={{ textAlign: 'center', color: 'var(--danger-color)' }}>ค้าง &gt; 7 วัน</th>
                                <th style={{ textAlign: 'center', background: 'rgba(40,167,69,0.05)' }}>% ความสำเร็จ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {gmPerformance.map((g, idx) => (
                                <tr key={idx} style={{ borderTop: '1px solid var(--border-color)' }}>
                                    <td style={{ fontWeight: '700', padding: '12px 15px', position: 'sticky', left: 0, background: 'var(--card-bg)', zIndex: 4, borderRight: '1px solid var(--border-color)' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span>{g.name}</span>
                                            <span style={{ fontSize: '10px', color: g.designation === 'SA' ? '#2980b9' : '#7f8c8d', fontWeight: '800' }}>{g.designation}</span>
                                        </div>
                                    </td>
                                    {allStatuses.map(status => {
                                        const count = g.statusCounts[status] || 0;
                                        return (
                                            <td key={status} style={{
                                                textAlign: 'center',
                                                fontWeight: count > 0 ? '700' : '400',
                                                color: count > 0 ? 'var(--text-primary)' : '#ccc'
                                            }}>
                                                {count > 0 ? count : '-'}
                                            </td>
                                        );
                                    })}
                                    <td style={{ textAlign: 'center', fontWeight: '800', background: 'rgba(0,123,255,0.02)' }}>{g.total}</td>
                                    <td style={{ textAlign: 'center', fontWeight: '700', color: g.over7 > 0 ? 'var(--danger-color)' : '#ccc' }}>
                                        {g.over7 > 0 ? g.over7 : '-'}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                                            <span style={{ fontWeight: '800', color: g.successRate >= 80 ? 'var(--success-color)' : g.successRate >= 50 ? 'var(--info-color)' : 'var(--danger-color)' }}>
                                                {g.successRate}%
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr style={{ background: 'rgba(0,0,0,0.05)', fontWeight: '800', borderTop: '2px solid var(--border-color)' }}>
                                <td style={{ padding: '15px', position: 'sticky', left: 0, background: 'rgba(0,0,0,0.05)', zIndex: 5 }}>ยอดรวมทั้งหมด (Grand Total)</td>
                                {allStatuses.map(status => {
                                    const total = gmPerformance.reduce((sum, g) => sum + (g.statusCounts[status] || 0), 0);
                                    return <td key={status} style={{ textAlign: 'center' }}>{total > 0 ? total : '-'}</td>;
                                })}
                                <td style={{ textAlign: 'center', background: 'rgba(0,123,255,0.1)' }}>{totalTickets}</td>
                                <td style={{ textAlign: 'center', color: 'var(--danger-color)' }}>{totalOver7}</td>
                                <td style={{ textAlign: 'center' }}>{avgSuccessRate}%</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
}
