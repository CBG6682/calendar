let appData = {};
let audioPlayer = new Audio();
let currentSongIndex = 0;
let slideInterval;
let currentSlideIndex = 0;
const tooltip = document.getElementById('calendar-tooltip');

// 1. INIT
document.addEventListener('DOMContentLoaded', () => {
    fetch('config.json')
        .then(res => res.json())
        .then(data => {
            appData = data;
            initApp();
        })
        .catch(err => {
            console.error("Lỗi đọc JSON:", err);
            alert("Lỗi: Không tìm thấy file config.json! Hãy chạy trên Local Server.");
        });
});

function initApp() {
    renderHome();
    setupMusic();
    setupTheme(); 
    calculateNextEvent();
    checkDailyMood();
    initCalendar();
    startMemoriesSlideshow();
    renderTimetable('boy');
}

// 2. THEME SETUP
function setupTheme() {
    const themeBtn = document.getElementById('theme-btn');
    const themeIcon = themeBtn.querySelector('i');
    const body = document.body;
    const savedTheme = localStorage.getItem('loveNestTheme');
    if (savedTheme) {
        body.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme);
    }
    themeBtn.addEventListener('click', () => {
        const currentTheme = body.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        body.setAttribute('data-theme', newTheme);
        localStorage.setItem('loveNestTheme', newTheme);
        updateThemeIcon(newTheme);
    });
    function updateThemeIcon(theme) {
        if (theme === 'dark') {
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
        } else {
            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');
        }
    }
}

// 3. TAB SWITCHING
window.switchTab = function(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    const btnIndex = tabName === 'home' ? 0 : 1;
    document.querySelectorAll('.nav-btn')[btnIndex].classList.add('active');
    if (tabName === 'calendar' && window.calendarAPI) {
        setTimeout(() => window.calendarAPI.render(), 100);
    }
}

// 4. HOME & LOGIC
function renderHome() {
    if (!appData.couple) return;
    const couple = appData.couple;
    document.getElementById('name-boy').innerText = couple.boy_name;
    document.getElementById('name-girl').innerText = couple.girl_name;
    document.getElementById('img-boy').src = couple.avatar_boy;
    document.getElementById('img-girl').src = couple.avatar_girl;
    const start = new Date(couple.start_date);
    const now = new Date();
    const diff = Math.floor((now - start) / (1000 * 60 * 60 * 24));
    document.getElementById('days-count').innerText = diff;
}

function calculateNextEvent() {
    if (!appData.important_dates) return;
    const today = new Date();
    const currentYear = today.getFullYear();
    let events = appData.important_dates.map(evt => {
        let date = new Date(currentYear, evt.month - 1, evt.day);
        if (date < today) date.setFullYear(currentYear + 1);
        return { ...evt, fullDate: date };
    });
    events.sort((a, b) => a.fullDate - b.fullDate);
    const nextEvt = events[0];
    const diffTime = Math.ceil((nextEvt.fullDate - today) / (1000 * 60 * 60 * 24));
    document.getElementById('next-event-name').innerText = nextEvt.name;
    document.getElementById('next-event-days').innerText = diffTime === 0 ? "Hôm nay nè! 🎉" : `Còn ${diffTime} ngày`;
}

function checkDailyMood() {
    if (!appData.moods) return;
    const todayStr = new Date().toDateString();
    const savedDate = localStorage.getItem('moodDate');
    let index = localStorage.getItem('moodIndex');
    if (savedDate !== todayStr || index === null) {
        index = Math.floor(Math.random() * appData.moods.length);
        localStorage.setItem('moodDate', todayStr);
        localStorage.setItem('moodIndex', index);
    }
    const mood = appData.moods[index];
    document.getElementById('daily-mood-card').innerHTML = `<span class="mood-icon">${mood.icon}</span><div class="mood-text">${mood.text}</div>`;
}

// 5. SLIDESHOW
function startMemoriesSlideshow() {
    const memories = appData.memories;
    if (!memories || memories.length === 0) return;
    const imgEl = document.getElementById('slide-img');
    const titleEl = document.getElementById('slide-title');
    const dateEl = document.getElementById('slide-date');
    const descEl = document.getElementById('slide-desc');
    const showSlide = (i) => {
        const mem = memories[i];
        imgEl.classList.add('hidden');
        setTimeout(() => {
            imgEl.src = mem.image;
            titleEl.innerText = mem.title;
            dateEl.innerText = mem.date;
            descEl.innerText = mem.desc;
            imgEl.classList.remove('hidden');
        }, 800);
    };
    showSlide(0);
    slideInterval = setInterval(() => {
        currentSlideIndex = (currentSlideIndex + 1) % memories.length;
        showSlide(currentSlideIndex);
    }, 5000);
}

