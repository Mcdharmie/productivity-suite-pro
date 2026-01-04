// ===== APP STATE =====
const AppState = {
    // Views
    currentView: 'daily',
    currentWeek: new Date(),
    
    // Data
    tasks: [],
    habits: [],
    goals: [],
    focusHistory: [],
    analytics: {},
    
    // UI State
    theme: 'light',
    notifications: [],
    timerRunning: false,
    timerStart: null,
    timerElapsed: 0
};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    loadAllData();
    updateUI();
    startClock();
    checkNotifications();
});

function initializeApp() {
    // Set current date
    updateCurrentWeekDisplay();
    
    // Initialize charts
    initializeCharts();
    
    // Set up auto-save
    setInterval(saveAllData, 30000);
    
    // Check for notifications
    scheduleNotifications();
}

// ===== THEME MANAGEMENT =====
function toggleTheme() {
    const body = document.body;
    const themeIcon = document.querySelector('.theme-icon');
    
    if (body.classList.contains('light-mode')) {
        body.classList.remove('light-mode');
        body.classList.add('dark-mode');
        themeIcon.textContent = '☀️';
        AppState.theme = 'dark';
    } else {
        body.classList.remove('dark-mode');
        body.classList.add('light-mode');
        themeIcon.textContent = '🌙';
        AppState.theme = 'light';
    }
    
    saveTheme();
    updateChartsTheme();
}

function saveTheme() {
    localStorage.setItem('productivity-theme', AppState.theme);
}

function loadTheme() {
    const saved = localStorage.getItem('productivity-theme');
    if (saved) {
        AppState.theme = saved;
        document.body.classList.remove('light-mode', 'dark-mode');
        document.body.classList.add(saved + '-mode');
        document.querySelector('.theme-icon').textContent = saved === 'dark' ? '☀️' : '🌙';
    }
}

// ===== VIEW MANAGEMENT =====
function setupViewListeners() {
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const view = this.dataset.view;
            switchView(view);
        });
    });
    
    document.querySelectorAll('.view-btn-sm').forEach(btn => {
        btn.addEventListener('click', function() {
            const schedule = this.dataset.schedule;
            switchSchedule(schedule);
        });
    });
}

function switchView(view) {
    // Update buttons
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-view="${view}"]`).classList.add('active');
    
    // Update views
    document.querySelectorAll('.view').forEach(v => {
        v.classList.remove('active');
    });
    document.getElementById(view + 'View').classList.add('active');
    
    AppState.currentView = view;
    
    // Load view-specific data
    if (view === 'weekly') {
        loadWeeklyView();
    } else if (view === 'analytics') {
        updateAnalytics();
    }
}

function switchSchedule(schedule) {
    document.querySelectorAll('.view-btn-sm').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-schedule="${schedule}"]`).classList.add('active');
    
    document.querySelectorAll('.schedule-table').forEach(table => {
        table.classList.remove('active');
    });
    document.getElementById(schedule + 'Table').classList.add('active');
    
    updateTimetable();
}

// ===== TASK MANAGEMENT =====
function addTask() {
    document.getElementById('modalTaskInput').value = '';
    document.getElementById('taskPriority').value = 'medium';
    document.getElementById('taskCategory').value = 'work';
    showModal('taskModal');
}

function saveTaskModal() {
    const text = document.getElementById('modalTaskInput').value.trim();
    if (!text) return;
    
    const task = {
        id: Date.now(),
        text: text,
        completed: false,
        priority: document.getElementById('taskPriority').value,
        category: document.getElementById('taskCategory').value,
        createdAt: new Date().toISOString(),
        completedAt: null
    };
    
    AppState.tasks.push(task);
    closeModal('taskModal');
    updateTasksUI();
    saveTasks();
    addNotification('Task added: ' + text);
}

function addTaskFromInput() {
    const input = document.getElementById('newTaskInput');
    const text = input.value.trim();
    if (!text) return;
    
    const task = {
        id: Date.now(),
        text: text,
        completed: false,
        priority: 'medium',
        category: 'personal',
        createdAt: new Date().toISOString(),
        completedAt: null
    };
    
    AppState.tasks.push(task);
    input.value = '';
    updateTasksUI();
    saveTasks();
}

