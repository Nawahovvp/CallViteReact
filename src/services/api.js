// Data Source URLs
const sheetID = '1dzE4Xjc7H0OtNUmne62u0jFQT-CiGsG2eBo-1v6mrZk';
const sheetName = 'Coll_Stock';
export const mainDataUrl = `https://opensheet.elk.sh/${sheetID}/${sheetName}`;

const employeeSheetID = '1eqVoLsZxGguEbRCC5rdI4iMVtQ7CK4T3uXRdx8zE3uw';
const employeeSheetName = 'EmployeeWeb';
export const employeeUrl = `https://opensheet.elk.sh/${employeeSheetID}/${employeeSheetName}`;

const requestSheetID = '1xyy70cq2vAxGv4gPIGiL_xA5czDXqS2i6YYqW4yEVbE';
const requestSheetName = 'Request';
export const requestUrl = `https://opensheet.elk.sh/${requestSheetID}/${encodeURIComponent(requestSheetName)}`;

const poSheetID = '1SPPy8uru1aCZZ-t8fLPYPx_Up-CamdaIoAbRN7fYD_o';
const poSheetName = 'Po';
export const poUrl = `https://opensheet.elk.sh/${poSheetID}/${encodeURIComponent(poSheetName)}`;

const prSheetID = '1SPPy8uru1aCZZ-t8fLPYPx_Up-CamdaIoAbRN7fYD_o';
const prSheetName = 'PR';
export const prUrl = `https://opensheet.elk.sh/${prSheetID}/${encodeURIComponent(prSheetName)}`;

const mainSapSheetID = '1CkfOIe2nDYBLs5aPGkPyZhOeqJkyS7UQ6tuMzxy-mfk';
const mainSapSheetName = 'mainsap';
export const mainSapUrl = `https://opensheet.elk.sh/${mainSapSheetID}/${mainSapSheetName}`;

const vipaSheetID = '1gtZLR5Tm574o5xRbdrRm9yFzRukGx_UAzUnoah36cxQ';
const vipaSheetName = 'Sheet1';
export const vipaUrl = `https://opensheet.elk.sh/${vipaSheetID}/${vipaSheetName}`;

const nawaSheetID = '1x-B1xekpMm4p7fkKucvLjaewtp66uGIp8ZIxJJZAxMk';
const nawaSheetName = 'Sheet1';
export const nawaUrl = `https://opensheet.elk.sh/${nawaSheetID}/${nawaSheetName}`;

const plantStockSheetID = '1OtcgbmQdrI3gKJCGiDge6xuOsrT0GPxdKeFPjpvK3Rg';
const plantStockSheetName = 'Sheet1';
export const plantStockUrl = `https://opensheet.elk.sh/${plantStockSheetID}/${plantStockSheetName}`;

const updateSheetName = 'Update';
export const updateUrl = `https://opensheet.elk.sh/${sheetID}/${updateSheetName}`;

export const newPartLoadUrl = "https://opensheet.elk.sh/1R8X9yVZBzOc1eDPJU0stKLjVSygMusJihtprdOtb6sE/NewPart";
export const projectLogLoadUrl = "https://opensheet.elk.sh/1R8X9yVZBzOc1eDPJU0stKLjVSygMusJihtprdOtb6sE/ProjectLog";
export const newPartSaveUrl = "https://script.google.com/macros/s/AKfycbwRKCZxTrzSiY1CSE54q-GMJYiCiXdrfj_CBXM2yLerGsExJUsH0UrPgiQcSP-btN45/exec";
export const teamPlantUrl = `https://opensheet.elk.sh/1eqVoLsZxGguEbRCC5rdI4iMVtQ7CK4T3uXRdx8zE3uw/TeamPlant`;

// Plant-specific Eng data sources (Technician stock)
export const engUrls = {
    "0326": "https://opensheet.elk.sh/1CdtlV4F_zTs5YTRX4fwtpinVuyRin_vI_d12wF1icmI/0326Eng",
    "0330": "https://opensheet.elk.sh/1Eir-zDojK6nLIlVbW7OgJvuhbuzfaJ-X4ALN9J4aGNU/0330Eng",
    "0304": "https://opensheet.elk.sh/1uCnhxCUH5ZPer7lYkPC95YMhlQ6a345S51w_S7TR2qM/0304Eng",
    "0313": "https://opensheet.elk.sh/1o2_TfNW1sd-Nm3QcF77OrcLlf40DqKdn7MNieIE7P-Y/0313Eng",
    "0307": "https://opensheet.elk.sh/1tPh9p8GWXaH8k5YMpIhBlSf3bKNKcNMjKSwiQFjaCbs/0307Eng",
    "0309": "https://opensheet.elk.sh/169L7d8lqctYIFrqGji-0880n0bwBBXKZTaygDXFaVug/0309Eng",
    "0312": "https://opensheet.elk.sh/1X2kPue19_af8xVp7ItATl5Ht5qfpADwqt7ENJzPypIY/0312Eng",
    "0305": "https://opensheet.elk.sh/1ITMIVaEk63f1kEb0n3dDYGQzQNUGHbXneF4rR3EVv3s/0305Eng",
    "0319": "https://opensheet.elk.sh/1CZthsi5JcGDhgVmGVBc8bTEPLkcqwvMJbJpST4wyICg/0319Eng",
    "0320": "https://opensheet.elk.sh/1huVSCyMgrbd_ULaALZO-ggcdEFZ3J_papPSTU5HJZRo/0320Eng",
    "0366": "https://opensheet.elk.sh/1aNRbELLDDWaL8PdNT1UJkc_5Ihpj9YCHL8xCydH4Rys/0366Eng",
    "0311": "https://opensheet.elk.sh/1oU3X9p67a_u7j1IiHgPrpwwgTgDjZu8r78hafE38l9M/0311Eng",
    "0369": "https://opensheet.elk.sh/12Bc9irmSK-45w-9hsrMKz6_zGxsVyiflEGvbk2fKdA0/0369Eng"
};

