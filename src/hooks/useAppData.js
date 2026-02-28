import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchAllData } from '../services/api';
import { processRawData, calculateSummary, getCleanTeamPlant } from '../utils/helpers';

export function useAppData() {
    const [processedData, setProcessedData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);

    // Single-value filters (matching original call.js behavior)
    const [rawSources, setRawSources] = useState({ nawaRawData: [], poRawData: [], prRawData: [] });
    const [searchTerm, setSearchTerm] = useState('');
    const [dashboardFilter, setDashboardFilter] = useState(null); // null = show all
    const [teamPlantFilter, setTeamPlantFilter] = useState('');
    const [pendingUnitFilter, setPendingUnitFilter] = useState('');
    const [stockAnswerFilter, setStockAnswerFilter] = useState('');
    const [statusCallFilter, setStatusCallFilter] = useState('');

    const fetchData = useCallback(async (showLoading = true) => {
        if (showLoading) setIsLoading(true);
        setError(null);
        try {
            const {
                mainData,
                requestData,
                poData,
                prData,
                mainSapData,
                vipaData,
                nawaData,
                plantStockData,
                newPartData,
                projectData
            } = await fetchAllData();

            const now = new Date();
            setLastUpdated(now.toLocaleString('th-TH'));

            const processed = processRawData(
                mainData,
                requestData,
                poData,
                prData,
                mainSapData,
                vipaData,
                nawaData,
                plantStockData,
                newPartData,
                projectData
            );
            setProcessedData(processed);
            setRawSources({ nawaRawData: nawaData, poRawData: poData, prRawData: prData, plantStockData: plantStockData });
        } catch (err) {
            console.error(err);
            setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
        } finally {
            if (showLoading) setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData(true);
        const interval = setInterval(() => fetchData(false), 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [fetchData]);

    // --- Filtering Logic (matching original call.js exactly) ---

    // Base filter: applies TeamPlant, PendingUnit, StockAnswer, StatusCall, and Search
    // excludeType allows cross-filtering (skipping one filter to compute its options)
    const getFilteredData = useCallback((excludeType = null) => {
        return processedData.filter(row => {
            if (!row) return false;
            const cleanTP = getCleanTeamPlant(row["TeamPlant"]);

            // TeamPlant filter
            if (excludeType !== 'teamPlant' && teamPlantFilter && cleanTP !== teamPlantFilter) return false;
            // PendingUnit filter
            if (excludeType !== 'pending' && pendingUnitFilter && (row["ค้างหน่วยงาน"] || "") !== pendingUnitFilter) return false;
            // StockAnswer filter
            if (excludeType !== 'stock' && stockAnswerFilter && (row["คลังตอบ"] || "") !== stockAnswerFilter) return false;
            // StatusCall filter (uses StatusX = row-level status, matching original)
            if (excludeType !== 'status' && statusCallFilter && (row.StatusX || "") !== statusCallFilter) return false;

            // Search term
            if (searchTerm) {
                const keyword = searchTerm.toLowerCase().trim();
                const fields = [
                    row["DayRepair"], row["DateTime"], row["Ticket Number"],
                    row["Brand"], row["Call Type"], row["Team"],
                    cleanTP, row["ค้างหน่วยงาน"], row["Material"],
                    row["Description"], row["Nawa"], row["Vipa"],
                    row["QtyPlant"], row["OtherPlant"], row["คลังตอบ"],
                    row["UserAns"], row["วันที่ตอบ"], row["StatusCall"]
                ];
                const match = fields.some(f => f && String(f).toLowerCase().includes(keyword));
                if (!match) return false;
            }

            return true;
        });
    }, [processedData, teamPlantFilter, pendingUnitFilter, stockAnswerFilter, statusCallFilter, searchTerm]);

    // Apply dashboard card filter (matching original applyDashboardFilter)
    const applyDashboardFilter = useCallback((data, filter) => {
        if (!filter || !data) return data;
        if (filter.startsWith && filter.startsWith('calltype_')) {
            const type = filter.split('_')[1];
            return data.filter(row => (row["Call Type"] || "") === type);
        }
        switch (filter) {
            case 'pending': return data.filter(row => (row.StatusCall || "") === "รอของเข้า");
            case 'success': return data.filter(row => (row.StatusCall || "") === "ระหว่างขนส่ง");
            case 'waitingResponse': return data.filter(row => (row["คลังตอบ"] || "") === "รอตรวจสอบ");
            case 'over7': return data.filter(row => parseFloat(row["DayRepair"] || 0) > 7);
            case 'request': return data.filter(row => (row.StatusCall || "") === "ขอซื้อขอซ่อม");
            case 'otherPlant': return data.filter(row => (row.StatusCall || "") === "ดึงจากคลังอื่น");
            case 'newPart': return data.filter(row => (row.StatusCall || "") === "เปิดรหัสใหม่");
            case 'exceedLeadtime': return data.filter(row => (row.StatusCall || "") === "เกินLeadtime");
            case 'nawaVipa': return data.filter(row => (row.StatusCall || "") === "เบิกศูนย์อะไหล่");
            case 'project': return data.filter(row => (row.StatusCall || "") === "Project");
            default: return data;
        }
    }, []);

    // Final filtered data (base + dashboard)
    const baseFilteredData = useMemo(() => getFilteredData(null), [getFilteredData]);
    const filteredData = useMemo(() => applyDashboardFilter([...baseFilteredData], dashboardFilter), [baseFilteredData, dashboardFilter, applyDashboardFilter]);

    // Summary from filtered data
    const summary = useMemo(() => calculateSummary(filteredData), [filteredData]);

    // Cross-filtered data for each filter panel
    const teamPlantFilterData = useMemo(() => applyDashboardFilter(getFilteredData('teamPlant'), dashboardFilter), [getFilteredData, dashboardFilter, applyDashboardFilter]);
    const pendingFilterData = useMemo(() => applyDashboardFilter(getFilteredData('pending'), dashboardFilter), [getFilteredData, dashboardFilter, applyDashboardFilter]);
    const stockFilterData = useMemo(() => applyDashboardFilter(getFilteredData('stock'), dashboardFilter), [getFilteredData, dashboardFilter, applyDashboardFilter]);
    const statusFilterData = useMemo(() => applyDashboardFilter(getFilteredData('status'), dashboardFilter), [getFilteredData, dashboardFilter, applyDashboardFilter]);

    // Compute filter options with ticket counts (matching original)
    const computeFilterOptions = useCallback((data, field, transform) => {
        const ticketSets = {};
        data.forEach(row => {
            let val = transform ? transform(row) : (row[field] || "");
            const ticket = row["Ticket Number"];
            if (val && ticket) {
                if (!ticketSets[val]) ticketSets[val] = new Set();
                ticketSets[val].add(ticket);
            }
        });
        const counts = {};
        Object.keys(ticketSets).forEach(key => counts[key] = ticketSets[key].size);
        return counts;
    }, []);

    const availableFilters = useMemo(() => ({
        teamPlant: computeFilterOptions(teamPlantFilterData, null, (row) => getCleanTeamPlant(row["TeamPlant"])),
        pendingUnit: computeFilterOptions(pendingFilterData, "ค้างหน่วยงาน"),
        stockAnswer: computeFilterOptions(stockFilterData, "คลังตอบ"),
        statusCall: computeFilterOptions(statusFilterData, null, (row) => row.StatusX || "")
    }), [teamPlantFilterData, pendingFilterData, stockFilterData, statusFilterData, computeFilterOptions]);

    // Optimistic update for DOM re-render without full fetch
    const updateRowLocally = useCallback((ticketNumber, material, updates) => {
        setProcessedData(prevData => {
            let newData = prevData.map(row => {
                const tickRow = String(row["Ticket Number"] || "").replace(/^'/, '').trim();
                let isMatch = tickRow === ticketNumber;
                if (isMatch && material) {
                    const matRow = String(row["Material"] || "").replace(/^'/, '').trim();
                    isMatch = matRow === material;
                }
                if (isMatch) {
                    return { ...row, ...updates };
                }
                return row;
            });

            // Re-evaluate group StatusCall based on new StatusX values
            const ticketRows = newData.filter(row => String(row["Ticket Number"] || "").replace(/^'/, '').trim() === ticketNumber);
            if (ticketRows.length > 0) {
                let newStatusCall = "รอของเข้า";
                // If it's a project (Answer1 exists and is not "-")
                if (ticketRows[0].Answer1 && ticketRows[0].Answer1 !== "-") {
                    newStatusCall = ticketRows[0].StatusCall;
                } else {
                    const validRows = ticketRows.filter(r => r.StatusX !== "แจ้งCodeผิด");
                    const evals = validRows.length > 0 ? validRows : ticketRows;

                    if (evals.some(r => r.StatusX === "เปิดรหัสใหม่")) newStatusCall = "เปิดรหัสใหม่";
                    else if (evals.some(r => r.StatusX === "ขอซื้อขอซ่อม")) newStatusCall = "ขอซื้อขอซ่อม";
                    else if (evals.some(r => r.StatusX === "รอของเข้า")) newStatusCall = "รอของเข้า";
                    else if (evals.some(r => r.StatusX === "เบิกนวนคร" || r.StatusX === "เบิกวิภาวดี")) newStatusCall = "เบิกศูนย์อะไหล่";
                    else if (evals.some(r => r.StatusX === "ระหว่างขนส่ง")) newStatusCall = "ระหว่างขนส่ง";
                    else if (ticketRows.some(r => r.StatusX === "แจ้งCodeผิด")) newStatusCall = "แจ้งCodeผิด";

                    if (newStatusCall === "รอของเข้า") {
                        const allOtherPlant = ticketRows.every(r => {
                            const op = r["OtherPlant"];
                            return r.StatusX === "ดึงจากคลังอื่น" || (op !== undefined && op !== null && op !== "" && op !== "-" && op !== 0 && op !== "0");
                        });

                        // If all items under the ticket are "ดึงจากคลังอื่น", set the group StatusCall to "ดึงจากคลังอื่น"
                        if (allOtherPlant && ticketRows.length > 0) {
                            newStatusCall = "ดึงจากคลังอื่น";
                        }
                    }
                    if (newStatusCall === "รอของเข้า" || newStatusCall === "ดึงจากคลังอื่น") {
                        if (ticketRows.some(r => r.StatusX === "เกินLeadtime")) {
                            newStatusCall = "เกินLeadtime";
                        }
                    }
                }

                // Apply the re-evaluated group status to all rows of this ticket
                newData = newData.map(row => {
                    const tickRow = String(row["Ticket Number"] || "").replace(/^'/, '').trim();
                    if (tickRow === ticketNumber) {
                        return { ...row, StatusCall: newStatusCall };
                    }
                    return row;
                });
            }

            return newData;
        });
    }, []);

    return {
        data: filteredData,
        allData: processedData,
        baseFilteredData,
        isLoading,
        error,
        lastUpdated,
        summary,
        availableFilters,
        rawSources,
        // Single-select filters
        teamPlantFilter, setTeamPlantFilter,
        pendingUnitFilter, setPendingUnitFilter,
        stockAnswerFilter, setStockAnswerFilter,
        statusCallFilter, setStatusCallFilter,
        searchTerm, setSearchTerm,
        dashboardFilter, setDashboardFilter,
        applyDashboardFilter,
        refreshData: () => fetchData(true),
        refreshDataBackground: () => fetchData(false),
        updateRowLocally
    };
}