function toggleTask(id) {
    const task = AppState.tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        task.completedAt = task.completed ? new Date().toISOString() : null;
        updateTasksUI();
        saveTasks();
        updateTodayStats();
    }
}

function deleteTask(id) {
    AppState.tasks = AppState.tasks.filter(t => t.id !== id);
    updateTasksUI();
    saveTasks();
}

function updateTasksUI() {
    const container = document.getElementById('tasksList');
    const today = new Date().toDateString();
    const todayTasks = AppState.tasks.filter(t => 
        new Date(t.createdAt).toDateString() === today
    );
    
    container.innerHTML = '';
    
    todayTasks.forEach(task => {
        const taskEl = document.createElement('div');
        taskEl.className = 'task-item';
        taskEl.innerHTML = `
            <div class="task-checkbox ${task.completed ? 'checked' : ''}" 
                 onclick="toggleTask(${task.id})">
                ${task.completed ? '✓' : ''}
            </div>
            <div class="task-text ${task.completed ? 'completed' : ''}">
                ${task.text}
            </div>
            <div class="task-priority priority-${task.priority}">
                ${task.priority}
            </div>
            <button onclick="deleteTask(${task.id})" class="btn-icon small">🗑️</button>
        `;
        container.appendChild(taskEl);
    });
    
    // Update stats
    const total = todayTasks.length;
    const completed = todayTasks.filter(t => t.completed).length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    document.getElementById('totalTasks').textContent = total;
    document.getElementById('completedTasks').textContent = completed;
    document.getElementById('taskProgress').textContent = progress + '%';
    document.getElementById('tasksDoneToday').textContent = `${completed}/${total}`;
}

// ===== HABIT MANAGEMENT =====
function addHabit() {
    document.getElementById('modalHabitInput').value = '';
    document.getElementById('habitFrequency').value = 'daily';
    document.getElementById('habitTime').value = 'morning';
    showModal('habitModal');
}

function saveHabitModal() {
    const name = document.getElementById('modalHabitInput').value.trim();
    if (!name) return;
    
    const habit = {
        id: Date.now(),
        name: name,
        frequency: document.getElementById('habitFrequency').value,
        time: document.getElementById('habitTime').value,
        streak: 0,
        history: [],
        createdAt: new Date().toISOString()
    };
    
    AppState.habits.push(habit);
    closeModal('habitModal');
    updateHabitsUI();
    saveHabits();
    addNotification('Habit added: ' + name);
}

function toggleHabit(id) {
    const habit = AppState.habits.find(h => h.id === id);
    if (!habit) return;
    
    const today = new Date().toDateString();
    const todayIndex = habit.history.findIndex(h => h.date === today);
    
    if (todayIndex >= 0) {
        // Toggle completion
        habit.history[todayIndex].completed = !habit.history[todayIndex].completed;
    } else {
        // Add today's entry
        habit.history.push({
            date: today,
            completed: true
        });
    }
    
    // Update streak
    updateHabitStreak(habit);
    
    updateHabitsUI();
    saveHabits();
    updateTodayStats();
}

function updateHabitStreak(habit) {
    // Sort history by date
    habit.history.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Calculate current streak
    let streak = 0;
    const today = new Date();
    
    for (let i = 0; i < 365; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toDateString();
        
        const entry = habit.history.find(h => h.date === dateStr);
        if (entry && entry.completed) {
            streak++;
        } else {
            break;
        }
    }
    
    habit.streak = streak;
}

