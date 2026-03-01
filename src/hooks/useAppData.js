import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchAllData } from '../services/api';
import { processRawData, calculateSummary, getCleanTeamPlant, normalizeMaterial } from '../utils/helpers';

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
    const [gmFilter, setGmFilter] = useState(null); // New state for hierarchical filtering

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
                projectData,
                updateData,
                teamPlantData
            } = await fetchAllData();

            const now = new Date();
            let latestUpdateStr = now.toLocaleString('th-TH');

            if (Array.isArray(updateData) && updateData.length > 0) {
                // Find the maximum date from the "Date" column
                const dates = updateData
                    .map(row => row.Date)
                    .filter(d => d)
                    .map(d => {
                        // Handle date parsing (assuming DD/MM/YYYY or similar)
                        const parts = d.split('/');
                        if (parts.length === 3) {
                            let day = parseInt(parts[0], 10);
                            let month = parseInt(parts[1], 10) - 1;
                            let year = parseInt(parts[2], 10);
                            if (year < 2500) year += 543; // Convert to Buddhist Era if needed, or keep as is.
                            // However, the original code used th-TH which is BE. 
                            // Let's assume the sheet has standard dates or strings that we should just find the max of.
                            // If they are strings like "28/02/2026", we need to parse them to compare.
                            return { original: d, date: new Date(year > 2500 ? year - 543 : year, month, day) };
                        }
                        return null;
                    })
                    .filter(item => item && !isNaN(item.date.getTime()));

                if (dates.length > 0) {
                    const maxItem = dates.reduce((max, curr) => curr.date > max.date ? curr : max, dates[0]);
                    latestUpdateStr = maxItem.original;
                }
            }
            setLastUpdated(latestUpdateStr);

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
                projectData,
                teamPlantData
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

            if (excludeType !== 'gm' && gmFilter && row.GM !== gmFilter) return false;

            return true;
        });
    }, [processedData, teamPlantFilter, pendingUnitFilter, stockAnswerFilter, statusCallFilter, searchTerm, gmFilter]);

    // Apply dashboard card filter (matching original applyDashboardFilter)
    const applyDashboardFilter = useCallback((data, filter) => {
        if (!filter || !data) return data;

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
            case 'spacial': return data.filter(row => (row.StatusCall || "") === "SPACIAL");
            default:
                if (filter.startsWith && filter.startsWith('calltype_')) {
                    const typeName = filter.replace('calltype_', '');
                    return data.filter(row => (row["Call Type"] || "") === typeName);
                }
                return data;
        }
    }, []);

    // Final filtered data (base + dashboard)
    const baseFilteredData = useMemo(() => getFilteredData(null), [getFilteredData]);
    const filteredData = useMemo(() => applyDashboardFilter([...baseFilteredData], dashboardFilter), [baseFilteredData, dashboardFilter, applyDashboardFilter]);

    // Summary calculation optimized for hierarchical/faceted view
    const summary = useMemo(() => {
        // 1. GM Stats: Filtered by everything EXCEPT GM filter (so we see all GMs)
        const gmData = getFilteredData('gm');
        const gmSummary = calculateSummary(gmData);

        // 2. Dashboard Stats (Main cards): Filtered by GM selection
        const dashboardSummary = calculateSummary(baseFilteredData);

        // 3. Call Type Stats: Filtered by GM and ONLY Status (so other Call Type cards stay visible)
        const statusOnlyFilter = (dashboardFilter && !dashboardFilter.startsWith('calltype_')) ? dashboardFilter : null;
        const statusOnlyFilteredData = applyDashboardFilter([...baseFilteredData], statusOnlyFilter);
        const callTypeSummary = calculateSummary(statusOnlyFilteredData);

        return {
            ...dashboardSummary, // Main stats from GM-filtered data
            gmStats: gmSummary.gmStats, // GM cards from all-GM data
            callTypeStats: callTypeSummary.callTypeStats // Call Type cards from fully filtered data
        };
    }, [getFilteredData, baseFilteredData, filteredData]);

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

                    if (newStatusCall === "รอของเข้า" || newStatusCall === "ดึงจากคลังอื่น") {
                        const hasOtherPlant = validRows.some(r => {
                            const op = r["OtherPlant"];
                            return r.StatusX === "ดึงจากคลังอื่น" || (op !== undefined && op !== null && op !== "" && op !== "-" && op !== 0 && op !== "0");
                        });

                        const allOtherPlant = validRows.every(r => {
                            const op = r["OtherPlant"];
                            return r.StatusX === "ดึงจากคลังอื่น" || (op !== undefined && op !== null && op !== "" && op !== "-" && op !== 0 && op !== "0");
                        });

                        if (allOtherPlant && validRows.length > 0) {
                            newStatusCall = "ดึงจากคลังอื่น";
                        }
                    }
                    if (newStatusCall === "รอของเข้า" || newStatusCall === "ดึงจากคลังอื่น") {
                        if (validRows.some(r => r.StatusX === "เกินLeadtime")) {
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
        gmFilter, setGmFilter,
        applyDashboardFilter,
        refreshData: () => fetchData(true),
        refreshDataBackground: () => fetchData(false),
        updateRowLocally,
        handleOutsideRequest: async (payload) => {
            const { material, quantity } = payload;
            const localKey = normalizeMaterial(material);
            const localQty = parseFloat(quantity);

            if (!localKey || isNaN(localQty)) {
                throw new Error("Invalid material or quantity");
            }

            // 1. Optimistic Update Local Cache (requestQuantities)
            let currentCache = {};
            try {
                const cachedPropsText = localStorage.getItem('app_cached_requestQuantities');
                if (cachedPropsText) {
                    currentCache = JSON.parse(cachedPropsText);
                }
            } catch (e) {
                console.error("Error reading cache", e);
            }
            const previousQty = currentCache[localKey] || 0;
            currentCache[localKey] = previousQty + localQty;
            localStorage.setItem('app_cached_requestQuantities', JSON.stringify(currentCache));

            // Force refresh of the processed data to reflect the new Request quantity
            // A lightweight way is to re-run the processor on the existing state, but fetchData(false) is safer
            fetchData(false);

            // 2. Background Fetch to GAS
            const gasUrl = 'https://script.google.com/macros/s/AKfycbycEiGdjEFmLSPSqgBUBBntG0OnaatLTkNozlZTn0RRgZHiuL9HCWisIsmMqth9Dzrv/exec';

            try {
                await fetch(gasUrl, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: `action=insertRequest&payload=${encodeURIComponent(JSON.stringify(payload))}`
                });
                return true;
            } catch (err) {
                console.error("Outside request sync failed:", err);
                // Even if no-cors fetch fails silently, we gracefully handle it
                // We do NOT revert optimistic update because no-cors often throws False negatives in modern browsers
                // Just log it.
                return true;
            }
        }
    };
}
