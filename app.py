import streamlit as st
import pandas as pd
import requests
import random
import pycountry
from datetime import datetime, timedelta, date
from streamlit_calendar import calendar
import json

# --- 1. STATE INITIALIZATION ---
st.set_page_config(page_title="School Excuse Scheduler", layout="wide", initial_sidebar_state="collapsed")

DEFAULT_SYMPTOMS = {
    "Migraine": {"min": 1, "max": 2, "seasons": [1,2,3,4,5,6,7,8,9,10,11,12], "is_period": False, "modifiers": ["with severe light sensitivity", "with severe nausea", "and visual aura", "causing extreme dizziness"]},
    "Food Poisoning": {"min": 1, "max": 3, "seasons": [6,7,8,9], "is_period": False, "modifiers": ["from suspected salmonella", "with mild dehydration", "with continuous vomiting", "and sharp stomach cramps"]},
    "Severe Allergy Flare-up": {"min": 1, "max": 2, "seasons": [3,4,5], "is_period": False, "modifiers": ["requiring strong antihistamines", "with severe sinus pressure", "causing a severe rash", "with swollen eyes"]},
    "Stomach Bug (Gastroenteritis)": {"min": 2, "max": 4, "seasons": [1,2,3,4,5,6,7,8,9,10,11,12], "is_period": False, "modifiers": ["with heavy cramping", "with vomiting", "and a mild fever", "and severe headaches", "with extreme fatigue"]},
    "Severe Cold": {"min": 2, "max": 5, "seasons": [9,10,11,12,1,2,3], "is_period": False, "modifiers": ["with a heavy dry cough", "and secondary sinus infection", "with a mild fever", "and loss of voice"]},
    "Influenza (Flu)": {"min": 4, "max": 7, "seasons": [11,12,1,2,3], "is_period": False, "modifiers": ["with high fever", "with severe body aches", "and chills", "causing severe exhaustion"]},
    "Sprained Ankle": {"min": 3, "max": 7, "seasons": [1,2,3,4,5,6,7,8,9,10,11,12], "is_period": False, "modifiers": ["requiring strict rest", "with heavy swelling", "requiring crutches for a few days"]},
    "Tonsillitis": {"min": 4, "max": 7, "seasons": [1,2,3,4,5,6,7,8,9,10,11,12], "is_period": False, "modifiers": ["requiring antibiotics", "with a fever", "making swallowing impossible"]},
    "Menstrual Pain (Dysmenorrhea)": {"min": 1, "max": 2, "seasons": [1,2,3,4,5,6,7,8,9,10,11,12], "gender": "Female", "is_period": True, "modifiers": ["with severe cramping", "requiring bed rest", "with heavy lower back pain"]},
    "Heavy Flow & Fatigue (Menorrhagia)": {"min": 1, "max": 3, "seasons": [1,2,3,4,5,6,7,8,9,10,11,12], "gender": "Female", "is_period": True, "modifiers": ["with extreme exhaustion", "causing severe dizziness", "and suspected mild anemia"]},
    "Premenstrual Migraine (PMS)": {"min": 1, "max": 2, "seasons": [1,2,3,4,5,6,7,8,9,10,11,12], "gender": "Female", "is_period": True, "modifiers": ["with light sensitivity", "and severe nausea", "with extreme mood fatigue"]}
}

if "sick_blocks" not in st.session_state: st.session_state.sick_blocks = []
# Updated to use today's date dynamically
if "school_start" not in st.session_state: st.session_state.school_start = date.today()
# Updated to automatically default the end date to 1 year from today
if "school_end" not in st.session_state: st.session_state.school_end = date.today() + timedelta(days=365)

if "target_val" not in st.session_state: st.session_state.target_val = 20
if "block_limits" not in st.session_state: st.session_state.block_limits = (1, 7)
if "min_gap" not in st.session_state: st.session_state.min_gap = 3
if "public_holidays" not in st.session_state: st.session_state.public_holidays = pd.DataFrame(columns=["Name", "Start", "End", "Type"])
if "custom_holidays" not in st.session_state: st.session_state.custom_holidays = pd.DataFrame(columns=["Name", "Start", "End", "Type"])
if "calendar_view_date" not in st.session_state: st.session_state.calendar_view_date = date.today().strftime("%Y-%m-%d")
if "active_symptoms" not in st.session_state: st.session_state.active_symptoms = DEFAULT_SYMPTOMS.copy()
if "gender" not in st.session_state: st.session_state.gender = "Male"