function updateHabitsUI() {
    const container = document.getElementById('habitsList');
    const today = new Date().toDateString();
    
    container.innerHTML = '';
    
    AppState.habits.forEach(habit => {
        const todayEntry = habit.history.find(h => h.date === today);
        const completed = todayEntry ? todayEntry.completed : false;
        
        const habitEl = document.createElement('div');
        habitEl.className = 'habit-item';
        habitEl.innerHTML = `
            <div class="habit-info">
                <div class="habit-check ${completed ? 'checked' : ''}" 
                     onclick="toggleHabit(${habit.id})">
                    ${completed ? '✓' : ''}
                </div>
                <div>
                    <div>${habit.name}</div>
                    <div class="habit-streak">${habit.streak} day streak</div>
                </div>
            </div>
            <div class="habit-time">${habit.time}</div>
        `;
        container.appendChild(habitEl);
    });
    
    // Update calendar
    updateHabitsCalendar();
    
    // Update stats
    const total = AppState.habits.length;
    const completed = AppState.habits.filter(h => {
        const todayEntry = h.history.find(entry => entry.date === today);
        return todayEntry && todayEntry.completed;
    }).length;
    
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    document.getElementById('habitsToday').textContent = percentage + '%';
}

function updateHabitsCalendar() {
    const container = document.getElementById('habitsCalendar');
    container.innerHTML = '';
    
    const today = new Date();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // Get last 7 days
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toDateString();
        const dayName = days[date.getDay()];
        
        // Check if all habits were completed this day
        let allCompleted = true;
        if (AppState.habits.length > 0) {
            allCompleted = AppState.habits.every(habit => {
                const entry = habit.history.find(h => h.date === dateStr);
                return entry && entry.completed;
            });
        }
        
        const dayEl = document.createElement('div');
        dayEl.className = `calendar-day ${allCompleted ? 'completed' : ''}`;
        dayEl.textContent = dayName[0];
        dayEl.title = `${dayName} ${date.getDate()}: ${allCompleted ? 'All habits completed' : 'Incomplete'}`;
        container.appendChild(dayEl);
    }
}

// ===== FOCUS TIMER =====
let focusTimerInterval = null;
let focusTimerSeconds = 0;

function toggleFocusTimer() {
    const button = document.getElementById('timerToggle');
    
    if (!AppState.timerRunning) {
        // Start timer
        AppState.timerRunning = true;
        AppState.timerStart = new Date();
        button.textContent = 'Pause';
        
        focusTimerInterval = setInterval(() => {
            focusTimerSeconds++;
            updateTimerDisplay();
        }, 1000);
        
        addNotification('Focus timer started');
    } else {
        // Pause timer
        AppState.timerRunning = false;
        button.textContent = 'Resume';
        clearInterval(focusTimerInterval);
        
        // Save focus session
        saveFocusSession();
    }
}

function updateTimerDisplay() {
    const hours = Math.floor(focusTimerSeconds / 3600);
    const minutes = Math.floor((focusTimerSeconds % 3600) / 60);
    const seconds = focusTimerSeconds % 60;
    
    const display = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    document.getElementById('focusTimer').textContent = display;
}

function saveFocusSession() {
    if (focusTimerSeconds > 60) { // Only save sessions longer than 1 minute
        const session = {
            date: new Date().toISOString(),
            duration: focusTimerSeconds,
            focusText: document.getElementById('focusInput').value
        };
        
        AppState.focusHistory.push(session);
        saveFocusHistory();
        
        // Update today's focus time
        updateTodayStats();
    }
}

function resetFocusTimer() {
    AppState.timerRunning = false;
    AppState.timerStart = null;
    focusTimerSeconds = 0;
    clearInterval(focusTimerInterval);
    
    document.getElementById('timerToggle').textContent = 'Start';
    document.getElementById('focusTimer').textContent = '00:00:00';
}

// ===== WEEKLY VIEW =====
function loadWeeklyView() {
    updateWeeklyGrid();
    updateWeeklyStats();
}

function changeWeek(direction) {
    AppState.currentWeek.setDate(AppState.currentWeek.getDate() + (direction * 7));
    updateCurrentWeekDisplay();
    loadWeeklyView();
}

