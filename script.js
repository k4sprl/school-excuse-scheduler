// --- 1. Regional Data (OpenHolidays API mapping) ---
const regions = {
    'DE': [
        {id: 'DE-BW', n: 'Baden-Württemberg'}, {id: 'DE-BY', n: 'Bayern'}, {id: 'DE-BE', n: 'Berlin'}, {id: 'DE-BB', n: 'Brandenburg'},
        {id: 'DE-HB', n: 'Bremen'}, {id: 'DE-HH', n: 'Hamburg'}, {id: 'DE-HE', n: 'Hessen'}, {id: 'DE-MV', n: 'Mecklenburg-Vorpommern'},
        {id: 'DE-NI', n: 'Niedersachsen'}, {id: 'DE-NW', n: 'Nordrhein-Westfalen'}, {id: 'DE-RP', n: 'Rheinland-Pfalz'},
        {id: 'DE-SL', n: 'Saarland'}, {id: 'DE-SN', n: 'Sachsen'}, {id: 'DE-ST', n: 'Sachsen-Anhalt'}, {id: 'DE-SH', n: 'Schleswig-Holstein'}, {id: 'DE-TH', n: 'Thüringen'}
    ],
    'CH': [
        {id: 'CH-AG', n: 'Aargau'}, {id: 'CH-AI', n: 'Appenzell I.Rh.'}, {id: 'CH-AR', n: 'Appenzell A.Rh.'}, {id: 'CH-BE', n: 'Bern'},
        {id: 'CH-BL', n: 'Basel-Landschaft'}, {id: 'CH-BS', n: 'Basel-Stadt'}, {id: 'CH-FR', n: 'Fribourg'}, {id: 'CH-GE', n: 'Genève'},
        {id: 'CH-GL', n: 'Glarus'}, {id: 'CH-GR', n: 'Graubünden'}, {id: 'CH-JU', n: 'Jura'}, {id: 'CH-LU', n: 'Luzern'},
        {id: 'CH-NE', n: 'Neuchâtel'}, {id: 'CH-NW', n: 'Nidwalden'}, {id: 'CH-OW', n: 'Obwalden'}, {id: 'CH-SG', n: 'St. Gallen'},
        {id: 'CH-SH', n: 'Schaffhausen'}, {id: 'CH-SO', n: 'Solothurn'}, {id: 'CH-SZ', n: 'Schwyz'}, {id: 'CH-TG', n: 'Thurgau'},
        {id: 'CH-TI', n: 'Ticino'}, {id: 'CH-UR', n: 'Uri'}, {id: 'CH-VD', n: 'Vaud'}, {id: 'CH-VS', n: 'Valais'}, {id: 'CH-ZG', n: 'Zug'}, {id: 'CH-ZH', n: 'Zürich'}
    ],
    'AT': [
        {id: 'AT-1', n: 'Burgenland'}, {id: 'AT-2', n: 'Kärnten'}, {id: 'AT-3', n: 'Niederösterreich'}, {id: 'AT-4', n: 'Oberösterreich'},
        {id: 'AT-5', n: 'Salzburg'}, {id: 'AT-6', n: 'Steiermark'}, {id: 'AT-7', n: 'Tirol'}, {id: 'AT-8', n: 'Vorarlberg'}, {id: 'AT-9', n: 'Wien'}
    ]
};

// --- 2. Global State & Excuse Data ---
const state = {
    blocks: [], // Generated excuses
    apiHolidays: [], // Set of strings YYYY-MM-DD
    customDates: [], // User defined blackout dates
    chartInstance: null
};

const excusePool = {
    general: [
        { id: 'fever', label: 'Fever and chills', active: true },
        { id: 'stomach', label: 'Stomach bug', active: true },
        { id: 'family', label: 'Family emergency', active: true },
        { id: 'migraine', label: 'Migraine', active: true },
        { id: 'food', label: 'Food poisoning', active: true },
        { id: 'cold', label: 'Severe cold / Flu', active: true },
        { id: 'transport', label: 'Transport failure', active: true },
        { id: 'dental', label: 'Dental procedure', active: true }
    ],
    female: [
        "Severe menstrual cramps", "Gynecologist appointment", "Health exemption day"
    ],
    modifiers: [
        " (Excused by Parent)", " (Doctor's Note Provided)", " (Called in sick)", ""
    ]
};