# --- 2. CSS & UI COMPACTION ---
st.markdown("""
<style>
/* Pull calendar up and reduce whitespace */
.block-container { padding-top: 1rem !important; padding-bottom: 1rem !important; max-width: 98% !important; }
header[data-testid="stHeader"] { display: none; } /* Hide top whitespace */
/* Calendar event text wrapping for mobile */
.fc-event { white-space: normal !important; word-wrap: break-word !important; font-size: 0.85em !important; }
.fc-toolbar-title { font-size: 1.2em !important; }
</style>
""", unsafe_allow_html=True)

# --- 3. HELPER FUNCTIONS ---
@st.cache_data
def get_global_data():
    return {getattr(c, 'common_name', c.name): c.alpha_2 for c in pycountry.countries}

def fetch_nager_holidays():
    cc, start_year, end_year = st.session_state.selected_country_code, st.session_state.school_start.year, st.session_state.school_end.year
    holidays_list = []
    try:
        for y in range(start_year, end_year + 1):
            res = requests.get(f"https://date.nager.at/api/v3/PublicHolidays/{y}/{cc}", timeout=5)
            if res.status_code == 200:
                for h in res.json():
                    h_date = datetime.strptime(h['date'], "%Y-%m-%d").date()
                    if st.session_state.school_start <= h_date <= st.session_state.school_end:
                        holidays_list.append({"Name": h['name'], "Start": h_date, "End": h_date, "Type": "Public"})
    except:
        pass # Silently fail if API is unreachable
    st.session_state.public_holidays = pd.DataFrame(holidays_list) if holidays_list else pd.DataFrame(columns=["Name", "Start", "End", "Type"])

# --- 4. INTERACTIVE DIALOG MODAL ---
@st.dialog("Manage Selected Absence")
def edit_absence_dialog(block_idx):
    block = st.session_state.sick_blocks[block_idx]
    st.markdown(f"**Current Excuse:** {block['reason']}")
    st.markdown(f"**Dates:** {block['start']} to {block['end']} ({block['school_days_missed']} school days)")
    
    if st.button("🗑️ Delete this Absence", type="secondary", use_container_width=True):
        st.session_state.sick_blocks.pop(block_idx)
        st.rerun()
        
    st.divider()
    st.markdown("### 🔄 Redraw / Edit Excuse")
    
    available_illnesses = [k for k, v in st.session_state.active_symptoms.items() if not (st.session_state.gender == "Male" and v.get("gender") == "Female")]
    selected_base = st.selectbox("Select specific illness base:", available_illnesses)
    
    st.markdown("**Select Modifiers:**")
    illness_data = st.session_state.active_symptoms[selected_base]
    chosen_mods = []
    
    mod_cols = st.columns(2)
    for i, mod in enumerate(illness_data.get("modifiers", [])):
        if mod_cols[i % 2].checkbox(mod, value=False, key=f"dialog_mod_{i}"):
            chosen_mods.append(mod)
            
    if st.button("Apply New Excuse", type="primary", use_container_width=True):
        new_reason = selected_base
        if chosen_mods:
            new_reason += " " + " ".join(chosen_mods)
            
        st.session_state.sick_blocks[block_idx]['reason'] = new_reason
        st.session_state.sick_blocks[block_idx]['is_period'] = illness_data.get("is_period", False)
        st.rerun()

# --- 5. SIDEBAR & LOGIC ---
st.sidebar.header("🗓️ Settings")
st.session_state.school_start = st.sidebar.date_input("School Start", st.session_state.school_start, format="DD/MM/YYYY")
st.session_state.school_end = st.sidebar.date_input("School End", st.session_state.school_end, format="DD/MM/YYYY")

world_data = get_global_data()
country_names = sorted(list(world_data.keys()))
default_c_idx = country_names.index("Switzerland") if "Switzerland" in country_names else 0
st.session_state.selected_country_code = world_data[st.sidebar.selectbox("Country", country_names, index=default_c_idx)]