function updateCurrentWeekDisplay() {
    const start = new Date(AppState.currentWeek);
    start.setDate(start.getDate() - start.getDay());
    
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    
    const display = `Week of ${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    document.getElementById('currentWeek').textContent = display;
}

function updateWeeklyGrid() {
    const container = document.getElementById('weeklyGrid');
    container.innerHTML = '';
    
    const start = new Date(AppState.currentWeek);
    start.setDate(start.getDate() - start.getDay());
    
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    for (let i = 0; i < 7; i++) {
        const date = new Date(start);
        date.setDate(date.getDate() + i);
        const dateStr = date.toDateString();
        
        // Get tasks for this day
        const dayTasks = AppState.tasks.filter(task => 
            new Date(task.createdAt).toDateString() === dateStr
        );
        
        const completedTasks = dayTasks.filter(t => t.completed).length;
        
        const dayEl = document.createElement('div');
        dayEl.className = 'day-card';
        dayEl.innerHTML = `
            <div class="day-header">
                <div class="day-name">${days[i]}</div>
                <div class="day-date">${date.getDate()}</div>
            </div>
            <div class="day-tasks">
                ${dayTasks.length} tasks • ${completedTasks} completed
            </div>
        `;
        
        container.appendChild(dayEl);
    }
}

function updateWeeklyStats() {
    // Calculate focus time for the week
    const start = new Date(AppState.currentWeek);
    start.setDate(start.getDate() - start.getDay());
    
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    
    const weekFocus = AppState.focusHistory.filter(session => {
        const sessionDate = new Date(session.date);
        return sessionDate >= start && sessionDate <= end;
    }).reduce((total, session) => total + session.duration, 0);
    
    const focusHours = Math.round(weekFocus / 3600);
    document.getElementById('weeklyFocus').textContent = focusHours + 'h';
    
    // Calculate tasks completed
    const weekTasks = AppState.tasks.filter(task => {
        const taskDate = new Date(task.createdAt);
        return taskDate >= start && taskDate <= end && task.completed;
    }).length;
    
    document.getElementById('weeklyTasks').textContent = weekTasks;
    
    // Calculate habit streak
    const maxStreak = Math.max(...AppState.habits.map(h => h.streak), 0);
    document.getElementById('weeklyStreak').textContent = maxStreak + ' days';
}

// ===== ANALYTICS & CHARTS =====
function initializeCharts() {
    // Focus time chart
    window.focusChart = new Chart(document.getElementById('focusChart'), {
        type: 'pie',
        data: {
            labels: ['Work', 'Study', 'Fitness', 'Personal', 'Leisure'],
            datasets: [{
                data: [8, 4, 1, 3, 2],
                backgroundColor: [
                    '#3b82f6',
                    '#f59e0b',
                    '#ef4444',
                    '#8b5cf6',
                    '#10b981'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
    
    // Habit consistency chart
    window.habitChart = new Chart(document.getElementById('habitChart'), {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Habit Completion %',
                data: [80, 90, 75, 95, 85, 60, 70],
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
    
    // Task completion chart
    window.taskChart = new Chart(document.getElementById('taskChart'), {
        type: 'bar',
        data: {
            labels: ['Work', 'Study', 'Personal', 'Health'],
            datasets: [{
                label: 'Tasks Completed',
                data: [12, 8, 5, 3],
                backgroundColor: '#3b82f6'
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
    
    // Productivity trend chart
    window.productivityChart = new Chart(document.getElementById('productivityChart'), {
        type: 'line',
        data: {
            labels: Array.from({length: 30}, (_, i) => i + 1),
            datasets: [{
                label: 'Daily Productivity',
                data: Array.from({length: 30}, () => Math.floor(Math.random() * 100)),
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

function updateAnalytics() {
    const timeRange = document.getElementById('timeRange').value;
    
    // Update insights
    const insights = [
        'You\'re most productive in the mornings',
        'Try to complete your hardest task before 10 AM',
        'Your habit consistency is improving!',
        'Consider adding a 5-minute meditation to your morning routine'
    ];
    
    const insightsList = document.getElementById('insightsList');
    insightsList.innerHTML = '';
    
    insights.forEach(insight => {
        const item = document.createElement('div');
        item.className = 'insight-item';
        item.textContent = insight;
        insightsList.appendChild(item);
    });
}

function updateChartsTheme() {
    const isDark = document.body.classList.contains('dark-mode');
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const textColor = isDark ? '#f1f5f9' : '#111827';
    
    // Update all charts
    const charts = [focusChart, habitChart, taskChart, productivityChart];
    charts.forEach(chart => {
        if (chart) {
            chart.options.scales.x.grid.color = gridColor;
            chart.options.scales.y.grid.color = gridColor;
            chart.options.plugins.legend.labels.color = textColor;
            chart.update();
        }
    });
}

// ===== TIME & SCHEDULE =====
function startClock() {
    function updateClock() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit',
            hour12: true 
        });
        
        document.getElementById('currentTime').textContent = timeString;
        
        // Update day progress
        updateDayProgress(now);
    }
    
    updateClock();
    setInterval(updateClock, 1000);
}

function updateDayProgress(now) {
    const startOfDay = new Date(now);
    startOfDay.setHours(6, 30, 0, 0); // Wake up time
    
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 0, 0, 0); // End of day
    
    const totalDay = endOfDay - startOfDay;
    const elapsed = now - startOfDay;
    
    let progress = Math.min(Math.max(elapsed / totalDay, 0), 1) * 100;
    
    document.getElementById('dayProgress').style.width = progress + '%';
    document.getElementById('progressPercent').textContent = Math.round(progress) + '%';
    
    // Calculate next activity
    updateNextActivity(now);
}

function updateNextActivity(now) {
    const hour = now.getHours();
    const minute = now.getMinutes();
    const currentTime = hour * 60 + minute;
    
    // Define schedule
    const weekdaySchedule = [
        { time: 6.5 * 60, activity: 'Wake up & stretch' },
        { time: 6.67 * 60, activity: 'Daily planning' },
        { time: 6.83 * 60, activity: 'Workout' },
        { time: 8.33 * 60, activity: 'Work' },
        { time: 17 * 60, activity: 'Coding/Study' },
        { time: 19 * 60, activity: 'Dinner' },
        { time: 19.5 * 60, activity: 'Guitar/Coding' },
        { time: 20.5 * 60, activity: 'Study' },
        { time: 22 * 60, activity: 'Wind down' }
    ];
    
    let nextActivity = 'Sleep';
    
    for (let i = 0; i < weekdaySchedule.length; i++) {
        if (currentTime < weekdaySchedule[i].time) {
            nextActivity = weekdaySchedule[i].activity;
            break;
        }
    }
    
    document.getElementById('nextActivity').textContent = 'Next: ' + nextActivity;
}

function updateTimetable() {
    const isWeekday = document.querySelector('[data-schedule="weekday"]').classList.contains('active');
    const schedule = isWeekday ? weekdaySchedule : weekendSchedule;
    
    const container = isWeekday ? 
        document.querySelector('#weekdayTable tbody') :
        document.querySelector('#weekendTable tbody');
    
    container.innerHTML = '';
    
    schedule.forEach(item => {
        const row = document.createElement('tr');
        
        // Calculate status
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTime = currentHour + currentMinute / 60;
        
        let status = 'upcoming';
        if (currentTime >= item.end) {
            status = 'completed';
        } else if (currentTime >= item.start && currentTime < item.end) {
            status = 'current';
        }
        
        const statusClass = {
            'completed': '✅',
            'current': '⏳',
            'upcoming': '🕐'
        };
        
        row.innerHTML = `
            <td class="time">${formatTime(item.start)} – ${formatTime(item.end)}</td>
            <td class="activity">
                <span class="activity-dot ${item.category}"></span>
                ${item.activity}
            </td>
            <td class="status">${statusClass[status]}</td>
        `;
        
        container.appendChild(row);
    });
}

function formatTime(decimalHours) {
    const hours = Math.floor(decimalHours);
    const minutes = Math.round((decimalHours - hours) * 60);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours % 12 || 12;
    
    return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
}

// ===== DATA MANAGEMENT =====
function saveAllData() {
    saveTasks();
    saveHabits();
    saveFocus();
    saveFocusHistory();
    saveGoals();
    saveTheme();
    
    updateDataStatus('Data saved automatically');
    updateStorageUsage();
}

function loadAllData() {
    loadTheme();
    loadTasks();
    loadHabits();
    loadFocus();
    loadFocusHistory();
    loadGoals();
    
    updateUI();
    updateDataStatus('Data loaded');
    updateStorageUsage();
}

function exportData() {
    const data = {
        version: '2.0',
        exportDate: new Date().toISOString(),
        tasks: AppState.tasks,
        habits: AppState.habits,
        focusHistory: AppState.focusHistory,
        goals: AppState.goals,
        settings: {
            theme: AppState.theme
        }
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    const fileName = `productivity-suite-export-${new Date().toISOString().split('T')[0]}.json`;
    a.href = url;
    a.download = fileName;
    a.click();
    
    URL.revokeObjectURL(url);
    addNotification('Data exported successfully');
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            // Validate and import data
            if (data.tasks) AppState.tasks = data.tasks;
            if (data.habits) AppState.habits = data.habits;
            if (data.focusHistory) AppState.focusHistory = data.focusHistory;
            if (data.goals) AppState.goals = data.goals;
            if (data.settings && data.settings.theme) {
                AppState.theme = data.settings.theme;
                loadTheme();
            }
            
            // Update UI
            updateUI();
            saveAllData();
            
            addNotification('Data imported successfully');
            updateDataStatus('Data imported from ' + new Date(data.exportDate).toLocaleDateString());
            
        } catch (error) {
            console.error('Import error:', error);
            addNotification('Failed to import data', 'error');
        }
    };
    reader.readAsText(file);
    
    // Clear file input
    event.target.value = '';
}

function exportCSV() {
    // Export tasks as CSV
    let csv = 'Task,Completed,Priority,Category,Created,Completed\n';
    
    AppState.tasks.forEach(task => {
        csv += `"${task.text}",${task.completed},${task.priority},${task.category},${task.createdAt},${task.completedAt || ''}\n`;
    });
    
    const blob = new Blob([csv], {type: 'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    a.href = url;
    a.download = `tasks-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    URL.revokeObjectURL(url);
    addNotification('CSV exported successfully');
}