// Helper Date Functions
const sDate = (dStr) => new Date(dStr);
const fDate = (d) => {
    const offset = d.getTimezoneOffset();
    return new Date(d.getTime() - (offset*60*1000)).toISOString().split('T')[0];
};
const addDays = (date, days) => { let r = new Date(date); r.setDate(r.getDate() + days); return r; };
const isWeekend = (dateStr) => { const d = sDate(dateStr).getDay(); return d === 0 || d === 6; };
const dateRange = (start, end) => {
    let arr = [], dt = sDate(start), endDt = sDate(end);
    while(dt <= endDt) { arr.push(fDate(dt)); dt.setDate(dt.getDate() + 1); }
    return arr;
};

// --- 3. Flawless Toast Manager ---
class ToastManager {
    constructor() { this.container = document.getElementById('toast-container'); }
    show(message, type = 'info-alert', duration = 15000) {
        const toast = document.createElement('div'); toast.className = `toast ${type}`;
        toast.innerHTML = `<div style="font-size: 0.95rem; line-height: 1.4;">${message}</div><button class="toast-close">&times;</button><div class="toast-progress"></div>`;
        this.container.appendChild(toast);
        const pb = toast.querySelector('.toast-progress'); const cb = toast.querySelector('.toast-close');
        let tId;
        const startProgress = (ms) => {
            pb.style.transition = 'none'; pb.style.width = '100%'; void pb.offsetWidth;
            pb.style.transition = `width ${ms}ms linear`; pb.style.width = '0%';
            tId = setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => { if (toast.parentElement) toast.remove(); }, 300); }, ms);
        };
        startProgress(duration);
        cb.addEventListener('click', () => { clearTimeout(tId); toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); });
        toast.addEventListener('mouseenter', () => { clearTimeout(tId); const w = window.getComputedStyle(pb).width; pb.style.transition = 'none'; pb.style.width = w; });
        toast.addEventListener('mouseleave', () => startProgress(20000));
    }
}
const toaster = new ToastManager();

// --- 4. Initialization & Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    // Privacy Gate
    if (!localStorage.getItem('privacyAccepted') && !sessionStorage.getItem('privacyDismissed')) {
        document.getElementById('startupModal').classList.add('active');
    } else {
        initializeAPIHolidays();
    }
    
    document.getElementById('acceptPrivacy').addEventListener('click', () => {
        if (document.getElementById('dontShowAgain').checked) localStorage.setItem('privacyAccepted', 'true');
        else sessionStorage.setItem('privacyDismissed', 'true');
        document.getElementById('startupModal').classList.remove('active');
        if (typeof confetti === 'function') confetti({ particleCount: 150, spread: 180, origin: { y: 0.3 } });
        initializeAPIHolidays();
    });

    // UI Updates
    document.getElementById('sel-country').addEventListener('change', (e) => {
        updateStateDropdown(e.target.value);
        fetchHolidays(); // re-fetch when country changes
    });
    document.getElementById('sel-state').addEventListener('change', fetchHolidays);

    // Sidebar / Tabs
    const resizer = document.getElementById('resizer'); const sidebar = document.getElementById('sidebar');
    let isResizing = false;
    resizer.addEventListener('mousedown', () => { isResizing = true; document.body.style.cursor = 'ew-resize'; });
    document.addEventListener('mousemove', (e) => { if (!isResizing) return; let w = e.clientX; if (w >= 280 && w <= 600) sidebar.style.width = `${w}px`; });
    document.addEventListener('mouseup', () => { isResizing = false; document.body.style.cursor = 'default'; });
    
    document.getElementById('mobile-menu-btn').addEventListener('click', () => sidebar.classList.toggle('open'));
    document.addEventListener('click', (e) => { if (window.innerWidth <= 768 && !sidebar.contains(e.target) && e.target.id !== 'mobile-menu-btn') sidebar.classList.remove('open'); });

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active'); document.getElementById(btn.dataset.target).classList.add('active');
            if (btn.dataset.target === 'calendar-tab' && window.calendarInstance) window.calendarInstance.render();
        });
    });

    // Gender toggles
    const mBtn = document.getElementById('btn-male'); const fBtn = document.getElementById('btn-female');
    const fFeat = document.getElementById('female-features');
    mBtn.addEventListener('click', () => { mBtn.classList.add('active-male'); fBtn.classList.remove('active-female'); fFeat.style.display = 'none'; toaster.show('Female-specific tracking removed.', 'male-alert', 5000); });
    fBtn.addEventListener('click', () => { fBtn.classList.add('active-female'); mBtn.classList.remove('active-male'); fFeat.style.display = 'block'; toaster.show('Added custom cycle tracking.', 'female-alert', 5000); });

    // Modals Setup
    setupModals();
    
    // Generator Trigger
    document.getElementById('btn-generate').addEventListener('click', runGeneratorEngine);
    
    // Data IO
    document.getElementById('exportIcsBtn').addEventListener('click', exportICS);
    document.getElementById('exportTxtBtn').addEventListener('click', generateTextReport);
    document.getElementById('exportJsonBtn').addEventListener('click', exportJSONState);
    document.getElementById('importJsonBtn').addEventListener('click', () => document.getElementById('fileInput').click());
    document.getElementById('fileInput').addEventListener('change', importJSONState);

    initCalendar();
    updateDashboard();
    renderCustomDatesList();
});