// 6. CALENDAR & TOOLTIP (FIXED FOR MOBILE)
function initCalendar() {
    if (!appData.important_dates) return;
    const calendarEl = document.getElementById('calendar');
    const currentYear = new Date().getFullYear();
    const events = [];
    appData.important_dates.forEach(evt => {
        const desc = evt.desc ? evt.desc : "Ngày đặc biệt!";
        [currentYear, currentYear + 1].forEach(year => {
            events.push({
                title: '❤️ ' + evt.name,
                start: `${year}-${String(evt.month).padStart(2,'0')}-${String(evt.day).padStart(2,'0')}`,
                color: '#c06c84',
                extendedProps: { description: desc }
            });
        });
    });

    window.calendarAPI = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: { left: 'prev', center: 'title', right: 'next' },
        height: 'auto',
        events: events,
        locale: 'vi',
        eventMouseEnter: function(info) {
            if (window.innerWidth > 768) { 
                showTooltipContent(info.event);
                moveTooltip(info.jsEvent);
            }
        },
        eventMouseLeave: function(info) {
            if (window.innerWidth > 768) tooltip.style.display = 'none';
        },
        eventClick: function(info) {
            info.jsEvent.preventDefault(); 
            showTooltipContent(info.event);
            tooltip.style.display = 'block';
            tooltip.style.top = ''; tooltip.style.left = ''; // Reset for mobile fixed
        }
    });
    window.calendarAPI.render();
}

function showTooltipContent(event) {
    let content = `<strong>${event.title}</strong><br>`;
    if (event.extendedProps.description) {
        content += `<span style="display:block; margin-top:5px; font-size:0.9em">${event.extendedProps.description}</span>`;
    }
    if (window.innerWidth <= 768) {
        content += `<div style="margin-top:10px; font-size:0.7em; opacity:0.7; border-top:1px solid #555; padding-top:5px;">(Chạm ra ngoài để đóng)</div>`;
    }
    tooltip.innerHTML = content;
}

function moveTooltip(e) {
    if (window.innerWidth <= 768) return;
    if(tooltip.style.display === 'block') {
        tooltip.style.left = (e.clientX - tooltip.offsetWidth / 2) + 'px';
        tooltip.style.top = (e.clientY - tooltip.offsetHeight - 15) + 'px';
    }
}
document.addEventListener('mousemove', (e) => moveTooltip(e));
document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768 && tooltip.style.display === 'block') {
        if (!tooltip.contains(e.target) && !e.target.closest('.fc-event')) {
            tooltip.style.display = 'none';
        }
    }
});

// 7. TIMETABLE
window.renderTimetable = function(person) {
    if (!appData.timetables) return;
    const btnBoy = document.getElementById('btn-schedule-boy');
    const btnGirl = document.getElementById('btn-schedule-girl');
    if (person === 'boy') {
        btnBoy.classList.add('active'); btnGirl.classList.remove('active');
    } else {
        btnGirl.classList.add('active'); btnBoy.classList.remove('active');
    }
    const rawData = appData.timetables[person].schedule;
    let groupedData = {};
    let dayOrder = []; 
    rawData.forEach(item => {
        if (!groupedData[item.day]) {
            groupedData[item.day] = []; dayOrder.push(item.day);
        }
        groupedData[item.day].push(item);
    });
    const listEl = document.getElementById('schedule-list');
    let html = '';
    dayOrder.forEach((day) => {
        const tasks = groupedData[day];
        const hasMultiple = tasks.length > 1;
        let tasksHtml = tasks.map((t, i) => `
            <div class="task-slide ${i === 0 ? 'active' : ''}" data-index="${i}">
                <span class="task-time">${t.time}</span> <span class="task-desc">${t.task}</span>
            </div>`).join('');
        let navHtml = hasMultiple ? `<button class="nav-mini-btn" onclick="changeTask('${day}', -1)"><i class="fa-solid fa-chevron-left"></i></button><button class="nav-mini-btn" onclick="changeTask('${day}', 1)"><i class="fa-solid fa-chevron-right"></i></button>` : '';
        html += `<div class="schedule-item" id="row-${day}"><div class="col-day">${day}${hasMultiple ? `<br><small style="font-size:0.6rem; color:var(--text-sub)">(${tasks.length} việc)</small>` : ''}</div><div class="col-content" id="content-${day}">${tasksHtml}</div><div class="col-nav">${navHtml}</div></div>`;
    });
    listEl.innerHTML = html;
    document.getElementById('schedule-note-text').innerText = appData.timetables[person].note;
}
window.changeTask = function(dayKey, direction) {
    const container = document.getElementById(`content-${dayKey}`);
    const slides = container.getElementsByClassName('task-slide');
    let activeIndex = 0;
    for(let i=0; i < slides.length; i++) {
        if(slides[i].classList.contains('active')) {
            activeIndex = i; slides[i].classList.remove('active'); break;
        }
    }
    let newIndex = activeIndex + direction;
    if (newIndex >= slides.length) newIndex = 0;
    if (newIndex < 0) newIndex = slides.length - 1;
    slides[newIndex].classList.add('active');
}

// 8. MUSIC
function setupMusic() {
    const btn = document.getElementById('music-btn');
    const playSong = () => {
        if(!appData.playlist || !appData.playlist.length) return;
        // Lưu ý: Cần tạo thư mục assets/audio/ và bỏ nhạc vào
        audioPlayer.src = `assets/audio/${appData.playlist[currentSongIndex]}`;
        audioPlayer.play().catch(e => console.log("Cần tương tác người dùng để phát nhạc"));
        btn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    };
    btn.addEventListener('click', () => {
        if(audioPlayer.paused) playSong();
        else {
            audioPlayer.pause();
            btn.innerHTML = '<i class="fa-solid fa-music"></i>';
        }
    });
    audioPlayer.addEventListener('ended', () => {
        currentSongIndex = (currentSongIndex + 1) % appData.playlist.length;
        playSong();
    });
}