function printReport() {
    window.print();
}

function clearToday() {
    if (confirm('Clear all data for today? This will reset tasks, habits, and focus for today only.')) {
        const today = new Date().toDateString();
        
        // Clear today's focus
        localStorage.removeItem(`focus-${today}`);
        document.getElementById('focusInput').value = '';
        
        // Clear today's tasks
        AppState.tasks = AppState.tasks.filter(task => 
            new Date(task.createdAt).toDateString() !== today
        );
        
        // Clear today's habit entries
        AppState.habits.forEach(habit => {
            habit.history = habit.history.filter(entry => entry.date !== today);
        });
        
        // Update UI
        updateUI();
        saveAllData();
        
        addNotification('Today\'s data cleared');
    }
}

function updateStorageUsage() {
    let total = 0;
    
    // Calculate approximate storage usage
    total += JSON.stringify(AppState.tasks).length;
    total += JSON.stringify(AppState.habits).length;
    total += JSON.stringify(AppState.focusHistory).length;
    total += JSON.stringify(AppState.goals).length;
    
    const kb = Math.round(total / 1024);
    document.getElementById('storageUsage').textContent = `${kb}KB used`;
}

// ===== NOTIFICATIONS =====
function addNotification(message, type = 'info') {
    const notification = {
        id: Date.now(),
        message: message,
        type: type,
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        read: false
    };
    
    AppState.notifications.unshift(notification);
    
    // Update badge
    const badge = document.querySelector('.notification-badge');
    const unreadCount = AppState.notifications.filter(n => !n.read).length;
    
    if (unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.classList.remove('hidden');
    }
    
    // Show toast notification
    showToast(message, type);
    
    // Save notifications
    saveNotifications();
}