// Fetch utils
export async function fetchWithTimeout(resource, options = {}) {
    const { timeout = 30000 } = options;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(resource, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        if (error.name === 'AbortError') {
            throw new Error(`Request timed out after ${timeout}ms`);
        }
        throw error;
    }
}

export async function safeJson(response, timeout = 20000) {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const jsonPromise = response.json();
    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('JSON processing timeout')), timeout)
    );
    return Promise.race([jsonPromise, timeoutPromise]);
}

// Login
export async function loginUser(username, password) {
    if (!username || username.length !== 7 || !username.startsWith('7')) {
        throw new Error('รหัสพนักงานต้องเป็น 7 หลักและเริ่มต้นด้วย 7');
    }
    if (!password || password.length !== 4) {
        throw new Error('รหัสผ่านต้องเป็น 4 หลัก');
    }
    const derivedPassword = username.slice(-4);
    if (password !== derivedPassword) {
        throw new Error('รหัสผ่านไม่ถูกต้อง (ใช้ 4 หลักสุดท้ายของรหัสพนักงาน)');
    }

    const response = await fetchWithTimeout(employeeUrl, { cache: 'no-store' });
    const employees = await safeJson(response);

    // Cache for future
    localStorage.setItem('app_cached_employees', JSON.stringify(employees));

    const user = employees.find(emp => emp.IDRec === username);
    if (!user || !user.Name) {
        throw new Error('ไม่พบข้อมูลพนักงานนี้');
    }

    // --- Log successful login to GAS ---
    try {
        fetch(newPartSaveUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                action: 'login',
                userId: user.IDRec,
                userName: user.Name,
                userPlant: user.Plant || localStorage.getItem('userPlant') || '-',
                status: 'SUCCESS'
            })
        });
    } catch (e) {
        console.error("Login logging failed:", e);
    }
    // ------------------------------------

    return user;
}

// Fetch All Parallel
export async function fetchAllData() {
    // 10 concurrent requests
    const fetchTasks = [
        () => fetchWithTimeout(mainDataUrl, { cache: 'no-store' }).then(safeJson),
        () => fetchWithTimeout(requestUrl, { cache: 'no-store' }).then(safeJson),
        () => fetchWithTimeout(poUrl, { cache: 'no-store' }).then(safeJson),
        () => fetchWithTimeout(prUrl, { cache: 'no-store' }).then(safeJson),
        () => fetchWithTimeout(mainSapUrl, { cache: 'no-store' }).then(safeJson),
        () => fetchWithTimeout(vipaUrl, { cache: 'no-store' }).then(safeJson),
        () => fetchWithTimeout(nawaUrl, { cache: 'no-store' }).then(safeJson),
        () => fetchWithTimeout(plantStockUrl, { cache: 'no-store' }).then(safeJson),
        () => fetchWithTimeout(newPartLoadUrl, { cache: 'no-store' }).then(safeJson),
        () => fetchWithTimeout(projectLogLoadUrl, { cache: 'no-store' }).then(safeJson),
        () => fetchWithTimeout(updateUrl, { cache: 'no-store' }).then(safeJson),
        () => fetchWithTimeout(teamPlantUrl, { cache: 'no-store' }).then(safeJson),
        // All Eng spreadsheets
        ...Object.entries(engUrls).map(([plant, url]) => 
            () => fetchWithTimeout(url, { cache: 'no-store' }).then(safeJson).then(data => ({ plant, data }))
        )
    ];

    // Batch to not starve connections
    async function runInBatches(tasks, batchSize) {
        const results = [];
        for (let i = 0; i < tasks.length; i += batchSize) {
            const batch = tasks.slice(i, i + batchSize).map(task => task());
            const batchResults = await Promise.allSettled(batch);
            results.push(...batchResults);
            if (i + batchSize < tasks.length) await new Promise(r => setTimeout(r, 200)); // Shorter delay
        }
        return results;
    }

    const results = await runInBatches(fetchTasks, 4); // Increased batch size slightly

    const safeResult = (idx, name) => {
        if (results[idx] && results[idx].status === 'fulfilled') {
            return results[idx].value || [];
        } else {
            console.error(`Fetch failed for ${name}:`, results[idx]?.reason);
            return [];
        }
    };

    const engDataResults = results.slice(12).map((res, i) => {
        if (res.status === 'fulfilled') return res.value;
        return { plant: Object.keys(engUrls)[i], data: [] };
    });

    return {
        mainData: safeResult(0, 'mainData'),
        requestData: safeResult(1, 'requestData'),
        poData: safeResult(2, 'poData'),
        prData: safeResult(3, 'prData'),
        mainSapData: safeResult(4, 'mainSapData'),
        vipaData: safeResult(5, 'vipaData'),
        nawaData: safeResult(6, 'nawaData'),
        plantStockData: safeResult(7, 'plantStockData'),
        newPartData: safeResult(8, 'newPartData'),
        projectData: safeResult(9, 'projectData'),
        updateData: safeResult(10, 'updateData'),
        teamPlantData: safeResult(11, 'teamPlantData'),
        engData: engDataResults
    };
}

// Save status edit or project update to Google Sheet
export async function saveToGoogleSheet(payload) {
    const response = await fetch(newPartSaveUrl, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
    });
    return response;
}