if st.session_state.get("last_hash") != f"{st.session_state.selected_country_code}-{st.session_state.school_start}":
    fetch_nager_holidays()
    st.session_state.last_hash = f"{st.session_state.selected_country_code}-{st.session_state.school_start}"

st.session_state.gender = st.sidebar.radio("Student Gender", ["Male", "Female"], index=0 if st.session_state.gender=="Male" else 1, horizontal=True)

st.sidebar.divider()
st.session_state.target_val = st.sidebar.slider("Target Days to Miss", 1, 80, st.session_state.target_val)
st.session_state.block_limits = st.sidebar.slider("Sick Block Length (Min/Max)", 1, 7, st.session_state.block_limits)
st.session_state.min_gap = st.sidebar.slider("Min Days Between Blocks", 1, 15, st.session_state.min_gap)

generate_btn = st.sidebar.button("Generate Strategy", type="primary", use_container_width=True)
if st.sidebar.button("Clear Schedule", use_container_width=True):
    st.session_state.sick_blocks = []
    st.rerun()

all_holidays_df = pd.concat([st.session_state.public_holidays, st.session_state.custom_holidays], ignore_index=True)
holiday_dates = {row['Start'] + timedelta(days=i) for _, row in all_holidays_df.iterrows() if pd.notna(row['Start']) for i in range((row['End'] - row['Start']).days + 1)}
valid_days = [st.session_state.school_start + timedelta(days=i) for i in range((st.session_state.school_end - st.session_state.school_start).days + 1) if (st.session_state.school_start + timedelta(days=i)).weekday() < 5 and (st.session_state.school_start + timedelta(days=i)) not in holiday_dates]

if generate_btn:
    st.session_state.sick_blocks, current_missed, history, pool = [], 0, [], valid_days.copy()
    for _ in range(1000):
        if current_missed >= st.session_state.target_val or not pool: break
        start_date = random.choice(pool)
        duration = random.randint(st.session_state.block_limits[0], st.session_state.block_limits[1])
        end_date = start_date + timedelta(days=duration - 1)
        
        block_school_days = sum(1 for d in range(duration) if start_date + timedelta(days=d) in valid_days)
        if block_school_days == 0: continue
            
        if current_missed + block_school_days > st.session_state.target_val:
            block_school_days = st.session_state.target_val - current_missed
            end_date = start_date 
            found = 0
            while found < block_school_days:
                if end_date in valid_days: found += 1
                if found < block_school_days: end_date += timedelta(days=1)
        
        if any(not ((start_date - b['end']).days >= st.session_state.min_gap or (b['start'] - end_date).days >= st.session_state.min_gap) for b in st.session_state.sick_blocks):
            continue
            
        period_cooldown = any(b.get("is_period", False) and abs((start_date - b["start"]).days) < 26 for b in st.session_state.sick_blocks)
        valid_ills = [(n, d) for n, d in st.session_state.active_symptoms.items() if not (d.get("gender") and d["gender"] != st.session_state.gender) and not (d.get("is_period") and period_cooldown) and d["min"] <= duration <= d["max"] and start_date.month in d["seasons"] and n not in history[-2:]]
        
        if not valid_ills: continue
        chosen_name, chosen_data = random.choice(valid_ills)
        symptom_string = chosen_name
        if chosen_data.get("modifiers") and random.random() > 0.3:
            symptom_string += " " + " ".join(random.sample(chosen_data["modifiers"], k=random.randint(1, min(2, len(chosen_data["modifiers"])))))
        
        history.append(chosen_name)
        current_missed += block_school_days
        st.session_state.sick_blocks.append({"start": start_date, "end": end_date, "reason": symptom_string, "school_days_missed": block_school_days, "is_period": chosen_data.get("is_period", False)})
        for d in range((end_date - start_date).days + 1):
            if start_date + timedelta(days=d) in pool: pool.remove(start_date + timedelta(days=d))
    st.rerun()

# --- 6. MAIN UI ---
tab_cal, tab_sym, tab_data = st.tabs(["📅 Schedule", "⚙️ Illness Config", "📁 Data"])