function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 100px;
        right: 24px;
        padding: 12px 20px;
        background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
        color: white;
        border-radius: 8px;
        z-index: 1000;
        animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

function checkNotifications() {
    // Check for scheduled notifications
    const now = new Date();
    const hour = now.getHours();
    
    // Morning reminder
    if (hour === 8) {
        addNotification('Good morning! Time to start your day. Check your focus for today.');
    }
    
    // Evening reminder
    if (hour === 21) {
        addNotification('Evening review time! How was your day?');
    }
}

function scheduleNotifications() {
    // Check every minute
    setInterval(checkNotifications, 60000);
}

// ===== TODAY'S STATS =====
function updateTodayStats() {
    const today = new Date().toDateString();
    
    // Focus time today
    const todayFocus = AppState.focusHistory
        .filter(session => new Date(session.date).toDateString() === today)
        .reduce((total, session) => total + session.duration, 0);
    
    const focusHours = Math.floor(todayFocus / 3600);
    const focusMinutes = Math.floor((todayFocus % 3600) / 60);
    document.getElementById('focusTimeToday').textContent = `${focusHours}h ${focusMinutes}m`;
    
    // Tasks today
    const todayTasks = AppState.tasks.filter(task => 
        new Date(task.createdAt).toDateString() === today
    );
    const completedTasks = todayTasks.filter(t => t.completed).length;
    document.getElementById('tasksDoneToday').textContent = `${completedTasks}/${todayTasks.length}`;
    
    // Habits today
    const totalHabits = AppState.habits.length;
    const completedHabits = AppState.habits.filter(habit => {
        const todayEntry = habit.history.find(entry => entry.date === today);
        return todayEntry && todayEntry.completed;
    }).length;
    
    const habitPercentage = totalHabits > 0 ? 
        Math.round((completedHabits / totalHabits) * 100) : 0;
    document.getElementById('habitsToday').textContent = `${habitPercentage}%`;
}

