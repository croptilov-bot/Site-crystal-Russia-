// =========================================================
// БУРГЕР-МЕНЮ
// =========================================================
function toggleMenu() {
    const menu = document.getElementById('burgerMenu');
    const overlay = document.getElementById('burgerOverlay');
    const icon = document.getElementById('burgerIcon');
    
    menu.classList.toggle('open');
    overlay.classList.toggle('active');
    icon.classList.toggle('active');
    document.body.style.overflow = menu.classList.contains('open') ? 'hidden' : '';
}

// Закрытие меню при клике на ссылку
document.querySelectorAll('.burger-nav a').forEach(link => {
    link.addEventListener('click', () => {
        const menu = document.getElementById('burgerMenu');
        const overlay = document.getElementById('burgerOverlay');
        const icon = document.getElementById('burgerIcon');
        
        menu.classList.remove('open');
        overlay.classList.remove('active');
        icon.classList.remove('active');
        document.body.style.overflow = '';
    });
});

// Закрытие по оверлею
document.getElementById('burgerOverlay').addEventListener('click', toggleMenu);

// =========================================================
// ОНЛАЙН (симуляция)
// =========================================================
function updateOnline() {
    const online = Math.floor(Math.random() * 150) + 50;
    const onlineElements = document.querySelectorAll('#onlineCount, #serverOnline');
    onlineElements.forEach(el => {
        if (el) el.textContent = online;
    });
    
    const pingEl = document.getElementById('serverPing');
    if (pingEl) pingEl.textContent = Math.floor(Math.random() * 30) + 10 + ' мс';
    
    const uptimeEl = document.getElementById('serverUptime');
    if (uptimeEl) uptimeEl.textContent = Math.floor(Math.random() * 30) + 1 + ' дней';
}

updateOnline();
setInterval(updateOnline, 10000);

// =========================================================
// ПЛАВНАЯ ПРОКРУТКА ДЛЯ ЯКОРНЫХ ССЫЛОК
// =========================================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (href === '#') return;
        
        const target = document.querySelector(href);
        if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// =========================================================
// АКТИВНАЯ ССЫЛКА В МЕНЮ (подсветка текущей страницы)
// =========================================================
document.querySelectorAll('.burger-nav a').forEach(link => {
    if (link.href === window.location.href) {
        link.style.color = '#ff7f17';
        link.style.background = 'rgba(255, 127, 23, 0.1)';
    }
});

console.log('❄️ CRYSTAL RUSSIA — сайт загружен!');