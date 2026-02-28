// Helper functions for call data processing

export function parseDateString(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        let day = parseInt(parts[0], 10);
        let month = parseInt(parts[1], 10) - 1;
        let yearStr = parts[2].split(' ')[0];
        let year = parseInt(yearStr, 10);
        if (year < 2000) year += 2000;
        return new Date(year, month, day);
    }
    return null;
}

export function isValidDate(d) {
    return d instanceof Date && !isNaN(d);
}

export function calculateDaysBetween(startDate, endDate) {
    if (!isValidDate(startDate) || !isValidDate(endDate)) return null;
    const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function normalizeMaterial(mat) {
    if (mat == null) return "";
    let strMat = typeof mat === 'number' ? Math.trunc(mat).toString() : mat.toString();
    return strMat.trim().replace(/^'/, '').trim().replace(/\s+/g, '').toUpperCase();
}

export const PLANT_MAPPING = {
    "Stock กทม": "0301",
    "Stock ระยอง": "0369",
    "Stock วิภาวดี 62": "0326",
    "Stock ขอนแก่น": "0319",
    "Stock โคราช": "0309",
    "Stock เชียงใหม่": "0366",
    "Stock พระราม 3": "0304",
    "Stock พิษณุโลก": "0312",
    "Stock ภูเก็ต": "0313",
    "Stock ราชบุรี": "0305",
    "Stock ลำปาง": "0320",
    "Stock ศรีราชา": "0311",
    "Stock สุราษฎร์": "0307",
    "Stock ประเวศ": "0330",
    "Stock SA ฉะเชิงเทรา": "0367",
    "Stock SA บางบัวทอง": "0364",
};

// Data computations
function computeRequestQuantities(data) {
    const result = {};
    if (!Array.isArray(data)) return result;
    data.forEach(row => {
        const status = (row?.status ?? row?.Status ?? row?.STATUS ?? row?.สถานะ ?? row?.["status"] ?? row?.["Status"] ?? "").toString().trim();
        if (status && status !== "รอเบิก") return; // "รอเบิก" was REQUEST_STATUS_TARGET
        const material = normalizeMaterial(row?.Material ?? row?.material ?? row?.MaterialCode ?? row?.Mat ?? row?.Item ?? "");

        let qtyRaw = row?.qty ?? row?.Qty ?? row?.QTY ?? row?.Quantity ?? row?.quantity ?? row?.["จำนวน"] ?? row?.["จำนวนที่ขอเบิก"] ?? 0;
        let qty = 0;
        if (typeof qtyRaw === 'number') {
            qty = qtyRaw;
        } else if (typeof qtyRaw === 'string') {
            qty = parseFloat(qtyRaw.replace(/,/g, ''));
        }
        if (material && !isNaN(qty) && qty > 0) {
            result[material] = (result[material] || 0) + qty;
        }
    });

    // Merge Optimistic Cache
    try {
        const cachedStr = localStorage.getItem('app_cached_requestQuantities');
        if (cachedStr) {
            const cached = JSON.parse(cachedStr);
            Object.keys(cached).forEach(mat => {
                if (cached[mat] > 0) {
                    result[mat] = (result[mat] || 0) + cached[mat];
                }
            });
        }
    } catch (e) { console.warn("Cache parse err", e); }

    return result;
}

function computePrQuantities(data) {
    const result = {};
    if (!Array.isArray(data)) return result;
    data.forEach(row => {
        const material = normalizeMaterial(row["Material"] || "");
        if (!material) return;
        const req = parseFloat((row["Quantity requested"] || "0").toString().replace(/,/g, '')) || 0;
        const ord = parseFloat((row["Quantity ordered"] || "0").toString().replace(/,/g, '')) || 0;
        const qty = req - ord;
        if (qty > 0) {
            result[material] = (result[material] || 0) + qty;
        }
    });
    return result;
}

function computePoQuantities(data) {
    const result = {};
    if (!Array.isArray(data)) return result;
    data.forEach(row => {
        const material = normalizeMaterial(row["Material"] || "");
        if (!material) return;
        const qtyRaw = row["Still to be delivered (qty)"];
        const qty = parseFloat((qtyRaw + "").replace(/,/g, ''));
        if (!isNaN(qty) && qty > 0) {
            result[material] = (result[material] || 0) + qty;
        }
    });
    return result;
}

function computeStockQuantities(data) {
    const result = {};
    if (!Array.isArray(data)) return result;
    data.forEach(row => {
        const material = normalizeMaterial(row["Material"] || "");
        if (!material) return;
        const qtyRaw = row["Unrestricted"];
        const qty = parseFloat((qtyRaw + "").replace(/,/g, ''));
        if (!isNaN(qty)) {
            result[material] = qty;
        }
    });
    return result;
}

function computePlantStockQuantities(data) {
    const byPlant = {};
    const byMaterial = {};
    if (!Array.isArray(data)) return { byPlant, byMaterial };
    data.forEach(row => {
        const material = normalizeMaterial(row["Material"] || "");
        const plant = (row["Plant"] || "").toString().trim();
        if (!material) return;
        const qtyRaw = row["Unrestricted"];
        const qty = parseFloat((qtyRaw + "").replace(/,/g, ''));
        if (!isNaN(qty)) {
            if (plant) {
                const key = `${plant}_${material}`;
                byPlant[key] = (byPlant[key] || 0) + qty;
            }
            byMaterial[material] = (byMaterial[material] || 0) + qty;
        }
    });
    return { byPlant, byMaterial };
}

// Logic to process raw data and merge with new limits/projects
export function calculateStockPendingInfo(row) {
    const pendingUnit = row["ค้างหน่วยงาน"] || "";
    if (!pendingUnit.toLowerCase().includes("stock")) {
        return { days: "0", date: "-" };
    }

    const timelineText = row["TimeLine"];
    if (!timelineText) return { days: "0", date: "-" };

    const events = timelineText.split('|');
    let startStockDateObj = null;
    let displayDateStr = "-";

    for (let i = events.length - 1; i >= 0; i--) {
        let eventTrim = events[i].trim();
        if (!eventTrim) continue;

        const statusMatch = eventTrim.match(/^(\d{2}\.\d{2})\s+.*แจ้งค้าง_/i);
        if (statusMatch) {
            if (eventTrim.toLowerCase().includes("แจ้งค้าง_stock")) {
                let dateStr = statusMatch[1];
                const [day, month] = dateStr.split('.').map(Number);
                if (day && month) {
                    const today = new Date();
                    let year = today.getFullYear();
                    let tempDate = new Date(year, month - 1, day);

                    if (tempDate.getTime() > today.getTime() + (180 * 24 * 60 * 60 * 1000)) {
                        year--;
                        tempDate = new Date(year, month - 1, day);
                    }
                    startStockDateObj = tempDate;
                    displayDateStr = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
                }
            } else {
                if (startStockDateObj) {
                    break;
                }
            }
        }
    }

    if (startStockDateObj) {
        const today = new Date();
        startStockDateObj.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        const diffTime = Math.max(0, today.getTime() - startStockDateObj.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return { days: diffDays.toString(), date: displayDateStr };
    }
    return { days: "0", date: "-" };
}

export function processRawData(
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
) {
    // 1. Precalculate dictionaries
    const reqQ = computeRequestQuantities(requestData);
    const prQ = computePrQuantities(prData);
    const poQ = computePoQuantities(poData);
    const vipaStock = computeStockQuantities(vipaData);
    const nawaStock = computeStockQuantities(nawaData);
    const { byPlant: plantStock, byMaterial: otherPlantStock } = computePlantStockQuantities(plantStockData);

    const mainSapMap = new Map();
    if (Array.isArray(mainSapData)) {
        mainSapData.forEach(r => {
            const mat = normalizeMaterial(r["Material"]);
            if (mat) mainSapMap.set(mat, r);
        });
    }

    const newPartMap = new Map();
    if (Array.isArray(newPartData)) {
        newPartData.forEach(p => {
            const tNum = String(p["Ticket Number"] || "").replace(/^'/, '').trim();
            const mat = String(p["Material"] || "").replace(/^'/, '').trim();
            const key = `${tNum}_${mat}`;
            const existing = newPartMap.get(key);
            if (!existing || new Date(p.Timestamp) > new Date(existing.Timestamp)) {
                newPartMap.set(key, {
                    Status: (p["Status"] || p.StatusCall || "").toString().trim(),
                    Timestamp: p.Timestamp
                });
            }
        });
    }

    const projectMap = new Map();
    if (Array.isArray(projectData)) {
        projectData.forEach(p => {
            const tNum = String(p["Ticket Number"] || "").replace(/^'/, '').trim();
            if (!projectMap.has(tNum) || new Date(p.Timestamp) > new Date(projectMap.get(tNum).Timestamp)) {
                projectMap.set(tNum, {
                    project: (p["Project"] || "").toString().trim(),
                    statusCall: (p["StatusCall"] || "").toString().trim()
                });
            }
        });
    }

    // 2. Iterate, mutate, attach values
    const enrichedData = mainData.map(row => {
        let r = { ...row, id: row['Ticket Number'] + '_' + row['Material'] };
        const mat = normalizeMaterial(r["Material"]);
        const tNum = String(r["Ticket Number"]).replace(/^'/, '').trim();

        // Stock attachments
        r["Vipa"] = vipaStock[mat] !== undefined ? vipaStock[mat] : "";
        if (r["Vipa"] === 0 || r["Vipa"] === "0") r["Vipa"] = "";

        // Nawa (นวนคร): Combine stock and requested quantity
        r["Nawa"] = nawaStock[mat] !== undefined ? nawaStock[mat] : "";
        if (r["Nawa"] === 0 || r["Nawa"] === "0") r["Nawa"] = "";

        // Add optimistic request quantities to Nawa if they exist
        const reqQty = reqQ[mat];
        if (reqQty !== undefined && reqQty > 0) {
            const currentNawa = parseFloat(r["Nawa"]) || 0;
            r["Nawa"] = currentNawa + reqQty;
        }

        r["PO"] = poQ[mat] !== undefined ? poQ[mat] : "-";
        r["PR"] = prQ[mat] !== undefined ? prQ[mat] : "";
        r["Request"] = reqQty !== undefined ? reqQty : "";

        // Plant Stock attachment
        let teamPlant = r["TeamPlant"];
        if (teamPlant && PLANT_MAPPING[teamPlant]) {
            const plantCode = PLANT_MAPPING[teamPlant];
            const pKey = `${plantCode}_${mat}`;
            const qty = plantStock[pKey];
            r["QtyPlant"] = qty !== undefined && qty > 0 ? qty : "";
        } else {
            r["QtyPlant"] = "";
        }

        // OtherPlant
        const otherQty = otherPlantStock[mat];
        r["OtherPlant"] = otherQty !== undefined && otherQty > 0 ? otherQty : "";

        // Rebuilt
        r["Rebuilt"] = "";
        if (mainSapMap.has(mat)) {
            let val = mainSapMap.get(mat)["Rebuilt"];
            if (val !== undefined && val !== null) {
                val = String(val).trim();
                if (val !== "" && val !== "-" && val !== "0") {
                    r["Rebuilt"] = val;
                }
            }
        }

        // Default StatusX derivation is now handled together with StatusCall in the group loop
        // to maintain exact parity with call.js calculateTicketStatus where the ticket group dictates
        // the baseline status, but StatusX can be overridden individually.
        // We will assign a temporary fallback here, and resolve it properly below.
        r.TempStatusX = "รอของเข้า";
        const hasNoMaterial = !mat || mat === "-" || mat === "";
        if (hasNoMaterial) {
            r.TempStatusX = "ขอซื้อขอซ่อม";
        } else {
            const hasQtyPlant = r["QtyPlant"] && r["QtyPlant"] !== "" && r["QtyPlant"] !== "0";
            if (hasQtyPlant) {
                r.TempStatusX = "ระหว่างขนส่ง";
            } else {
                const hasNawa = r["Nawa"] && r["Nawa"] !== "" && r["Nawa"] !== "0";
                if (hasNawa) {
                    r.TempStatusX = "เบิกนวนคร";
                } else {
                    const hasVipa = r["Vipa"] && r["Vipa"] !== "" && r["Vipa"] !== "0";
                    if (hasVipa) {
                        r.TempStatusX = "เบิกวิภาวดี";
                    }
                }
            }
        }
        r.StatusX = r.TempStatusX;

        // Pending Stock Days
        const stockPendingInfo = calculateStockPendingInfo(r);
        r["PendingStockDays"] = stockPendingInfo.days;
        r["StockStartDate"] = stockPendingInfo.date;

        // Clean values
        r['TeamPlant'] = r['TeamPlant'] || 'ไม่ระบุ';
        r['ค้างหน่วยงาน'] = r['ค้างหน่วยงาน'] || 'ไม่ระบุ';
        r['คลังตอบ'] = r['คลังตอบ'] || 'ไม่ระบุ';

        return r;
    });

    // 3. Group by Ticket and resolve StatusCall
    const ticketGroups = {};
    enrichedData.forEach(r => {
        const ticket = r["Ticket Number"];
        if (!ticket) return;
        if (!ticketGroups[ticket]) ticketGroups[ticket] = [];
        ticketGroups[ticket].push(r);
    });

    Object.keys(ticketGroups).forEach(ticket => {
        const rows = ticketGroups[ticket];
        let statusCall = "รอของเข้า";

        // Define priorities and calculate StatusCall
        const rowStatuses = rows.map(r => {
            const mat = normalizeMaterial(r["Material"]);
            const key = `${ticket}_${mat}`;
            const overridenStatusObj = newPartMap.get(key);
            const overridenStatus = overridenStatusObj ? overridenStatusObj.Status : null;
            return overridenStatus || r.StatusX || "";
        });

        const validStatuses = rowStatuses.filter(s => s !== "แจ้งCodeผิด");
        const statusesToEval = validStatuses.length > 0 ? validStatuses : rowStatuses;

        if (projectMap.has(ticket)) {
            const proj = projectMap.get(ticket);
            if (proj.statusCall) statusCall = proj.statusCall;
            rows.forEach(r => r['Answer1'] = proj.project || r['Answer1']);
        } else if (statusesToEval.includes("เปิดรหัสใหม่")) {
            statusCall = "เปิดรหัสใหม่";
        } else if (statusesToEval.includes("ขอซื้อขอซ่อม")) {
            statusCall = "ขอซื้อขอซ่อม";
        } else if (statusesToEval.includes("รอของเข้า")) {
            statusCall = "รอของเข้า";
        } else if (statusesToEval.some(s => s === "เบิกนวนคร" || s === "เบิกวิภาวดี")) {
            statusCall = "เบิกศูนย์อะไหล่";
        } else if (statusesToEval.includes("ระหว่างขนส่ง")) {
            statusCall = "ระหว่างขนส่ง";
        } else if (rowStatuses.includes("แจ้งCodeผิด")) {
            statusCall = "แจ้งCodeผิด";
        }

        // Exceed Leadtime check for group status (exclude 'แจ้งCodeผิด')
        if (statusCall === "รอของเข้า" || statusCall === "ดึงจากคลังอื่น") {
            const hasExceedLeadTime = rows.some(r => {
                const mat = normalizeMaterial(r["Material"]);
                const key = `${ticket}_${mat}`;
                const overridenStatusObj = newPartMap.get(key);
                const overridenStatus = overridenStatusObj ? overridenStatusObj.Status : null;
                const effectiveStatus = overridenStatus || r.StatusX || "";

                if (effectiveStatus === "แจ้งCodeผิด") return false;

                const nawaEmpty = !r["Nawa"] || r["Nawa"] === "-" || r["Nawa"] === "0" || String(r["Nawa"]).trim() === "";
                if (!nawaEmpty) return false;

                if (!mat || !Array.isArray(poData)) return false;

                const poDetails = poData.filter(poRow => {
                    const poMat = normalizeMaterial(poRow["Material"] || "");
                    const qty = parseFloat((poRow["Still to be delivered (qty)"] + "").replace(/,/g, ''));
                    return poMat === mat && !isNaN(qty) && qty > 0;
                });

                const today = new Date();
                today.setHours(0, 0, 0, 0);

                return poDetails.some(poRow => {
                    const dateStr = poRow["Document Date"] || poRow["Date"] || poRow["Delivery Date"] || poRow["Deliv.Date"] || "-";
                    const d = parseDateString(dateStr);
                    if (d && d instanceof Date && !isNaN(d)) {
                        d.setHours(0, 0, 0, 0);
                        return d < today;
                    }
                    return false;
                });
            });

            if (hasExceedLeadTime) {
                statusCall = "เกินLeadtime";
            }
        }

        // Group status fallback to newPartMap is no longer needed as it's handled in statusesToEval

        rows.forEach(r => {
            r.StatusCall = statusCall; // Apply group status

            // INDIVIDUAL ITEM OVERRIDE: Re-evaluate leadtime specifically for THIS material
            if (r.StatusCall === "รอของเข้า" || r.StatusCall === "เกินLeadtime") {
                const nawaVal = r["Nawa"];
                const nawaEmpty = !nawaVal || nawaVal === "-" || nawaVal === "0" || String(nawaVal).trim() === "";

                let itemStatus = "รอของเข้า";
                const op = r["OtherPlant"];
                if (op !== undefined && op !== null && op !== "" && op !== "-" && op !== 0 && op !== "0") {
                    itemStatus = "ดึงจากคลังอื่น";
                }

                if (nawaEmpty) {
                    const mat = normalizeMaterial(r["Material"]);
                    if (mat && Array.isArray(poData)) {
                        const poDetails = poData.filter(poRow => {
                            const poMat = normalizeMaterial(poRow["Material"] || "");
                            const qty = parseFloat((poRow["Still to be delivered (qty)"] + "").replace(/,/g, ''));
                            return poMat === mat && !isNaN(qty) && qty > 0;
                        });

                        if (poDetails.length > 0) {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const isOverdue = poDetails.some(poRow => {
                                const dateStr = poRow["Document Date"] || poRow["Date"] || poRow["Delivery Date"] || poRow["Deliv.Date"] || "-";
                                const d = parseDateString(dateStr);
                                if (d && d instanceof Date && !isNaN(d)) {
                                    d.setHours(0, 0, 0, 0);
                                    return d < today;
                                }
                                return false;
                            });
                            // เกินLeadtime overrrides ดึงจากคลังอื่น
                            if (isOverdue) itemStatus = "เกินLeadtime";
                        }
                    }
                }
                r.StatusX = itemStatus;
            }

            // Override with custom status if it exists for this specific row (Ticket + Material)
            const mat = normalizeMaterial(r["Material"]);
            const compositeKey = `${ticket}_${mat}`;
            if (newPartMap.has(compositeKey)) {
                const customStatus = newPartMap.get(compositeKey).Status;
                // DO NOT override StatusCall here, as it should remain the group-level status
                r.StatusX = customStatus;    // Override StatusX so filtering/sorting works
            }
        });

        // Post-processing group check: If ALL items are "ดึงจากคลังอื่น" (excluding 'แจ้งCodeผิด'), then group StatusCall = "ดึงจากคลังอื่น"
        const evaluableRows = rows.filter(r => {
            const mat = normalizeMaterial(r["Material"]);
            const key = `${ticket}_${mat}`;
            const overridenStatusObj = newPartMap.get(key);
            const overridenStatus = overridenStatusObj ? overridenStatusObj.Status : null;
            const effectiveStatus = overridenStatus || r.StatusX || "";
            return effectiveStatus !== "แจ้งCodeผิด";
        });
        const allItemsAreOtherPlant = evaluableRows.length > 0 && evaluableRows.every(r => r.StatusX === "ดึงจากคลังอื่น");
        if (allItemsAreOtherPlant) {
            rows.forEach(r => r.StatusCall = "ดึงจากคลังอื่น");
        }
    });

    // 4. Group mapping status
    enrichedData.forEach(r => {
        let groupStatus = "รอของเข้า";
        const groupKey = r.StatusCall;

        switch (groupKey) {
            case "เกินLeadtime": groupStatus = "เกินLeadtime"; break;
            case "ขอดึงคลังอื่น":
            case "ดึงจากคลังอื่น": groupStatus = "ดึงจากคลังอื่น"; break;
            case "ระหว่างขนส่ง": groupStatus = "ระหว่างขนส่ง (ส่งสำเร็จ)"; break;
            case "เบิกศูนย์อะไหล่": groupStatus = "เบิกศูนย์อะไหล่"; break;
            case "Project":
            case "รอทดแทน": groupStatus = "Call (Spacial)"; break;
            case "ขอซื้อขอซ่อม": groupStatus = "ขอซื้อขอซ่อม"; break;
            case "แจ้งCodeผิด": groupStatus = "แจ้งCodeผิด"; break;
            case "เปิดรหัสใหม่": groupStatus = "เปิดรหัสใหม่"; break;
            default: groupStatus = "รอของเข้า";
        }
        r.StatusGroup = groupStatus;
    });

    return enrichedData;
}

export function calculateSummary(processedData) {
    const ticketGroups = {};
    processedData.forEach(row => {
        const ticket = row["Ticket Number"];
        if (!ticket) return;
        if (!ticketGroups[ticket]) ticketGroups[ticket] = [];
        ticketGroups[ticket].push(row);
    });

    let stats = {
        total: Object.keys(ticketGroups).length,
        exceedLeadtime: 0,
        pending: 0,
        otherPlant: 0,
        success: 0,
        nawaVipa: 0,
        project: 0,
        request: 0,
        newPart: 0,
        over7: 0,
        waitingResponse: 0,
        maxPendingUnit: "-",
        maxPendingCount: 0
    };

    const pendingUnitTicketCounts = {};

    Object.keys(ticketGroups).forEach(ticket => {
        const rows = ticketGroups[ticket];
        const groupStatus = rows[0].StatusGroup || "รอของเข้า";

        if (groupStatus === 'เกินLeadtime') stats.exceedLeadtime++;
        if (groupStatus === 'รอของเข้า') stats.pending++;
        if (groupStatus === 'ดึงจากคลังอื่น') stats.otherPlant++;
        if (groupStatus === 'ระหว่างขนส่ง (ส่งสำเร็จ)') stats.success++;
        if (groupStatus === 'เบิกศูนย์อะไหล่') stats.nawaVipa++;
        if (groupStatus === 'Call (Spacial)') stats.project++;
        if (groupStatus === 'ขอซื้อขอซ่อม') stats.request++;
        if (groupStatus === 'เปิดรหัสใหม่') stats.newPart++;

        if (rows.some(r => r['คลังตอบ'] === 'รอตรวจสอบ')) {
            stats.waitingResponse++;
        }

        if (rows.some(r => (parseFloat(r['DayRepair']) || 0) > 7)) {
            stats.over7++;
        }

        // Aggregate ALL tickets for each unit to find the top unit
        rows.forEach(r => {
            const pendingUnit = r["ค้างหน่วยงาน"] || "ไม่ระบุ";
            // Ignore "ไม่ระบุ" unless you specifically want to count it (the original code ignored it implicitly if not tracking it, wait it explicitly says !== 'ไม่ระบุ')
            if (pendingUnit !== "ไม่ระบุ") {
                if (!pendingUnitTicketCounts[pendingUnit]) pendingUnitTicketCounts[pendingUnit] = new Set();
                pendingUnitTicketCounts[pendingUnit].add(ticket);
            }
        });
    });

    const pendingUnitCounts = {};
    for (const [unit, set] of Object.entries(pendingUnitTicketCounts)) {
        pendingUnitCounts[unit] = set.size;
    }

    let maxCount = 0;
    let maxUnit = "-";
    for (const [unit, count] of Object.entries(pendingUnitCounts)) {
        if (count > maxCount) {
            maxCount = count;
            maxUnit = unit;
        }
    }
    stats.maxPendingUnit = maxUnit;
    stats.maxPendingCount = maxCount;

    const calcPercent = (val) => stats.total > 0 ? Math.round((val / stats.total) * 100) + '%' : '0%';

    stats.exceedLeadtimePercent = calcPercent(stats.exceedLeadtime);
    stats.pendingPercent = calcPercent(stats.pending);
    stats.otherPlantPercent = calcPercent(stats.otherPlant);
    stats.successPercent = calcPercent(stats.success);
    stats.nawaVipaPercent = calcPercent(stats.nawaVipa);
    stats.projectPercent = calcPercent(stats.project);
    stats.requestPercent = calcPercent(stats.request);
    stats.newPartPercent = calcPercent(stats.newPart);
    stats.over7Percent = calcPercent(stats.over7);
    stats.waitingResponsePercent = calcPercent(stats.waitingResponse);

    return stats;
}

export function extractFilters(data) {
    const filters = {
        teamPlant: {},
        pendingUnit: {},
        stockAnswer: {},
        statusCall: {}
    };

    data.forEach(row => {
        const tp = row['TeamPlant'] || 'ไม่ระบุ';
        const pu = row['ค้างหน่วยงาน'] || 'ไม่ระบุ';
        const sa = row['คลังตอบ'] || 'ไม่ระบุ';
        const sc = row['StatusCall'] || 'ไม่ระบุ';

        filters.teamPlant[tp] = (filters.teamPlant[tp] || 0) + 1;
        filters.pendingUnit[pu] = (filters.pendingUnit[pu] || 0) + 1;
        filters.stockAnswer[sa] = (filters.stockAnswer[sa] || 0) + 1;
        filters.statusCall[sc] = (filters.statusCall[sc] || 0) + 1;
    });

    return filters;
}

export function getCleanTeamPlant(tp) {
    return (tp || "").replace(/Stock\s*/gi, '').trim();
}

export function getDesc(row) {
    return row["Description"] || row["Discription"] || row["Desc"] || "";
}