// --- Helpers ---
window.updateSliders = function() {
    let min = parseInt(document.getElementById('rng-minlen').value);
    let max = parseInt(document.getElementById('rng-maxlen').value);
    if(min > max) { document.getElementById('rng-maxlen').value = min; max = min; }
    document.getElementById('val-minlen').innerText = min + 'd';
    document.getElementById('val-maxlen').innerText = max + 'd';
};

window.updateRiskText = function(val) {
    document.getElementById('val-risk').innerText = parseInt(val) === 1 ? 'Low' : (parseInt(val) === 2 ? 'Medium' : 'High');
};

function updateStateDropdown(countryCode) {
    const sg = document.getElementById('state-group');
    const sel = document.getElementById('sel-state');
    sel.innerHTML = '';
    if(regions[countryCode]) {
        sg.style.display = 'block';
        regions[countryCode].forEach(r => {
            let opt = document.createElement('option');
            opt.value = r.id; opt.innerText = r.n; sel.appendChild(opt);
        });
    } else {
        sg.style.display = 'none';
    }
}

// --- 5. Modals (Illnesses & Custom Dates) ---
function setupModals() {
    // QR Code
    const qrModal = document.getElementById('qrModal');
    document.getElementById('shareBtn').addEventListener('click', () => {
        qrModal.classList.add('active'); document.getElementById('qrcode').innerHTML = '';
        new QRCode(document.getElementById("qrcode"), { text: window.location.href, width: 160, height: 160, colorDark: "#000", colorLight: "#fff" });
    });
    document.getElementById('closeQr').addEventListener('click', () => qrModal.classList.remove('active'));

    // Excuses Customization
    const exModal = document.getElementById('excusesModal');
    const exList = document.getElementById('illness-list-container');
    document.getElementById('openExcusesBtn').addEventListener('click', () => {
        exList.innerHTML = '';
        excusePool.general.forEach(ill => {
            let lbl = document.createElement('label'); lbl.className = 'checkbox-label';
            lbl.innerHTML = `<input type="checkbox" data-id="${ill.id}" ${ill.active ? 'checked' : ''}> ${ill.label}`;
            exList.appendChild(lbl);
        });
        exModal.classList.add('active');
    });
    document.getElementById('saveExcusesBtn').addEventListener('click', () => {
        document.querySelectorAll('#illness-list-container input').forEach(inp => {
            let target = excusePool.general.find(i => i.id === inp.dataset.id);
            if(target) target.active = inp.checked;
        });
        exModal.classList.remove('active');
        toaster.show("Excuses preferences updated.", "info-alert", 3000);
    });

    // Custom Dates
    const dateModal = document.getElementById('manualHolidaysModal');
    document.getElementById('openCustomDatesBtn').addEventListener('click', () => dateModal.classList.add('active'));
    document.getElementById('closeCustomDatesBtn').addEventListener('click', () => dateModal.classList.remove('active'));
    
    document.getElementById('addCustomDateBtn').addEventListener('click', () => {
        let val = document.getElementById('customDateInput').value;
        if(!val) return;
        if(!state.customDates.includes(val)) {
            state.customDates.push(val);
            state.customDates.sort();
            renderCustomDatesList();
            toaster.show(`Added blackout date: ${val}`, 'info-alert', 3000);
        }
        document.getElementById('customDateInput').value = '';
    });
}