// ===== UI UPDATES =====
function updateUI() {
    updateTasksUI();
    updateHabitsUI();
    updateTodayStats();
    updateTimetable();
    
    if (AppState.currentView === 'weekly') {
        loadWeeklyView();
    } else if (AppState.currentView === 'analytics') {
        updateAnalytics();
    }
}

function updateDataStatus(message) {
    const status = document.getElementById('dataStatus');
    status.innerHTML = `<span>✅ ${message} • ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>`;
}

// ===== MODAL MANAGEMENT =====
function showModal(modalId) {
    document.getElementById(modalId).classList.remove('hidden');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Theme toggle
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    
    // Notification center
    document.getElementById('notificationBtn').addEventListener('click', function() {
        document.getElementById('notificationCenter').classList.toggle('hidden');
    });
    
    // Auto-save focus
    const focusInput = document.getElementById('focusInput');
    let focusTimeout;
    focusInput.addEventListener('input', function() {
        clearTimeout(focusTimeout);
        focusTimeout = setTimeout(saveFocus, 2000);
    });
    
    // Close modals on click outside
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.classList.add('hidden');
        }
    });
}

// ===== DATA STORAGE FUNCTIONS =====
function saveTasks() {
    localStorage.setItem('productivity-tasks', JSON.stringify(AppState.tasks));
}

function loadTasks() {
    const saved = localStorage.getItem('productivity-tasks');
    if (saved) {
        AppState.tasks = JSON.parse(saved);
    }
}

function saveHabits() {
    localStorage.setItem('productivity-habits', JSON.stringify(AppState.habits));
}

function loadHabits() {
    const saved = localStorage.getItem('productivity-habits');
    if (saved) {
        AppState.habits = JSON.parse(saved);
    }
}

function saveFocus() {
    const today = new Date().toDateString();
    localStorage.setItem(`focus-${today}`, document.getElementById('focusInput').value);
}

function loadFocus() {
    const today = new Date().toDateString();
    const saved = localStorage.getItem(`focus-${today}`);
    if (saved) {
        document.getElementById('focusInput').value = saved;
    }
}

function saveFocusHistory() {
    localStorage.setItem('focus-history', JSON.stringify(AppState.focusHistory));
}

function loadFocusHistory() {
    const saved = localStorage.getItem('focus-history');
    if (saved) {
        AppState.focusHistory = JSON.parse(saved);
    }
}

