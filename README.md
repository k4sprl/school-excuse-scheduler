# school-excuse-scheduler
⚠️EDUCATIONAL PURPOUSES ONLY. Not intended to skip school! Examples: learning python or calendar/schedule realated stuff.

# 📅 School Excuse Scheduler

A highly customizable, epidemiologically-grounded generator for planning plausible school or work absences. Built with Python and Streamlit, this tool creates a randomized but logical schedule of "sick days" that fits around your local public holidays and respects biological constraints.

## ✨ Features
* **Smart Illness Engine:** Generates realistic excuses by randomly combining base illnesses (e.g., "Stomach Bug") with dynamic modifiers (e.g., "with heavy cramping and mild fever").
* **Biological Constraints:** Female-specific absences (like dysmenorrhea) are hard-capped to occur securely with realistic cooldowns (max 1 per 26 days).
* **Holiday Integration:** Automatically pulls real-world public holidays using the `date.nager.at` API based on your selected country, ensuring you aren't "sick" on days you already have off.
* **Custom Excuses & Holidays:** Build your own custom sicknesses with specific modifiers, and import/export custom school holidays via CSV.
* **Full Data Portability:** Export your generated schedule to an `.ics` calendar file (for Google Calendar, Apple, Outlook), and backup all your tool settings to a `.json` file.
* **Print-Ready:** Includes a custom CSS print media query so you can hit `Ctrl+P` and get a clean, perfectly scaled paper copy of your schedule.

---

## 🌐 Live Web Version (No Installation Required)
You can run the tool entirely in your browser without installing anything! 

👉 **[Try it here](https://k4sprl.github.io/school-excuse-scheduler/)**

*Note: The web version is powered by WebAssembly (`stlite`). It runs 100% locally on your device for maximum privacy, but because it has to download a Python engine into your browser cache, the initial loading time is a bit slow. For instantaneous performance, run it locally.*

---

## 🚀 Running Locally (Maximum Speed)

Running the app natively on your machine using standard Python is significantly faster and more responsive than the browser-based WebAssembly version. 

### 🐧 Arch Linux Setup
Arch Linux enforces PEP 668, meaning you should always use a virtual environment to install Python packages via `pip` to avoid breaking your system packages.

1. **Install system dependencies:** Open your terminal and run:
   ```bash
   sudo pacman -S python git
   ```
2. **Clone the repository:**
   ```bash
   git clone [https://github.com/k4sprl/school-excuse-scheduler.git](https://github.com/k4sprl/school-excuse-scheduler.git)
   cd school-excuse-scheduler
   ```
3. **Create and activate a virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate
   ```
4. **Install the required Python libraries:**
   ```bash
   pip install streamlit pandas requests pycountry streamlit-calendar
   ```
5. **Launch the application:**
   ```bash
   streamlit run app.py
   ```
   *The app will instantly pop up in your default web browser at `http://localhost:8501`. (Note: You will need to run `source venv/bin/activate` anytime you open a new terminal to run the app).*

---

### 🪟 Windows Setup
1. **Install Python:** Download Python from the [official website](https://www.python.org/downloads/). 
   * ⚠️ **CRITICAL:** During the installation window, make sure to check the box at the bottom that says **"Add python.exe to PATH"** before clicking Install.
2. **Download the tool:** Either download this repository as a `.zip` file and extract it, or use Git in your Command Prompt:
   ```cmd
   git clone [https://github.com/k4sprl/school-excuse-scheduler.git](https://github.com/k4sprl/school-excuse-scheduler.git)
   cd school-excuse-scheduler
   ```
3. **Create a virtual environment:** Open Command Prompt (`cmd`) or PowerShell inside the folder where you extracted the tool, and run:
   ```cmd
   python -m venv venv
   ```
4. **Activate the virtual environment:**
   ```cmd
   .\venv\Scripts\activate
   ```
   *(If you get a permissions error in PowerShell, type `Set-ExecutionPolicy Unrestricted -Scope CurrentUser` and try again).*
5. **Install the required libraries:**
   ```cmd
   pip install streamlit pandas requests pycountry streamlit-calendar
   ```
6. **Launch the application:**
   ```cmd
   streamlit run app.py
   ```
   *The app will open in your default browser at `http://localhost:8501`. (Note: Run `.\venv\Scripts\activate` anytime you open a new terminal to run the app).*

---

## 🛠️ Built With
* [Streamlit](https://streamlit.io/) - The web framework
* [Stlite](https://github.com/whitphx/stlite) - For the serverless WebAssembly deployment
* [Nager.Date API](https://date.nager.at/) - For global public holiday data

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
