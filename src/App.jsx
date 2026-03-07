import React, { useState, useEffect } from 'react';
import './index.css';

// Components
import LoginModal from './components/LoginModal';
import AppHeader from './components/AppHeader';
import DashboardCards from './components/DashboardCards';
import AnalyticsCards from './components/AnalyticsCards';
import GroupCards from './components/GroupCards';
import ControlPanel from './components/ControlPanel';
import DataTable from './components/DataTable';
import { DetailModal, ActionModal, GraphModal, SummaryModal, SpareSummaryModal, OutsideRequestModal, StickerModal, printStickers, UpdateGuideModal } from './components/Modals';
import { PoDetailsModal, PrDetailsModal, OtherPlantModal, StatusEditModal, ProjectModal, TimelineModal } from './components/TableModals';

import { useAppData } from './hooks/useAppData';
import { PLANT_MAPPING, exportToCSV } from './utils/helpers';
import SpareSummaryPage from './components/SpareSummaryPage';
import GMSummaryPage from './components/GMSummaryPage';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const cachedUser = localStorage.getItem('user');
    if (cachedUser) {
      setCurrentUser(JSON.parse(cachedUser));
      setIsLoggedIn(true);
    }
  }, []);

  const {
    data,
    allData,
    baseFilteredData,
    isLoading,
    error,
    lastUpdated,
    summary,
    availableFilters,
    rawSources,
    teamPlantFilter, setTeamPlantFilter,
    pendingUnitFilter, setPendingUnitFilter,
    stockAnswerFilter, setStockAnswerFilter,
    statusCallFilter, setStatusCallFilter,
    searchTerm, setSearchTerm,
    dashboardFilter, setDashboardFilter,
    gmFilter, setGmFilter,
    applyDashboardFilter,
    refreshData,
    refreshDataBackground,
    updateRowLocally,
    handleOutsideRequest
  } = useAppData();

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [sortConfig, setSortConfig] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);

  // Modal states
  const [graphOpen, setGraphOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [spareSummaryOpen, setSpareSummaryOpen] = useState(false);
  const [gmSummaryOpen, setGmSummaryOpen] = useState(false);

  // Table interaction modal states
  const [poModal, setPoModal] = useState({ open: false, row: null });
  const [prModal, setPrModal] = useState({ open: false, row: null });
  const [otherPlantModal, setOtherPlantModal] = useState({ open: false, row: null });
  const [statusEditModal, setStatusEditModal] = useState({ open: false, row: null });
  const [spacialModal, setSpacialModal] = useState({ open: false, row: null });
  const [timelineModal, setTimelineModal] = useState({ open: false, row: null });
  const [outsideRequestModal, setOutsideRequestModal] = useState({ open: false, row: null });
  const [stickerModal, setStickerModal] = useState({ open: false, row: null });
  const [updateGuideOpen, setUpdateGuideOpen] = useState(false);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Default sort: DayRepair desc, then Ticket Number
  const sortedData = React.useMemo(() => {
    let items = [...data];
    if (sortConfig !== null) {
      items.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];
        if (sortConfig.key === 'DayRepair') {
          const dayA = parseFloat(valA) || 0;
          const dayB = parseFloat(valB) || 0;
          if (dayA !== dayB) return sortConfig.direction === 'asc' ? dayA - dayB : dayB - dayA;
          return (a["Ticket Number"] || "").localeCompare(b["Ticket Number"] || "");
        }
        valA = String(valA || "").toLowerCase();
        valB = String(valB || "").toLowerCase();
        return sortConfig.direction === 'asc'
          ? (valA > valB ? 1 : valA < valB ? -1 : 0)
          : (valA < valB ? 1 : valA > valB ? -1 : 0);
      });
    } else {
      // Default sort: DayRepair DESC, then Ticket Number ASC
      items.sort((a, b) => {
        const dayA = parseFloat(a["DayRepair"]) || 0;
        const dayB = parseFloat(b["DayRepair"]) || 0;
        if (dayA !== dayB) return dayB - dayA;
        return (a["Ticket Number"] || "").localeCompare(b["Ticket Number"] || "");
      });
    }
    return items;
  }, [data, sortConfig]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage) || 1;
  const paginatedData = sortedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Dashboard card click handler
  const handleDashboardClick = (filter) => {
    setCurrentPage(1);

    // Case 1: Total Reset
    if (filter === 'total') {
      setDashboardFilter(null);
      setGmFilter(null);
      // Reset all other filters
      setTeamPlantFilter('');
      setPendingUnitFilter('');
      setStockAnswerFilter('');
      setStatusCallFilter('');
      setSearchTerm('');
      return;
    }

    // Case 2: GM Hierarchical Filter
    if (filter.startsWith && filter.startsWith('gm_')) {
      const gmName = filter.replace('gm_', '');
      // Toggle logic for GM
      setGmFilter(prev => prev === gmName ? null : gmName);
      return;
    }

    // Case 3: Status/Type Dashboard Filter
    // Toggle logic for general dashboard filters
    setDashboardFilter(prev => prev === filter ? null : filter);
  };

  // Analytics card handlers
  const handleOver7Click = () => {
    setDashboardFilter('over7');
    setCurrentPage(1);
  };

  const handleWaitingResponseClick = () => {
    setDashboardFilter('waitingResponse');
    setCurrentPage(1);
  };

  const handleMaxCardClick = (type) => {
    if (type === 'gmSummary') {
      setGmSummaryOpen(true);
      return;
    }
    if (summary.maxPendingUnit && summary.maxPendingUnit !== '-') {
      setPendingUnitFilter(summary.maxPendingUnit);
      setDashboardFilter(null);
      setCurrentPage(1);
    }
  };

  // Table interaction handlers
  const handlePoClick = (row) => setPoModal({ open: true, row });
  const handlePrClick = (row) => setPrModal({ open: true, row });
  const handleOtherPlantClick = (row) => setOtherPlantModal({ open: true, row });
  const handleStatusXClick = (row) => setStatusEditModal({ open: true, row });
  const handleStatusGroupClick = (row) => setSpacialModal({ open: true, row });
  const handleDetailClick = (row) => setTimelineModal({ open: true, row });
  const handleNawaClick = (row) => {
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : {};
    const userPlant = user.Plant || localStorage.getItem('userPlant') || '';

    const pendingUnit = row["ค้างหน่วยงาน"] ? row["ค้างหน่วยงาน"].toString().trim() : '';
    const requiredPlant = PLANT_MAPPING[pendingUnit];

    if (!userPlant || !requiredPlant || userPlant.trim() !== requiredPlant.trim()) {
      return;
    }
    setOutsideRequestModal({ open: true, row });
  };
  const handleTicketClick = (row) => setStickerModal({ open: true, row });

  // After status edit save, refresh data optimistically
  const handleStatusEditSaved = (actionType, ticket, material, newStatus) => {
    console.log(`Status ${actionType}: Ticket=${ticket}, Material=${material}, Status=${newStatus}`);
    if (actionType === 'delete') {
      // Find the row and optimistically restore its fallback TempStatusX
      const targetRow = allData.find(r =>
        String(r["Ticket Number"]).trim() === String(ticket).trim() &&
        String(r["Material"]).trim() === String(material).trim()
      );
      const fallbackStatus = targetRow?.TempStatusX || "รอของเข้า";
      console.log(`Fallback optimistic to: ${fallbackStatus}`);
      updateRowLocally(ticket, material, { StatusX: fallbackStatus, StatusCall: fallbackStatus, _highlight: 'delete', _highlightKey: Date.now() });
      refreshDataBackground();
    } else {
      updateRowLocally(ticket, material, { StatusX: newStatus, StatusCall: newStatus, _highlight: 'update', _highlightKey: Date.now() });
      refreshDataBackground(); // background refresh
    }
  };

  // After project save, refresh data optimistically
  const handleSpacialSaved = (actionType, ticket, statusCall, project) => {
    console.log(`SPACIAL ${actionType}: Ticket=${ticket}, StatusCall=${statusCall}, Project=${project}`);
    if (actionType === 'delete') {
      // Optimistically restore group ticket status fallback by checking first item
      const targetRow = allData.find(r => String(r["Ticket Number"]).trim() === String(ticket).trim());
      const fallbackStatus = targetRow?.TempStatusX || "รอของเข้า";
      updateRowLocally(ticket, null, { StatusCall: fallbackStatus, Answer1: "-", _highlight: 'delete', _highlightKey: Date.now() });
      refreshDataBackground();
    } else {
      updateRowLocally(ticket, null, { StatusCall: statusCall, Answer1: project, _highlight: 'update', _highlightKey: Date.now() });
      refreshDataBackground(); // background refresh
    }
  };

  // Simple routing logic
  const queryParams = new URLSearchParams(window.location.search);
  const currentPagePath = queryParams.get('page');

  if (currentPagePath === 'spare-summary') {
    return (
      <SpareSummaryPage
        data={data}
        rawSources={rawSources}
        isLoading={isLoading}
        onClose={() => window.close()}
      />
    );
  }

  if (currentPagePath === 'gm-summary' || gmSummaryOpen) {
    return (
      <GMSummaryPage
        data={allData}
        summary={summary}
        onClose={() => setGmSummaryOpen(false)}
      />
    );
  }

  return (
    <>
      {!isLoggedIn && (
        <LoginModal onLoginSuccess={(user) => {
          setIsLoggedIn(true);
          setCurrentUser(user);
          localStorage.setItem('user', JSON.stringify(user));
        }} />
      )}

      {isLoggedIn && (
        <div id="appContent" className="app-content">
          <AppHeader user={currentUser} onLogout={() => setIsLoggedIn(false)} lastUpdated={lastUpdated} />

          {isLoading ? (
            <div style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: 'var(--bg-color)', overflow: 'hidden'
            }}>
              <style>{`
                @keyframes app-cw    { to { transform: rotate(360deg); } }
                @keyframes app-ccw   { to { transform: rotate(-360deg); } }
                @keyframes app-pulse {
                  0%,100% { box-shadow: 0 0 0 0 rgba(0,123,255,0.45); transform: scale(1); }
                  50%     { box-shadow: 0 0 36px 14px rgba(0,123,255,0.1); transform: scale(1.08); }
                }
                @keyframes app-bounce {
                  0%,80%,100% { transform: translateY(0); opacity: 0.3; }
                  40%         { transform: translateY(-12px); opacity: 1; }
                }
                @keyframes app-shimmer {
                  0%   { transform: translateX(-100%); }
                  100% { transform: translateX(400%); }
                }
                @keyframes app-float {
                  0%   { transform: translateY(0) translateX(0) scale(1); opacity: 0; }
                  10%  { opacity: 0.55; }
                  90%  { opacity: 0.55; }
                  100% { transform: translateY(-110px) translateX(18px) scale(1.1); opacity: 0; }
                }
                @keyframes app-fadein {
                  from { opacity: 0; transform: translateY(22px); }
                  to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes app-scan {
                  0%   { top: -8%; }
                  100% { top: 108%; }
                }
              `}</style>

              {/* Floating ambient particles */}
              {[...Array(12)].map((_, i) => (
                <div key={i} style={{
                  position: 'absolute', borderRadius: '50%', pointerEvents: 'none',
                  width: `${5 + (i % 5) * 5}px`, height: `${5 + (i % 5) * 5}px`,
                  background: i % 3 === 0 ? 'rgba(0,123,255,0.2)' : i % 3 === 1 ? 'rgba(253,126,20,0.16)' : 'rgba(25,135,84,0.18)',
                  left: `${5 + i * 8}%`, bottom: `${8 + (i % 5) * 6}%`,
                  animation: `app-float ${3 + i * 0.32}s ease-in-out ${i * 0.22}s infinite`
                }} />
              ))}

              {/* Outer glow ring (decorative) */}
              <div style={{
                position: 'absolute', width: 280, height: 280, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(0,123,255,0.06) 0%, transparent 70%)',
                pointerEvents: 'none'
              }} />

              {/* Triple-orbit spinner */}
              <div style={{ position: 'relative', width: 180, height: 180, marginBottom: 44 }}>
                {/* Orbit 1 — blue, fast cw */}
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  border: '4px solid transparent',
                  borderTopColor: '#007bff',
                  borderRightColor: 'rgba(0,123,255,0.2)',
                  animation: 'app-cw 1.6s linear infinite'
                }} />
                {/* Orbit 2 — orange, medium ccw */}
                <div style={{
                  position: 'absolute', inset: 20, borderRadius: '50%',
                  border: '4px solid transparent',
                  borderTopColor: '#fd7e14',
                  borderLeftColor: 'rgba(253,126,20,0.2)',
                  animation: 'app-ccw 1.1s linear infinite'
                }} />
                {/* Orbit 3 — green, fast2 cw */}
                <div style={{
                  position: 'absolute', inset: 40, borderRadius: '50%',
                  border: '3px solid transparent',
                  borderTopColor: '#198754',
                  borderRightColor: 'rgba(25,135,84,0.2)',
                  animation: 'app-cw 0.75s linear infinite'
                }} />
                {/* Center badge pulsing */}
                <div style={{
                  position: 'absolute', inset: 58, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  animation: 'app-pulse 2.2s ease-in-out infinite',
                  boxShadow: '0 8px 24px rgba(0,123,255,0.35)'
                }}>
                  <i className="fas fa-truck-fast" style={{ fontSize: 26, color: '#fff' }} />
                </div>
              </div>

              {/* Text block */}
              <div style={{ textAlign: 'center', animation: 'app-fadein 0.8s ease both' }}>
                <div style={{
                  fontSize: 26, fontWeight: 900, letterSpacing: '-0.5px',
                  color: 'var(--text-primary)', marginBottom: 8
                }}>
                  กำลังเตรียมระบบ
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 32 }}>
                  ดึงข้อมูล Call · PR · PO · Stock เพื่อแสดงผล
                </div>

                {/* Bounce dots */}
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 32 }}>
                  {[
                    { color: '#007bff', delay: '0s' },
                    { color: '#fd7e14', delay: '0.18s' },
                    { color: '#198754', delay: '0.36s' },
                  ].map(({ color, delay }, i) => (
                    <span key={i} style={{
                      display: 'inline-block', width: 12, height: 12,
                      borderRadius: '50%', background: color,
                      animation: `app-bounce 1.3s ease-in-out ${delay} infinite`
                    }} />
                  ))}
                </div>

                {/* Shimmer progress bar */}
                <div style={{
                  width: 320, height: 5, borderRadius: 999,
                  background: 'rgba(0,0,0,0.08)', overflow: 'hidden',
                  position: 'relative', margin: '0 auto'
                }}>
                  <div style={{
                    position: 'absolute', top: 0, left: 0, height: '100%', width: '35%',
                    borderRadius: 999,
                    background: 'linear-gradient(90deg, transparent, #007bff 50%, transparent)',
                    animation: 'app-shimmer 1.7s ease-in-out infinite'
                  }} />
                </div>
              </div>
            </div>

          ) : (
            <>
              {currentUser?.Status === 'Admin' && (
                <GroupCards
                  title="สรุปผลตาม GM"
                  stats={summary.gmStats}
                  onCardClick={handleDashboardClick}
                  activeFilter={gmFilter}
                  prefix="gm_"
                />
              )}

              <DashboardCards
                data={summary}
                onCardClick={handleDashboardClick}
                activeCard={dashboardFilter}
              />

              <GroupCards
                stats={summary.callTypeStats}
                onCardClick={handleDashboardClick}
                activeFilter={dashboardFilter}
                prefix="calltype_"
              >
                <AnalyticsCards
                  data={summary}
                  onOpenGraph={() => setGraphOpen(true)}
                  onOpenSpareSummary={() => window.open('?page=spare-summary', '_blank')}
                  onOver7Click={handleOver7Click}
                  onWaitingResponseClick={handleWaitingResponseClick}
                  onMaxCardClick={handleMaxCardClick}
                  dashboardFilter={dashboardFilter}
                />
              </GroupCards>

              <ControlPanel
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                onSearch={() => setCurrentPage(1)}
                onPrintTable={() => {
                  if (selectedRows.length > 0) {
                    const selectedData = allData.filter(r => selectedRows.includes(r.id));
                    printStickers(selectedData);
                  } else {
                    window.print();
                  }
                }}
                onExportCSV={() => {
                  const timestamp = new Date().toISOString().split('T')[0];
                  exportToCSV(sortedData, `Call_Export_${timestamp}.csv`);
                }}
                onOpenSummary={() => setSummaryOpen(true)}
                onUpdateGuide={() => setUpdateGuideOpen(true)}
                onRefresh={refreshData}
                lastUpdated={lastUpdated}
                availableFilters={availableFilters}
                teamPlantFilter={teamPlantFilter}
                pendingUnitFilter={pendingUnitFilter}
                stockAnswerFilter={stockAnswerFilter}
                statusCallFilter={statusCallFilter}
                onTeamPlantChange={(v) => { setTeamPlantFilter(v); setCurrentPage(1); }}
                onPendingUnitChange={(v) => { setPendingUnitFilter(v); setCurrentPage(1); }}
                onStockAnswerChange={(v) => { setStockAnswerFilter(v); setCurrentPage(1); }}
                onStatusCallChange={(v) => { setStatusCallFilter(v); setCurrentPage(1); }}
              />

              <DataTable
                data={paginatedData}
                isLoading={isLoading}
                currentPage={currentPage}
                itemsPerPage={itemsPerPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
                selectedRows={selectedRows}
                onSelectAll={(e) => setSelectedRows(e.target.checked ? paginatedData.map(r => r.id) : [])}
                onSelectRow={(id) => setSelectedRows(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id])}
                sortConfig={sortConfig}
                onSort={handleSort}
                onPoClick={handlePoClick}
                onPrClick={handlePrClick}
                onOtherPlantClick={handleOtherPlantClick}
                onStatusXClick={handleStatusXClick}
                onStatusGroupClick={handleStatusGroupClick}
                onDetailClick={handleDetailClick}
                onNawaClick={handleNawaClick}
                onTicketClick={handleTicketClick}
              />
            </>
          )}

          <GraphModal
            isOpen={graphOpen}
            onClose={() => setGraphOpen(false)}
            data={data}
            onFilterPendingUnit={(unit) => {
              setPendingUnitFilter(unit);
              setTeamPlantFilter('');
              setStockAnswerFilter('');
              setStatusCallFilter('');
              setSearchTerm('');
              setDashboardFilter(null);
              setCurrentPage(1);
            }}
          />
          <SummaryModal
            isOpen={summaryOpen}
            onClose={() => setSummaryOpen(false)}
            data={data}
          />
          <SpareSummaryModal
            isOpen={spareSummaryOpen}
            onClose={() => setSpareSummaryOpen(false)}
            data={data}
            rawSources={rawSources}
            isLoading={isLoading}
          />

          {/* Table interaction modals */}
          <PoDetailsModal
            isOpen={poModal.open}
            onClose={() => setPoModal({ open: false, row: null })}
            material={poModal.row?.["Material"]}
            description={poModal.row?.["Description"] || poModal.row?.["Discription"] || ""}
            poRawData={rawSources.poRawData}
            nawaRawData={rawSources.nawaRawData}
          />
          <PrDetailsModal
            isOpen={prModal.open}
            onClose={() => setPrModal({ open: false, row: null })}
            material={prModal.row?.["Material"]}
            description={prModal.row?.["Description"] || prModal.row?.["Discription"] || ""}
            prRawData={rawSources.prRawData}
          />
          <OtherPlantModal
            isOpen={otherPlantModal.open}
            onClose={() => setOtherPlantModal({ open: false, row: null })}
            material={otherPlantModal.row?.["Material"]}
            description={otherPlantModal.row?.["Description"] || otherPlantModal.row?.["Discription"] || ""}
            plantStockData={rawSources.plantStockData}
          />
          <StatusEditModal
            isOpen={statusEditModal.open}
            onClose={() => setStatusEditModal({ open: false, row: null })}
            row={statusEditModal.row}
            allData={allData}
            onSaved={handleStatusEditSaved}
          />
          <ProjectModal
            isOpen={spacialModal.open}
            onClose={() => setSpacialModal({ open: false, row: null })}
            row={spacialModal.row}
            onSaved={handleSpacialSaved}
          />
          <TimelineModal
            isOpen={timelineModal.open}
            onClose={() => setTimelineModal({ open: false, row: null })}
            row={timelineModal.row}
          />
          <OutsideRequestModal
            isOpen={outsideRequestModal.open}
            onClose={() => setOutsideRequestModal({ open: false, row: null })}
            row={outsideRequestModal.row}
            onSubmit={async (payload) => {
              try {
                await handleOutsideRequest(payload);
                // Note: The modal closure is now handled inside Modals.jsx
                // to allow for the success animation to play before closing.
              } catch (err) {
                alert('ส่งข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
                throw err;
              }
            }}
          />
          <StickerModal
            isOpen={stickerModal.open}
            onClose={() => setStickerModal({ open: false, row: null })}
            row={stickerModal.row}
          />
          <UpdateGuideModal
            isOpen={updateGuideOpen}
            onClose={() => setUpdateGuideOpen(false)}
          />
        </div>
      )}
    </>
  );
}

export default App;
