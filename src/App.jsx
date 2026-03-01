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
import { DetailModal, ActionModal, GraphModal, SummaryModal, SpareSummaryModal, OutsideRequestModal, StickerModal } from './components/Modals';
import { PoDetailsModal, PrDetailsModal, OtherPlantModal, StatusEditModal, ProjectModal, TimelineModal } from './components/TableModals';

import { useAppData } from './hooks/useAppData';
import { PLANT_MAPPING, exportToCSV } from './utils/helpers';
import SpareSummaryPage from './components/SpareSummaryPage';

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

  // Table interaction modal states
  const [poModal, setPoModal] = useState({ open: false, row: null });
  const [prModal, setPrModal] = useState({ open: false, row: null });
  const [otherPlantModal, setOtherPlantModal] = useState({ open: false, row: null });
  const [statusEditModal, setStatusEditModal] = useState({ open: false, row: null });
  const [spacialModal, setSpacialModal] = useState({ open: false, row: null });
  const [timelineModal, setTimelineModal] = useState({ open: false, row: null });
  const [outsideRequestModal, setOutsideRequestModal] = useState({ open: false, row: null });
  const [stickerModal, setStickerModal] = useState({ open: false, row: null });

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

  const handleMaxCardClick = () => {
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
            <div id="loading" className="loading show">
              <div className="spinner-container">
                <div className="cute-spinner">
                  <i className="fas fa-cog fa-spin"></i>
                  <i className="fas fa-tools"></i>
                </div>
                <p>กำลังโหลดข้อมูล...</p>
              </div>
            </div>
          ) : (
            <>
              <GroupCards
                title="สรุปผลตาม GM"
                stats={summary.gmStats}
                onCardClick={handleDashboardClick}
                activeFilter={gmFilter}
                prefix="gm_"
              />

              <DashboardCards
                data={summary}
                onCardClick={handleDashboardClick}
                activeCard={dashboardFilter}
              />

              <GroupCards
                title="สรุปผลตาม Call Type"
                stats={summary.callTypeStats}
                onCardClick={handleDashboardClick}
                activeFilter={dashboardFilter}
                prefix="calltype_"
              />

              <AnalyticsCards
                data={summary}
                onOpenGraph={() => setGraphOpen(true)}
                onOpenSpareSummary={() => window.open('?page=spare-summary', '_blank')}
                onOver7Click={handleOver7Click}
                onWaitingResponseClick={handleWaitingResponseClick}
                onMaxCardClick={handleMaxCardClick}
                dashboardFilter={dashboardFilter}
              />

              <ControlPanel
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                onSearch={() => setCurrentPage(1)}
                onPrintTable={() => window.print()}
                onExportCSV={() => {
                  const timestamp = new Date().toISOString().split('T')[0];
                  exportToCSV(sortedData, `Call_Export_${timestamp}.csv`);
                }}
                onOpenSummary={() => setSummaryOpen(true)}
                onUpdateGuide={() => { }}
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
        </div>
      )}
    </>
  );
}

export default App;