window.removeCustomDate = function(dateStr) {
    state.customDates = state.customDates.filter(d => d !== dateStr);
    renderCustomDatesList();
};

function renderCustomDatesList() {
    const ctn = document.getElementById('custom-dates-list');
    ctn.innerHTML = '';
    state.customDates.forEach(d => {
        ctn.innerHTML += `<div class="tag">${d} <span onclick="removeCustomDate('${d}')">&times;</span></div>`;
    });
}

// --- 6. API Integrations (OpenHolidays & Nager) ---
async function initializeAPIHolidays() {
    try {
        const ipRes = await fetch('https://ipapi.co/json/');
        const ipData = await ipRes.json();
        if (ipData.country_code) {
            const sel = document.getElementById('sel-country');
            let found = Array.from(sel.options).some((opt, i) => {
                if(opt.value === ipData.country_code) { sel.selectedIndex = i; return true; }
            });
            if(found) {
                updateStateDropdown(ipData.country_code);
                toaster.show(`Location detected as ${ipData.country_name}. Fetching localized holidays...`, 'info-alert', 5000);
            }
        }
    } catch (e) { console.warn('Geolocation failed'); }
    fetchHolidays();
}

async function fetchHolidays() {
    const country = document.getElementById('sel-country').value;
    const subDiv = document.getElementById('sel-state').value;
    const year = new Date().getFullYear();
    
    state.apiHolidays = []; // Reset
    let displayEvents = [];

    try {
        // OpenHolidays API for DE, CH, AT (Supports School Holidays)
        if (['DE', 'CH', 'AT'].includes(country)) {
            const urlBase = `https://openholidaysapi.org`;
            let query = `?countryIsoCode=${country}&validFrom=${year}-01-01&validTo=${year}-12-31`;
            if (subDiv) query += `&subdivisionCode=${subDiv}`;

            const [pubRes, schRes] = await Promise.all([
                fetch(`${urlBase}/PublicHolidays${query}`),
                fetch(`${urlBase}/SchoolHolidays${query}`)
            ]);
            
            if (pubRes.ok) {
                const pubData = await pubRes.json();
                pubData.forEach(h => {
                    let ds = dateRange(h.startDate, h.endDate);
                    state.apiHolidays.push(...ds);
                    displayEvents.push({ title: h.name[0].text, start: h.startDate, end: fDate(addDays(h.endDate,1)), display: 'background', color: 'rgba(255, 255, 255, 0.15)' });
                });
            }
            
            if (schRes.ok) {
                const schData = await schRes.json();
                schData.forEach(h => {
                    let ds = dateRange(h.startDate, h.endDate);
                    state.apiHolidays.push(...ds);
                    displayEvents.push({ title: h.name[0].text, start: h.startDate, end: fDate(addDays(h.endDate,1)), display: 'background', color: 'rgba(255, 165, 0, 0.15)' }); // Orange tint for school holidays
                });
            }
        } else {
            // Fallback to Nager.Date for US, UK, CA, AU, SE (Public only)
            const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${country}`);
            if (res.ok) {
                const data = await res.json();
                data.forEach(h => {
                    state.apiHolidays.push(h.date);
                    displayEvents.push({ title: h.localName, start: h.date, display: 'background', color: 'rgba(255, 255, 255, 0.15)' });
                });
            }
        }

        // Deduplicate API dates
        state.apiHolidays = [...new Set(state.apiHolidays)];
        document.getElementById('holiday-count').innerText = state.apiHolidays.length;

        if (window.calendarInstance) {
            // Remove old backgrounds
            window.calendarInstance.getEvents().forEach(e => { if(!e.extendedProps.customType) e.remove(); });
            window.calendarInstance.addEventSource(displayEvents);
        }
        
    } catch (e) {
        console.error('Holiday fetch failed:', e);
        toaster.show('Failed to fetch holidays for selected region.', 'error-alert', 4000);
    }
}

// --- 7. The Core Generator Engine ---
function runGeneratorEngine() {
    const isFemale = document.getElementById('btn-female').classList.contains('active-female');
    const useCycle = document.getElementById('chk-cycle').checked;
    const maxDaysPerMonth = parseInt(document.getElementById('rng-days').value);
    const minLen = parseInt(document.getElementById('rng-minlen').value);
    const maxLen = parseInt(document.getElementById('rng-maxlen').value);
    const riskTolerance = parseInt(document.getElementById('rng-risk').value); // 1, 2, 3
    const allowHalfDays = document.getElementById('chk-halfdays').checked;
    const noConsecutive = document.getElementById('chk-consecutive').checked;
    
    // Filter allowed general excuses
    const allowedGeneral = excusePool.general.filter(e => e.active).map(e => e.label);
    if(allowedGeneral.length === 0) return toaster.show("You must enable at least one general excuse in 'Customize Excuses'.", "error-alert");

    state.blocks = []; 
    let currentAbsences = 0;
    
    let startDate = new Date();
    let endDate = addDays(new Date(), 180); // 6 months

    const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
    
    let currentMonth = startDate.getMonth();
    let daysUsedThisMonth = 0;
    let lastAbsenceEnd = null;
    
    let nextCycleDate = (isFemale && useCycle) ? addDays(startDate, Math.floor(Math.random() * 28)) : null;
    
    // Build absolute blackout list
    const blackoutDates = new Set([...state.apiHolidays, ...state.customDates]);

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = fDate(d);
        
        if (d.getMonth() !== currentMonth) { currentMonth = d.getMonth(); daysUsedThisMonth = 0; }
        if (isWeekend(dateStr) || blackoutDates.has(dateStr)) continue;

        // --- Female Cycle Exemption ---
        if (isFemale && useCycle && nextCycleDate && dateStr === fDate(nextCycleDate)) {
            let durationDays = Math.random() > 0.5 ? 2 : 1;
            let endDt = addDays(d, durationDays - 1);
            
            state.blocks.push({
                start: dateStr, end: fDate(endDt),
                reason: pickRandom(excusePool.female),
                missed: durationDays, type: 'female'
            });
            
            daysUsedThisMonth += durationDays; currentAbsences += durationDays;
            lastAbsenceEnd = new Date(endDt);
            nextCycleDate = addDays(nextCycleDate, 28 + (Math.floor(Math.random() * 5) - 2));
            
            d.setDate(d.getDate() + (durationDays - 1));
            continue;
        }

        // --- Standard Excuses ---
        if (daysUsedThisMonth < maxDaysPerMonth) {
            
            // Prevent consecutive weeks logic (ensure at least 7 days between absences)
            if (noConsecutive && lastAbsenceEnd && (d - lastAbsenceEnd) / (1000 * 60 * 60 * 24) < 7) {
                continue; 
            }

            let probability = 0.05 * riskTolerance; // 5%, 10%, 15% chance per day
            
            if (Math.random() < probability) {
                // Determine Length
                let rawLen = Math.floor(Math.random() * (maxLen - minLen + 1)) + minLen;
                let actualLen = 0;
                let endDt = new Date(d);
                
                // Step forward verifying no weekends or blackouts in block
                for(let i=0; i<rawLen; i++){
                    let checkStr = fDate(endDt);
                    if(isWeekend(checkStr) || blackoutDates.has(checkStr)) break; // stop block early
                    actualLen++;
                    if(i < rawLen-1) endDt.setDate(endDt.getDate() + 1);
                }

                if(actualLen > 0) {
                    let isHalfDay = allowHalfDays && actualLen === 1 && Math.random() < 0.3;
                    let val = isHalfDay ? 0.5 : actualLen;
                    
                    // Check if block exceeds monthly max
                    if(daysUsedThisMonth + val > maxDaysPerMonth && daysUsedThisMonth > 0) continue;

                    let modifier = pickRandom(excusePool.modifiers);
                    let reason = pickRandom(allowedGeneral) + (isHalfDay ? " (Half Day)" : modifier);
                    
                    state.blocks.push({
                        start: dateStr, end: fDate(endDt),
                        reason: reason, missed: val, type: 'general'
                    });
                    
                    daysUsedThisMonth += val; currentAbsences += val;
                    lastAbsenceEnd = new Date(endDt);
                    
                    // Skip loop forward
                    d.setDate(d.getDate() + (actualLen - 1));
                }
            }
        }
    }

    updateCalendarEvents();
    updateDashboard();
    
    if (typeof confetti === 'function') confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 } });
    toaster.show(`Generated schedule with ${currentAbsences} absence days.`, 'info-alert');
    if (window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('open');
}

// --- 8. Calendar & Dashboard ---
function initCalendar() {
    const calEl = document.getElementById('calendar');
    window.calendarInstance = new FullCalendar.Calendar(calEl, {
        initialView: window.innerWidth < 768 ? 'listMonth' : 'dayGridMonth',
        headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,listMonth' },
        height: '100%', themeSystem: 'standard',
        windowResize: function() { window.calendarInstance.changeView(window.innerWidth < 768 ? 'listMonth' : 'dayGridMonth'); }
    });
    window.calendarInstance.render();
}

function updateCalendarEvents() {
    if (!window.calendarInstance) return;
    const events = window.calendarInstance.getEvents();
    events.forEach(e => { if (e.extendedProps.customType) e.remove(); }); // Clear only generated, keep backgrounds

    const mapped = state.blocks.map(b => ({
        title: b.reason, start: b.start, end: fDate(addDays(b.end, 1)), // FC exclusive end date
        allDay: true,
        backgroundColor: b.type === 'female' ? 'var(--anim-female)' : 'var(--theme-color)',
        borderColor: b.type === 'female' ? 'var(--anim-female)' : 'var(--theme-color)',
        extendedProps: { customType: true }
    }));
    window.calendarInstance.addEventSource(mapped);
}

function updateDashboard() {
    let total = 0; let monthlyData = {};
    state.blocks.forEach(b => {
        total += b.missed;
        let month = sDate(b.start).toLocaleString('default', { month: 'short' });
        monthlyData[month] = (monthlyData[month] || 0) + b.missed;
    });

    document.getElementById('stat-total').innerText = total;
    document.getElementById('stat-blocks').innerText = state.blocks.length;

    const ctx = document.getElementById('myChart').getContext('2d');
    if (state.chartInstance) state.chartInstance.destroy();
    
    state.chartInstance = new Chart(ctx, {
        type: 'line', // Switched to line for better look
        data: {
            labels: Object.keys(monthlyData).length ? Object.keys(monthlyData) : ['None'],
            datasets: [{
                label: 'Absence Days',
                data: Object.keys(monthlyData).length ? Object.values(monthlyData) : [0],
                borderColor: '#ff4b4b', backgroundColor: 'rgba(255, 75, 75, 0.1)',
                fill: true, tension: 0.3, pointBackgroundColor: '#fff'
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: '#333' } }, y: { beginAtZero: true, grid: { color: '#333' } } } }
    });
}

// --- 9. Data Import / Export ---
function exportICS() {
    if(!state.blocks.length) return toaster.show("Generate a schedule first.", "error-alert");
    let ics = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//SchoolExcuseScheduler//EN\n";
    state.blocks.forEach(b => {
        let s = b.start.replace(/-/g,''); let eDt = sDate(b.end); eDt.setDate(eDt.getDate()+1); let e = fDate(eDt).replace(/-/g,'');
        ics += `BEGIN:VEVENT\nDTSTART;VALUE=DATE:${s}\nDTEND;VALUE=DATE:${e}\nSUMMARY:${b.reason}\nEND:VEVENT\n`;
    });
    ics += "END:VCALENDAR";
    let n = document.createElement('a'); n.href = "data:text/calendar;charset=utf8," + escape(ics); 
    n.download = "schedule.ics"; n.click(); toaster.show("ICS Exported!", "info-alert");
}

function generateTextReport() {
    if(!state.blocks.length) return toaster.show("Generate a schedule first.", "error-alert");
    let txt = "SCHOOL EXCUSE SCHEDULE SUMMARY\n==============================\n\n";
    state.blocks.sort((a,b)=>sDate(a.start)-sDate(b.start)).forEach(b => {
        txt += `Date: ${b.start} to ${b.end}\nReason: ${b.reason}\nDuration: ${b.missed} Day(s)\n------------------------------\n`;
    });
    let n = document.createElement('a'); n.href = "data:text/plain;charset=utf-8," + encodeURIComponent(txt); 
    n.download = "summary.txt"; n.click(); toaster.show("Report Downloaded!", "info-alert");
}

function exportJSONState() {
    const payload = {
        version: '2.0',
        settings: {
            country: document.getElementById('sel-country').value,
            state: document.getElementById('sel-state').value,
            maxDays: document.getElementById('rng-days').value,
            minLen: document.getElementById('rng-minlen').value,
            maxLen: document.getElementById('rng-maxlen').value,
            risk: document.getElementById('rng-risk').value,
            isFemale: document.getElementById('btn-female').classList.contains('active-female'),
            cycle: document.getElementById('chk-cycle').checked,
            halfDays: document.getElementById('chk-halfdays').checked,
            noConsec: document.getElementById('chk-consecutive').checked,
            customDates: state.customDates,
            excusePool: excusePool.general
        },
        schedule: state.blocks
    };
    let n = document.createElement('a'); n.href = "data:application/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2)); 
    n.download = "scheduler_config.json"; n.click(); toaster.show("Configuration Exported!", "info-alert");
}

function importJSONState(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            const data = JSON.parse(evt.target.result);
            if(data.settings) {
                document.getElementById('sel-country').value = data.settings.country;
                updateStateDropdown(data.settings.country);
                if(data.settings.state) document.getElementById('sel-state').value = data.settings.state;
                
                document.getElementById('rng-days').value = data.settings.maxDays;
                document.getElementById('val-days').innerText = data.settings.maxDays;
                document.getElementById('rng-minlen').value = data.settings.minLen || 1;
                document.getElementById('rng-maxlen').value = data.settings.maxLen || 2;
                updateSliders();
                document.getElementById('rng-risk').value = data.settings.risk;
                updateRiskText(data.settings.risk);

                if(data.settings.isFemale) document.getElementById('btn-female').click();
                else document.getElementById('btn-male').click();

                document.getElementById('chk-cycle').checked = data.settings.cycle;
                document.getElementById('chk-halfdays').checked = data.settings.halfDays;
                document.getElementById('chk-consecutive').checked = data.settings.noConsec;
                
                if(data.settings.customDates) { state.customDates = data.settings.customDates; renderCustomDatesList(); }
                if(data.settings.excusePool) excusePool.general = data.settings.excusePool;
            }
            if(data.schedule) {
                state.blocks = data.schedule;
                updateCalendarEvents();
                updateDashboard();
            }
            fetchHolidays();
            toaster.show("Configuration Imported Successfully!", "info-alert");
        } catch (err) { toaster.show("Invalid JSON file.", "error-alert"); }
        document.getElementById('fileInput').value = ''; // reset
    };
    reader.readAsText(file);
}
