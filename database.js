// =========================================================
// database.js - Файл базы данных форума
// =========================================================

class ForumDatabase {
    constructor() {
        this.data = {
            users: [],
            banned: [],
            muted: [],
            developers: [],
            content: {},
            topics: [],
            news: [],
            events: [],
            chat: [],
            complaints: { player: [], admin: [], unban: [], questions: [] },
            applications: { admin: [], helper: [] },
            notifications: [],
            serverSettings: {
                name: 'Crystal',
                description: 'Основной RP сервер',
                online: 0
            }
        };
        this.load();
    }

    // Загрузка данных из localStorage
    load() {
        try {
            const saved = localStorage.getItem('forum_database');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.data = this.mergeDeep(this.data, parsed);
            }
        } catch (e) {
            console.error('Ошибка загрузки базы данных:', e);
        }
    }

    // Сохранение данных в localStorage
    save() {
        try {
            localStorage.setItem('forum_database', JSON.stringify(this.data));
        } catch (e) {
            console.error('Ошибка сохранения базы данных:', e);
        }
    }

    // Глубокое объединение объектов
    mergeDeep(target, source) {
        const result = { ...target };
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.mergeDeep(result[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        return result;
    }

    // =========================================================
    // УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ
    // =========================================================
    
    getUser(username) {
        return this.data.users.find(u => u.username === username);
    }

    getUsers() {
        return this.data.users;
    }

    addUser(userData) {
        if (this.getUser(userData.username)) {
            return false;
        }
        this.data.users.push({
            username: userData.username,
            password: userData.password,
            role: userData.role || 'user',
            prefix: userData.prefix || 'user',
            email: userData.email || '',
            avatar: userData.avatar || '',
            bio: userData.bio || '',
            online: true,
            registered: new Date().toISOString(),
            lastSeen: new Date().toISOString()
        });
        this.save();
        return true;
    }

    updateUser(username, updates) {
        const user = this.getUser(username);
        if (!user) return false;
        Object.assign(user, updates);
        this.save();
        return true;
    }

    deleteUser(username) {
        this.data.users = this.data.users.filter(u => u.username !== username);
        this.save();
        return true;
    }

    setUserOnline(username, online) {
        const user = this.getUser(username);
        if (user) {
            user.online = online;
            user.lastSeen = new Date().toISOString();
            this.save();
            return true;
        }
        return false;
    }

    // =========================================================
    // УПРАВЛЕНИЕ БАНАМИ
    // =========================================================
    
    banUser(username, reason = 'Нарушение правил', admin = 'System') {
        if (this.data.banned.find(b => b.username === username)) {
            return false;
        }
        this.data.banned.push({
            username,
            reason,
            admin,
            date: new Date().toISOString()
        });
        this.setUserOnline(username, false);
        this.save();
        return true;
    }

    unbanUser(username) {
        this.data.banned = this.data.banned.filter(b => b.username !== username);
        this.save();
        return true;
    }

    isBanned(username) {
        return this.data.banned.some(b => b.username === username);
    }

    getBannedUsers() {
        return this.data.banned;
    }

    // =========================================================
    // УПРАВЛЕНИЕ МУТАМИ
    // =========================================================
    
    muteUser(username, reason = 'Флуд', admin = 'System', duration = 3600) {
        if (this.data.muted.find(m => m.username === username)) {
            return false;
        }
        this.data.muted.push({
            username,
            reason,
            admin,
            duration,
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + duration * 1000).toISOString()
        });
        this.save();
        return true;
    }

    unmuteUser(username) {
        this.data.muted = this.data.muted.filter(m => m.username !== username);
        this.save();
        return true;
    }

    isMuted(username) {
        const mute = this.data.muted.find(m => m.username === username);
        if (!mute) return false;
        if (new Date(mute.endDate) < new Date()) {
            this.unmuteUser(username);
            return false;
        }
        return true;
    }

    getMutedUsers() {
        return this.data.muted.filter(m => new Date(m.endDate) > new Date());
    }

    // =========================================================
    // УПРАВЛЕНИЕ РАЗРАБОТЧИКАМИ
    // =========================================================
    
    addDeveloper(username) {
        if (this.data.developers.includes(username)) return false;
        this.data.developers.push(username);
        const user = this.getUser(username);
        if (user) {
            user.role = 'developer';
            user.prefix = 'developer';
        }
        this.save();
        return true;
    }

    removeDeveloper(username) {
        this.data.developers = this.data.developers.filter(d => d !== username);
        const user = this.getUser(username);
        if (user && user.role === 'developer') {
            user.role = 'user';
            user.prefix = 'user';
        }
        this.save();
        return true;
    }

    isDeveloper(username) {
        return this.data.developers.includes(username);
    }

    getDevelopers() {
        return this.data.developers;
    }

    // =========================================================
    // УПРАВЛЕНИЕ КОНТЕНТОМ
    // =========================================================
    
    getContent(key) {
        return this.data.content[key] || 'Контент не добавлен.';
    }

    setContent(key, value) {
        this.data.content[key] = value;
        this.save();
        return true;
    }

    // =========================================================
    // УПРАВЛЕНИЕ ТЕМАМИ
    // =========================================================
    
    addTopic(topic) {
        const topics = this.data.topics || [];
        topic.id = topics.length > 0 ? Math.max(...topics.map(t => t.id)) + 1 : 1;
        topic.created = new Date().toISOString();
        this.data.topics.unshift(topic);
        this.save();
        return topic;
    }

    getTopics() {
        return this.data.topics || [];
    }

    deleteTopic(id) {
        this.data.topics = (this.data.topics || []).filter(t => t.id !== id);
        this.save();
        return true;
    }

    // =========================================================
    // УПРАВЛЕНИЕ НОВОСТЯМИ
    // =========================================================
    
    addNews(news) {
        const newsList = this.data.news || [];
        news.id = newsList.length > 0 ? Math.max(...newsList.map(n => n.id)) + 1 : 1;
        news.created = new Date().toISOString();
        this.data.news.unshift(news);
        this.save();
        return news;
    }

    getNews() {
        return this.data.news || [];
    }

    deleteNews(id) {
        this.data.news = (this.data.news || []).filter(n => n.id !== id);
        this.save();
        return true;
    }

    // =========================================================
    // УПРАВЛЕНИЕ ИВЕНТАМИ
    // =========================================================
    
    addEvent(event) {
        const events = this.data.events || [];
        event.id = events.length > 0 ? Math.max(...events.map(e => e.id)) + 1 : 1;
        event.created = new Date().toISOString();
        this.data.events.unshift(event);
        this.save();
        return event;
    }

    getEvents() {
        return this.data.events || [];
    }

    updateEvent(id, updates) {
        const events = this.data.events || [];
        const index = events.findIndex(e => e.id === id);
        if (index === -1) return false;
        Object.assign(events[index], updates);
        this.save();
        return true;
    }

    deleteEvent(id) {
        this.data.events = (this.data.events || []).filter(e => e.id !== id);
        this.save();
        return true;
    }

    // =========================================================
    // УПРАВЛЕНИЕ СООБЩЕНИЯМИ В ЧАТЕ
    // =========================================================
    
    addChatMessage(message) {
        const chat = this.data.chat || [];
        message.id = chat.length > 0 ? Math.max(...chat.map(m => m.id)) + 1 : 1;
        message.time = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        this.data.chat.push(message);
        this.save();
        return message;
    }

    getChatMessages() {
        return this.data.chat || [];
    }

    deleteChatMessage(id) {
        this.data.chat = (this.data.chat || []).filter(m => m.id !== id);
        this.save();
        return true;
    }

    clearChat() {
        this.data.chat = [];
        this.save();
        return true;
    }

    // =========================================================
    // УПРАВЛЕНИЕ ЖАЛОБАМИ
    // =========================================================
    
    addComplaint(type, complaint) {
        const complaints = this.data.complaints[type] || [];
        complaint.id = complaints.length > 0 ? Math.max(...complaints.map(c => c.id)) + 1 : 1;
        complaint.created = new Date().toISOString();
        this.data.complaints[type].unshift(complaint);
        this.save();
        return complaint;
    }

    getComplaints(type) {
        return this.data.complaints[type] || [];
    }

    updateComplaint(type, id, updates) {
        const index = this.data.complaints[type].findIndex(c => c.id === id);
        if (index === -1) return false;
        Object.assign(this.data.complaints[type][index], updates);
        this.save();
        return true;
    }

    deleteComplaint(type, id) {
        this.data.complaints[type] = this.data.complaints[type].filter(c => c.id !== id);
        this.save();
        return true;
    }

    // =========================================================
    // УПРАВЛЕНИЕ ЗАЯВЛЕНИЯМИ
    // =========================================================
    
    addApplication(type, application) {
        const apps = this.data.applications[type] || [];
        application.id = apps.length > 0 ? Math.max(...apps.map(a => a.id)) + 1 : 1;
        application.created = new Date().toISOString();
        this.data.applications[type].unshift(application);
        this.save();
        return application;
    }

    getApplications(type) {
        return this.data.applications[type] || [];
    }

    updateApplication(type, id, updates) {
        const index = this.data.applications[type].findIndex(a => a.id === id);
        if (index === -1) return false;
        Object.assign(this.data.applications[type][index], updates);
        this.save();
        return true;
    }

    deleteApplication(type, id) {
        this.data.applications[type] = this.data.applications[type].filter(a => a.id !== id);
        this.save();
        return true;
    }

    // =========================================================
    // УПРАВЛЕНИЕ УВЕДОМЛЕНИЯМИ
    // =========================================================
    
    addNotification(notification) {
        const notifs = this.data.notifications || [];
        notification.id = notifs.length > 0 ? Math.max(...notifs.map(n => n.id)) + 1 : 1;
        notification.created = new Date().toISOString();
        this.data.notifications.unshift(notification);
        this.save();
        return notification;
    }

    getNotifications() {
        return this.data.notifications || [];
    }

    markNotificationRead(id) {
        const notif = this.data.notifications.find(n => n.id === id);
        if (notif) {
            notif.read = true;
            this.save();
            return true;
        }
        return false;
    }

    deleteNotification(id) {
        this.data.notifications = this.data.notifications.filter(n => n.id !== id);
        this.save();
        return true;
    }

    getUnreadNotifications() {
        return (this.data.notifications || []).filter(n => !n.read);
    }

    // =========================================================
    // СТАТИСТИКА
    // =========================================================
    
    getStats() {
        return {
            totalUsers: this.data.users.length,
            onlineUsers: this.data.users.filter(u => u.online).length,
            totalTopics: (this.data.topics || []).length,
            totalNews: (this.data.news || []).length,
            totalEvents: (this.data.events || []).length,
            totalChatMessages: (this.data.chat || []).length,
            totalBanned: this.data.banned.length,
            totalMuted: this.data.muted.length,
            totalDevelopers: this.data.developers.length,
            totalComplaints: Object.values(this.data.complaints).reduce((sum, arr) => sum + arr.length, 0),
            totalApplications: Object.values(this.data.applications).reduce((sum, arr) => sum + arr.length, 0),
            totalNotifications: (this.data.notifications || []).length
        };
    }

    // =========================================================
    // БЭКАП И ВОССТАНОВЛЕНИЕ
    // =========================================================
    
    backup() {
        return JSON.stringify(this.data, null, 2);
    }

    restore(backupData) {
        try {
            const parsed = JSON.parse(backupData);
            this.data = this.mergeDeep(this.data, parsed);
            this.save();
            return true;
        } catch (e) {
            console.error('Ошибка восстановления базы данных:', e);
            return false;
        }
    }

    downloadBackup() {
        const data = this.backup();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `forum_backup_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // =========================================================
    // ИНИЦИАЛИЗАЦИЯ ДЕФОЛТНЫХ ДАННЫХ
    // =========================================================
    
    initDefaultData() {
        if (this.data.users.length === 0) {
            this.addUser({ username: 'Admin', password: 'admin123', role: 'admin', prefix: 'admin', email: 'admin@crystal.ru' });
            this.addUser({ username: 'Artyom_Orlov', password: '123456', role: 'developer', prefix: 'developer', email: 'artyom@crystal.ru' });
            this.addUser({ username: 'Игрок_228', password: '123456', role: 'user', prefix: 'user' });
            this.addDeveloper('Artyom_Orlov');
            
            this.setContent('rules', '## 📜 ПРАВИЛА ПРОЕКТА CRYSTAL RUSSIA\n\n### 1. Общие правила\n- Уважайте других игроков и администрацию\n- Запрещено использование читов и багов\n- Запрещен спам и оскорбления\n- Соблюдайте правила RP-отыгрыша\n\n### 2. Наказания\n- Предупреждение (3 раза)\n- Бан на 24 часа\n- Бан на 7 дней\n- Перманентный бан');
            
            this.setContent('guides', '## 📚 ГАЙДЫ И FAQ\n\n### 🚀 Как начать играть?\n1. Скачайте лаунчер\n2. Зарегистрируйтесь\n3. Установите игру\n4. Запустите лаунчер\n\n### 💼 Как устроиться на работу?\n1. Подойдите к зданию\n2. Нажмите взаимодействие\n3. Выберите профессию');
            
            this.setContent('lore', '## 🌍 ЛОР МИРА CRYSTAL RUSSIA\n\n### История штата\nШтат Сан-Андреас основан в 1848 году.\n\n### Основные фракции\n**LSPD** — полиция\n**FBI** — федералы\n**Government** — правительство');
            
            this.setContent('lspd', '## 👮 LSPD - ПОЛИЦИЯ ЛОС-САНТОСА\n\n### Устав\nПолиция Лос-Сантоса (LSPD) является главным органом правопорядка в городе.\n\n### Состав\n- Начальник полиции\n- Капитаны\n- Лейтенанты\n- Сержанты\n- Офицеры');
            
            this.setContent('government', '## 🏛️ GOVERNMENT - ПРАВИТЕЛЬСТВО ШТАТА\n\n### Функции\n- Регулирование экономики\n- Принятие законов\n- Социальная политика\n\n### Структура\n- Губернатор\n- Сенат\n- Департаменты');
            
            this.setContent('mafia', '## 🔫 МАФИИ И БАНДЫ\n\n### Криминальные структуры\n\n**Мафия**\nОрганизованная преступность с четкой иерархией.\n\n**Банды**\nУличные группировки, контролирующие территории.');
            
            this.setContent('business', '## 🏪 БИЗНЕС И ОРГАНИЗАЦИИ\n\n### Легальный бизнес\n\n**Автосалоны**\nПродажа и покупка автомобилей\n\n**Клубы и бары**\nРазвлекательные заведения');
            
            this.addTopic({
                title: 'Добро пожаловать на CRYSTAL RUSSIA!',
                author: 'Admin',
                content: 'Приветствуем всех на нашем RP проекте!',
                date: new Date().toLocaleDateString('ru-RU') + ' ' + new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
                replies: 0,
                views: 0,
                status: 'pinned',
                tag: 'important'
            });
            
            this.addNews({
                title: 'Запуск CRYSTAL RUSSIA!',
                author: 'Admin',
                content: 'Добро пожаловать на наш новый RP проект!',
                images: []
            });
            
            this.addEvent({
                title: '🎉 Открытие сервера',
                author: 'Admin',
                desc: 'Грандиозное открытие с конкурсами и подарками',
                status: 'active',
                participants: 0,
                images: []
            });
            
            this.save();
            console.log('✅ Дефолтные данные инициализированы!');
        }
    }
}

// Создаем глобальный экземпляр базы данных
const DB = new ForumDatabase();
DB.initDefaultData();

console.log('✅ База данных загружена!');
console.log(`📊 Пользователей: ${DB.data.users.length}`);
console.log(`📊 Разработчиков: ${DB.data.developers.length}`);
console.log(`📊 Тем: ${DB.data.topics.length}`);
console.log(`📊 Сообщений в чате: ${DB.data.chat.length}`);