function saveGoals() {
    localStorage.setItem('productivity-goals', JSON.stringify(AppState.goals));
}

function loadGoals() {
    const saved = localStorage.getItem('productivity-goals');
    if (saved) {
        AppState.goals = JSON.parse(saved);
        updateGoalsUI();
    }
}

function saveNotifications() {
    localStorage.setItem('notifications', JSON.stringify(AppState.notifications));
}

function loadNotifications() {
    const saved = localStorage.getItem('notifications');
    if (saved) {
        AppState.notifications = JSON.parse(saved);
        updateNotificationUI();
    }
}

// ===== SCHEDULE DATA =====
const weekdaySchedule = [
    { start: 23, end: 6.5, activity: 'Sleep', category: 'sleep' },
    { start: 6.5, end: 6.67, activity: 'Wake up & stretch', category: 'personal' },
    { start: 6.67, end: 6.83, activity: 'Daily planning', category: 'personal' },
    { start: 6.83, end: 7.83, activity: 'Workout', category: 'fitness' },
    { start: 7.83, end: 8.33, activity: 'Breakfast & prep', category: 'meal' },
    { start: 8.33, end: 17, activity: 'Work', category: 'work' },
    { start: 17, end: 17.5, activity: 'Snack & decompress', category: 'meal' },
    { start: 17.5, end: 19, activity: 'Coding/Study', category: 'study' },
    { start: 19, end: 19.5, activity: 'Dinner', category: 'meal' },
    { start: 19.5, end: 20.5, activity: 'Guitar or Coding', category: 'music' },
    { start: 20.5, end: 22, activity: 'Study session', category: 'study' },
    { start: 22, end: 22.25, activity: 'Evening review', category: 'personal' },
    { start: 22.25, end: 23, activity: 'Wind down', category: 'personal' }
];

const weekendSchedule = [
    { start: 23, end: 7, activity: 'Sleep', category: 'sleep' },
    { start: 7, end: 7.25, activity: 'Wake up & plan', category: 'personal' },
    { start: 7.25, end: 8.25, activity: 'Workout', category: 'fitness' },
    { start: 8.25, end: 8.75, activity: 'Breakfast', category: 'meal' },
    { start: 9, end: 10.5, activity: 'Coding/Study', category: 'study' },
    { start: 10.5, end: 11, activity: 'Break', category: 'leisure' },
    { start: 11, end: 12.5, activity: 'Project work', category: 'study' },
    { start: 12.5, end: 13.5, activity: 'Lunch', category: 'meal' },
    { start: 13.5, end: 15.5, activity: 'Leisure time', category: 'leisure' },
    { start: 15.5, end: 16.5, activity: 'Guitar practice', category: 'music' },
    { start: 16.5, end: 18, activity: 'Errands & prep', category: 'personal' },
    { start: 18, end: 19, activity: 'Dinner', category: 'meal' },
    { start: 19, end: 21, activity: 'Social time', category: 'personal' },
    { start: 21, end: 21.5, activity: 'Weekly review', category: 'personal' },
    { start: 21.5, end: 23, activity: 'Wind down', category: 'personal' }
];

// ===== QUICK ACTIONS =====
function addQuickTask() {
    const quickTasks = [
        'Check email',
        'Review weekly goals',
        'Plan tomorrow',
        '10-minute meditation',
        'Drink water',
        'Stretch for 5 minutes'
    ];
    
    const task = quickTasks[Math.floor(Math.random() * quickTasks.length)];
    document.getElementById('newTaskInput').value = task;
    addTaskFromInput();
}

function startPomodoro() {
    addNotification('Pomodoro timer started - 25 minutes of focused work');
    // Could implement full Pomodoro timer here
}

function takeBreak() {
    addNotification('Take a 5-minute break. Stretch and hydrate!');
}

// ===== ANIMATION CSS =====
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
    }
    
    .toast {
        animation: slideInRight 0.3s ease;
    }
    
    .pulse {
        animation: pulse 2s infinite;
    }
`;
document.head.appendChild(style);