with tab_cal:
    cal_opts = {
        "initialDate": st.session_state.calendar_view_date,
        "initialView": "dayGridMonth",
        "contentHeight": "auto", 
        "aspectRatio": 1.6,
        "headerToolbar": {"left": "prev,next", "center": "title", "right": "today"},
    }
    
    events = [{"daysOfWeek": [0, 6], "display": "background", "color": "#198754"}]
    events.extend([{"title": r['Name'], "start": r['Start'].strftime("%Y-%m-%d"), "end": (r['End'] + timedelta(days=1)).strftime("%Y-%m-%d"), "backgroundColor": "#ffc107" if r.get('Type') == "Public" else "#17a2b8", "textColor": "#000"} for _, r in all_holidays_df.iterrows() if pd.notna(r['Start'])])
    
    for idx, sb in enumerate(st.session_state.sick_blocks):
        events.append({
            "id": f"sick_{idx}",
            "title": f"{sb['reason']} ({sb['school_days_missed']}d)", 
            "start": sb['start'].strftime("%Y-%m-%d"), 
            "end": (sb['end'] + timedelta(days=1)).strftime("%Y-%m-%d"), 
            "backgroundColor": "#dc3545",
            "extendedProps": {"block_idx": idx} 
        })
    
    cal_res = calendar(events=events, options=cal_opts)
    
    if cal_res.get("callback") == "eventClick":
        clicked_id = cal_res["eventClick"]["event"]["id"]
        if clicked_id and clicked_id.startswith("sick_"):
            block_idx = int(clicked_id.split("_")[1])
            edit_absence_dialog(block_idx)

with tab_sym:
    st.write("Enable/Disable Excuses & Add-ons")
    updated_symptoms = {}
    for illness_name, data in DEFAULT_SYMPTOMS.items():
        if st.session_state.gender == "Male" and data.get("gender") == "Female": continue
        if st.checkbox(f"**{illness_name}**", value=illness_name in st.session_state.active_symptoms):
            active_mods = []
            curr_mods = st.session_state.active_symptoms.get(illness_name, data).get("modifiers", data["modifiers"])
            cols = st.columns(3)
            for i, mod_text in enumerate(data["modifiers"]):
                if cols[i%3].checkbox(mod_text, value=(mod_text in curr_mods), key=f"mod_{illness_name}_{i}"):
                    active_mods.append(mod_text)
            new_data = data.copy()
            new_data["modifiers"] = active_mods
            updated_symptoms[illness_name] = new_data
        st.divider()
    st.session_state.active_symptoms = updated_symptoms

with tab_data:
    col1, col2 = st.columns(2)
    with col1:
        st.subheader("Custom Holidays")
        with st.form("add_holiday_form", clear_on_submit=True):
            h_name = st.text_input("Event Name")
            hc1, hc2 = st.columns(2)
            h_start, h_end = hc1.date_input("Start", date.today()), hc2.date_input("End", date.today())
            if st.form_submit_button("Add Event") and h_name:
                st.session_state.custom_holidays = pd.concat([st.session_state.custom_holidays, pd.DataFrame([{"Name": h_name, "Start": h_start, "End": h_end, "Type": "Custom"}])], ignore_index=True)
                st.rerun()
        if not st.session_state.custom_holidays.empty:
            st.dataframe(st.session_state.custom_holidays, use_container_width=True, hide_index=True)
            if st.button("Clear Holidays"):
                st.session_state.custom_holidays = pd.DataFrame(columns=["Name", "Start", "End", "Type"])
                st.rerun()
    with col2:
        st.subheader("Settings Backup")
        export_data = {"target": st.session_state.target_val, "limits": st.session_state.block_limits, "gap": st.session_state.min_gap, "gender": st.session_state.gender, "sym": st.session_state.active_symptoms}
        st.download_button("Export Settings (JSON)", json.dumps(export_data, indent=4), "settings.json", "application/json", use_container_width=True)
        uploaded = st.file_uploader("Import Settings (JSON)", type="json")
        if uploaded:
            data = json.load(uploaded)
            st.session_state.target_val = data.get("target", 20)
            st.session_state.block_limits = tuple(data.get("limits", (1,7)))
            st.session_state.min_gap = data.get("gap", 3)
            st.session_state.gender = data.get("gender", "Male")
            st.session_state.active_symptoms = data.get("sym", DEFAULT_SYMPTOMS.copy())
            st.success("Loaded! Please interact with a widget to refresh.")
