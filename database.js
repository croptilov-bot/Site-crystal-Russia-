// =========================================================
// database.js - Универсальная база данных форума
// Поддерживает несколько серверов с отдельными данными
// =========================================================

class ForumDatabase {
    constructor() {
        // Данные для каждого сервера
        this.servers = {
            crystal: {
                name: 'Crystal',
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
                notifications: []
            },
            russia: {
                name: 'Russia',
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
                notifications: []
            }
        };
        this.load();
        this.initDefaultData();
    }

    // Загрузка данных из localStorage
    load() {
        try {
            const saved = localStorage.getItem('forum_database_v2');
            if (saved) {
                const parsed = JSON.parse(saved);
                // Объединяем с дефолтной структурой
                for (const server in this.servers) {
                    if (parsed[server]) {
                        this.servers[server] = this.mergeDeep(this.servers[server], parsed[server]);
                    }
                }
            }
        } catch (e) {
            console.error('Ошибка загрузки базы данных:', e);
        }
    }

    // Сохранение данных в localStorage
    save() {
        try {
            localStorage.setItem('forum_database_v2', JSON.stringify(this.servers));
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
    // ПОЛУЧЕНИЕ ДАННЫХ СЕРВЕРА
    // =========================================================
    getServerData(server) {
        return this.servers[server] || this.servers.crystal;
    }

    // =========================================================
    // УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ
    // =========================================================
    getUser(server, username) {
        const data = this.getServerData(server);
        return data.users.find(u => u.username === username);
    }

    getUsers(server) {
        const data = this.getServerData(server);
        return data.users;
    }

    addUser(server, userData) {
        const data = this.getServerData(server);
        if (data.users.find(u => u.username === userData.username)) return false;
        data.users.push({
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

    updateUser(server, username, updates) {
        const data = this.getServerData(server);
        const user = data.users.find(u => u.username === username);
        if (!user) return false;
        Object.assign(user, updates);
        this.save();
        return true;
    }

    deleteUser(server, username) {
        const data = this.getServerData(server);
        data.users = data.users.filter(u => u.username !== username);
        this.save();
        return true;
    }

    setUserOnline(server, username, online) {
        const data = this.getServerData(server);
        const user = data.users.find(u => u.username === username);
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
    banUser(server, username, reason = 'Нарушение правил', admin = 'System') {
        const data = this.getServerData(server);
        if (data.banned.find(b => b.username === username)) return false;
        data.banned.push({ username, reason, admin, date: new Date().toISOString() });
        this.setUserOnline(server, username, false);
        this.save();
        return true;
    }

    unbanUser(server, username) {
        const data = this.getServerData(server);
        data.banned = data.banned.filter(b => b.username !== username);
        this.save();
        return true;
    }

    isBanned(server, username) {
        const data = this.getServerData(server);
        return data.banned.some(b => b.username === username);
    }

    getBannedUsers(server) {
        const data = this.getServerData(server);
        return data.banned;
    }

    // =========================================================
    // УПРАВЛЕНИЕ МУТАМИ
    // =========================================================
    muteUser(server, username, reason = 'Флуд', admin = 'System', duration = 3600) {
        const data = this.getServerData(server);
        if (data.muted.find(m => m.username === username)) return false;
        data.muted.push({
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

    unmuteUser(server, username) {
        const data = this.getServerData(server);
        data.muted = data.muted.filter(m => m.username !== username);
        this.save();
        return true;
    }

    isMuted(server, username) {
        const data = this.getServerData(server);
        const mute = data.muted.find(m => m.username === username);
        if (!mute) return false;
        if (new Date(mute.endDate) < new Date()) {
            this.unmuteUser(server, username);
            return false;
        }
        return true;
    }

    getMutedUsers(server) {
        const data = this.getServerData(server);
        return data.muted.filter(m => new Date(m.endDate) > new Date());
    }

    // =========================================================
    // УПРАВЛЕНИЕ РАЗРАБОТЧИКАМИ
    // =========================================================
    addDeveloper(server, username) {
        const data = this.getServerData(server);
        if (data.developers.includes(username)) return false;
        data.developers.push(username);
        const user = data.users.find(u => u.username === username);
        if (user) { user.role = 'developer';
            user.prefix = 'developer'; }
        this.save();
        return true;
    }

    removeDeveloper(server, username) {
        const data = this.getServerData(server);
        data.developers = data.developers.filter(d => d !== username);
        const user = data.users.find(u => u.username === username);
        if (user && user.role === 'developer') { user.role = 'user';
            user.prefix = 'user'; }
        this.save();
        return true;
    }

    isDeveloper(server, username) {
        const data = this.getServerData(server);
        return data.developers.includes(username);
    }

    getDevelopers(server) {
        const data = this.getServerData(server);
        return data.developers;
    }

    // =========================================================
    // УПРАВЛЕНИЕ КОНТЕНТОМ
    // =========================================================
    getContent(server, key) {
        const data = this.getServerData(server);
        return data.content[key] || 'Контент не добавлен.';
    }

    setContent(server, key, value) {
        const data = this.getServerData(server);
        data.content[key] = value;
        this.save();
        return true;
    }

    // =========================================================
    // УПРАВЛЕНИЕ ТЕМАМИ
    // =========================================================
    addTopic(server, topic) {
        const data = this.getServerData(server);
        const topics = data.topics || [];
        topic.id = topics.length > 0 ? Math.max(...topics.map(t => t.id)) + 1 : 1;
        topic.created = new Date().toISOString();
        data.topics.unshift(topic);
        this.save();
        return topic;
    }

    getTopics(server) {
        const data = this.getServerData(server);
        return data.topics || [];
    }

    deleteTopic(server, id) {
        const data = this.getServerData(server);
        data.topics = (data.topics || []).filter(t => t.id !== id);
        this.save();
        return true;
    }

    // =========================================================
    // УПРАВЛЕНИЕ НОВОСТЯМИ
    // =========================================================
    addNews(server, news) {
        const data = this.getServerData(server);
        const newsList = data.news || [];
        news.id = newsList.length > 0 ? Math.max(...newsList.map(n => n.id)) + 1 : 1;
        news.created = new Date().toISOString();
        data.news.unshift(news);
        this.save();
        return news;
    }

    getNews(server) {
        const data = this.getServerData(server);
        return data.news || [];
    }

    deleteNews(server, id) {
        const data = this.getServerData(server);
        data.news = (data.news || []).filter(n => n.id !== id);
        this.save();
        return true;
    }

    // =========================================================
    // УПРАВЛЕНИЕ ИВЕНТАМИ
    // =========================================================
    addEvent(server, event) {
        const data = this.getServerData(server);
        const events = data.events || [];
        event.id = events.length > 0 ? Math.max(...events.map(e => e.id)) + 1 : 1;
        event.created = new Date().toISOString();
        data.events.unshift(event);
        this.save();
        return event;
    }

    getEvents(server) {
        const data = this.getServerData(server);
        return data.events || [];
    }

    updateEvent(server, id, updates) {
        const data = this.getServerData(server);
        const events = data.events || [];
        const index = events.findIndex(e => e.id === id);
        if (index === -1) return false;
        Object.assign(events[index], updates);
        this.save();
        return true;
    }

    deleteEvent(server, id) {
        const data = this.getServerData(server);
        data.events = (data.events || []).filter(e => e.id !== id);
        this.save();
        return true;
    }

    // =========================================================
    // УПРАВЛЕНИЕ СООБЩЕНИЯМИ В ЧАТЕ
    // =========================================================
    addChatMessage(server, message) {
        const data = this.getServerData(server);
        const chat = data.chat || [];
        message.id = chat.length > 0 ? Math.max(...chat.map(m => m.id)) + 1 : 1;
        message.time = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        data.chat.push(message);
        this.save();
        return message;
    }

    getChatMessages(server) {
        const data = this.getServerData(server);
        return data.chat || [];
    }

    deleteChatMessage(server, id) {
        const data = this.getServerData(server);
        data.chat = (data.chat || []).filter(m => m.id !== id);
        this.save();
        return true;
    }

    clearChat(server) {
        const data = this.getServerData(server);
        data.chat = [];
        this.save();
        return true;
    }

    // =========================================================
    // УПРАВЛЕНИЕ ЖАЛОБАМИ
    // =========================================================
    addComplaint(server, type, complaint) {
        const data = this.getServerData(server);
        const complaints = data.complaints[type] || [];
        complaint.id = complaints.length > 0 ? Math.max(...complaints.map(c => c.id)) + 1 : 1;
        complaint.created = new Date().toISOString();
        data.complaints[type].unshift(complaint);
        this.save();
        return complaint;
    }

    getComplaints(server, type) {
        const data = this.getServerData(server);
        return data.complaints[type] || [];
    }

    updateComplaint(server, type, id, updates) {
        const data = this.getServerData(server);
        const index = data.complaints[type].findIndex(c => c.id === id);
        if (index === -1) return false;
        Object.assign(data.complaints[type][index], updates);
        this.save();
        return true;
    }

    deleteComplaint(server, type, id) {
        const data = this.getServerData(server);
        data.complaints[type] = data.complaints[type].filter(c => c.id !== id);
        this.save();
        return true;
    }

    // =========================================================
    // УПРАВЛЕНИЕ ЗАЯВЛЕНИЯМИ
    // =========================================================
    addApplication(server, type, application) {
        const data = this.getServerData(server);
        const apps = data.applications[type] || [];
        application.id = apps.length > 0 ? Math.max(...apps.map(a => a.id)) + 1 : 1;
        application.created = new Date().toISOString();
        data.applications[type].unshift(application);
        this.save();
        return application;
    }

    getApplications(server, type) {
        const data = this.getServerData(server);
        return data.applications[type] || [];
    }

    updateApplication(server, type, id, updates) {
        const data = this.getServerData(server);
        const index = data.applications[type].findIndex(a => a.id === id);
        if (index === -1) return false;
        Object.assign(data.applications[type][index], updates);
        this.save();
        return true;
    }

    deleteApplication(server, type, id) {
        const data = this.getServerData(server);
        data.applications[type] = data.applications[type].filter(a => a.id !== id);
        this.save();
        return true;
    }

    // =========================================================
    // УПРАВЛЕНИЕ УВЕДОМЛЕНИЯМИ
    // =========================================================
    addNotification(server, notification) {
        const data = this.getServerData(server);
        const notifs = data.notifications || [];
        notification.id = notifs.length > 0 ? Math.max(...notifs.map(n => n.id)) + 1 : 1;
        notification.created = new Date().toISOString();
        data.notifications.unshift(notification);
        this.save();
        return notification;
    }

    getNotifications(server) {
        const data = this.getServerData(server);
        return data.notifications || [];
    }

    markNotificationRead(server, id) {
        const data = this.getServerData(server);
        const notif = data.notifications.find(n => n.id === id);
        if (notif) { notif.read = true;
            this.save(); return true; }
        return false;
    }

    deleteNotification(server, id) {
        const data = this.getServerData(server);
        data.notifications = data.notifications.filter(n => n.id !== id);
        this.save();
        return true;
    }

    getUnreadNotifications(server) {
        const data = this.getServerData(server);
        return (data.notifications || []).filter(n => !n.read);
    }

    // =========================================================
    // СТАТИСТИКА
    // =========================================================
    getStats(server) {
        const data = this.getServerData(server);
        return {
            totalUsers: data.users.length,
            onlineUsers: data.users.filter(u => u.online).length,
            totalTopics: (data.topics || []).length,
            totalNews: (data.news || []).length,
            totalEvents: (data.events || []).length,
            totalChatMessages: (data.chat || []).length,
            totalBanned: data.banned.length,
            totalMuted: data.muted.length,
            totalDevelopers: data.developers.length,
            totalComplaints: Object.values(data.complaints).reduce((sum, arr) => sum + arr.length, 0),
            totalApplications: Object.values(data.applications).reduce((sum, arr) => sum + arr.length, 0),
            totalNotifications: (data.notifications || []).length
        };
    }

    // =========================================================
    // ИНИЦИАЛИЗАЦИЯ ДЕФОЛТНЫХ ДАННЫХ
    // =========================================================
    initDefaultData() {
        // Инициализация Crystal
        const crystal = this.servers.crystal;
        if (crystal.users.length === 0) {
            crystal.users = [
                { username: 'Admin', password: 'admin123', role: 'admin', prefix: 'admin', email: 'admin@crystal.ru',
                    avatar: '', bio: 'Главный администратор', online: true, registered: new Date().toISOString(),
                    lastSeen: new Date().toISOString() },
                { username: 'Artyom_Orlov', password: '123456', role: 'developer', prefix: 'developer',
                    email: 'artyom@crystal.ru', avatar: '', bio: 'Ведущий разработчик', online: true,
                    registered: new Date().toISOString(), lastSeen: new Date().toISOString() },
                { username: 'Игрок_228', password: '123456', role: 'user', prefix: 'user', email: '', avatar: '',
                    bio: '', online: true, registered: new Date().toISOString(), lastSeen: new Date().toISOString() }
            ];
            crystal.developers = ['Artyom_Orlov'];
            crystal.content = {
                rules: '## 📜 ПРАВИЛА ПРОЕКТА CRYSTAL RUSSIA\n\n### 1. Общие правила\n- Уважайте других игроков и администрацию\n- Запрещено использование читов и багов\n- Запрещен спам и оскорбления\n- Соблюдайте правила RP-отыгрыша\n\n### 2. Наказания\n- Предупреждение (3 раза)\n- Бан на 24 часа\n- Бан на 7 дней\n- Перманентный бан',
                guides: '## 📚 ГАЙДЫ И FAQ\n\n### 🚀 Как начать играть?\n1. Скачайте лаунчер\n2. Зарегистрируйтесь\n3. Установите игру\n4. Запустите лаунчер\n\n### 💼 Как устроиться на работу?\n1. Подойдите к зданию\n2. Нажмите взаимодействие\n3. Выберите профессию',
                lore: '## 🌍 ЛОР МИРА CRYSTAL RUSSIA\n\n### История штата\nШтат Сан-Андреас основан в 1848 году.\n\n### Основные фракции\n**LSPD** — полиция\n**FBI** — федералы\n**Government** — правительство',
                lspd: '## 👮 LSPD - ПОЛИЦИЯ ЛОС-САНТОСА\n\n### Устав\nПолиция Лос-Сантоса (LSPD) является главным органом правопорядка в городе.\n\n### Состав\n- Начальник полиции\n- Капитаны\n- Лейтенанты\n- Сержанты\n- Офицеры',
                government: '## 🏛️ GOVERNMENT - ПРАВИТЕЛЬСТВО ШТАТА\n\n### Функции\n- Регулирование экономики\n- Принятие законов\n- Социальная политика',
                mafia: '## 🔫 МАФИИ И БАНДЫ\n\n### Криминальные структуры\n\n**Мафия**\nОрганизованная преступность с четкой иерархией.\n\n**Банды**\nУличные группировки, контролирующие территории.',
                business: '## 🏪 БИЗНЕС И ОРГАНИЗАЦИИ\n\n### Легальный бизнес\n\n**Автосалоны**\nПродажа и покупка автомобилей\n\n**Клубы и бары**\nРазвлекательные заведения'
            };
            crystal.topics = [{
                id: 1,
                title: 'Добро пожаловать на CRYSTAL RUSSIA!',
                author: 'Admin',
                content: 'Приветствуем всех на нашем RP проекте!',
                date: new Date().toLocaleDateString('ru-RU') + ' ' + new Date().toLocaleTimeString('ru-RU', { hour: '2-digit',
                        minute: '2-digit' }),
                replies: 0,
                views: 0,
                status: 'pinned',
                tag: 'important'
            }];
            crystal.news = [{
                id: 1,
                title: 'Запуск CRYSTAL RUSSIA!',
                author: 'Admin',
                content: 'Добро пожаловать на наш новый RP проект!',
                images: [],
                date: new Date().toLocaleDateString('ru-RU') + ' ' + new Date().toLocaleTimeString('ru-RU', { hour: '2-digit',
                        minute: '2-digit' })
            }];
            crystal.events = [{
                id: 1,
                title: '🎉 Открытие сервера',
                author: 'Admin',
                desc: 'Грандиозное открытие с конкурсами и подарками',
                status: 'active',
                participants: 0,
                images: [],
                date: new Date().toLocaleDateString('ru-RU') + ' ' + new Date().toLocaleTimeString('ru-RU', { hour: '2-digit',
                        minute: '2-digit' })
            }];
        }

        // Инициализация Russia
        const russia = this.servers.russia;
        if (russia.users.length === 0) {
            russia.users = [
                { username: 'Admin', password: 'admin123', role: 'admin', prefix: 'admin', email: 'admin@russia.ru',
                    avatar: '', bio: 'Главный администратор', online: true, registered: new Date().toISOString(),
                    lastSeen: new Date().toISOString() },
                { username: 'Игрок_228', password: '123456', role: 'user', prefix: 'user', email: '', avatar: '',
                    bio: '', online: true, registered: new Date().toISOString(), lastSeen: new Date().toISOString() }
            ];
            russia.content = {
                rules: '## 📜 ПРАВИЛА ПРОЕКТА RUSSIA RP\n\n### 1. Общие правила\n- Уважайте других игроков\n- Запрещены читы\n- Соблюдайте RP',
                guides: '## 📚 ГАЙДЫ RUSSIA RP\n\n### Как начать?\n1. Скачайте лаунчер\n2. Зарегистрируйтесь\n3. Играйте!',
                lore: '## 🌍 ЛОР МИРА RUSSIA RP\n\n### История\nНовый RP проект с уникальной атмосферой.',
                lspd: '## 👮 LSPD RUSSIA\n\nИнформация о полиции.',
                government: '## 🏛️ GOVERNMENT RUSSIA\n\nИнформация о правительстве.',
                mafia: '## 🔫 МАФИИ RUSSIA\n\nИнформация о мафиях.',
                business: '## 🏪 БИЗНЕС RUSSIA\n\nИнформация о бизнесе.'
            };
            russia.topics = [{
                id: 1,
                title: 'Добро пожаловать на Russia RP!',
                author: 'Admin',
                content: 'Приветствуем всех на новом сервере!',
                date: new Date().toLocaleDateString('ru-RU') + ' ' + new Date().toLocaleTimeString('ru-RU', { hour: '2-digit',
                        minute: '2-digit' }),
                replies: 0,
                views: 0,
                status: '',
                tag: 'new'
            }];
            russia.news = [{
                id: 1,
                title: 'Открытие Russia RP!',
                author: 'Admin',
                content: 'Добро пожаловать на новый сервер!',
                images: [],
                date: new Date().toLocaleDateString('ru-RU') + ' ' + new Date().toLocaleTimeString('ru-RU', { hour: '2-digit',
                        minute: '2-digit' })
            }];
            russia.events = [{
                id: 1,
                title: '🎉 Открытие сервера',
                author: 'Admin',
                desc: 'Грандиозное открытие с конкурсами и подарками',
                status: 'upcoming',
                participants: 0,
                images: [],
                date: new Date().toLocaleDateString('ru-RU') + ' ' + new Date().toLocaleTimeString('ru-RU', { hour: '2-digit',
                        minute: '2-digit' })
            }];
        }

        this.save();
        console.log('✅ База данных инициализирована!');
    }

    // =========================================================
    // БЭКАП И ВОССТАНОВЛЕНИЕ
    // =========================================================
    backup() {
        return JSON.stringify(this.servers, null, 2);
    }

    restore(backupData) {
        try {
            const parsed = JSON.parse(backupData);
            for (const server in this.servers) {
                if (parsed[server]) {
                    this.servers[server] = this.mergeDeep(this.servers[server], parsed[server]);
                }
            }
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
}

// Создаем глобальный экземпляр
const DB = new ForumDatabase();

console.log('✅ База данных загружена!');
console.log('📊 Crystal:', DB.servers.crystal.users.length, 'пользователей');
console.log('📊 Russia:', DB.servers.russia.users.length, 'пользователей');