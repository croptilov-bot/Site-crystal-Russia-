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
                // Объединяем с дефолтными данными, чтобы не потерять структуру
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
            // Также сохраняем в отдельный файл для совместимости
            this.exportToFile();
        } catch (e) {
            console.error('Ошибка сохранения базы данных:', e);
        }
    }

    // Экспорт данных в файл (для скачивания)
    exportToFile() {
        try {
            const blob = new Blob([JSON.stringify(this.data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            // Сохраняем ссылку для скачивания
            window._dbExportUrl = url;
        } catch (e) {
            console.error('Ошибка экспорта данных:', e);
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
        // Делаем пользователя офлайн
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
        // Проверяем, не истек ли мут
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
        // Обновляем роль пользователя
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
        topic.id = this.data.topics.length + 1;
        topic.created = new Date().toISOString();
        this.data.topics.unshift(topic);
        this.save();
        return topic;
    }

    getTopics() {
        return this.data.topics;
    }

    deleteTopic(id) {
        this.data.topics = this.data.topics.filter(t => t.id !== id);
        this.save();
        return true;
    }

    // =========================================================
    // УПРАВЛЕНИЕ НОВОСТЯМИ
    // =========================================================
    
    addNews(news) {
        news.id = this.data.news.length + 1;
        news.created = new Date().toISOString();
        this.data.news.unshift(news);
        this.save();
        return news;
    }

    getNews() {
        return this.data.news;
    }

    deleteNews(id) {
        this.data.news = this.data.news.filter(n => n.id !== id);
        this.save();
        return true;
    }

    // =========================================================
    // УПРАВЛЕНИЕ СООБЩЕНИЯМИ В ЧАТЕ
    // =========================================================
    
    addChatMessage(message) {
        message.id = this.data.chat.length + 1;
        message.time = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        this.data.chat.push(message);
        this.save();
        return message;
    }

    getChatMessages() {
        return this.data.chat;
    }

    deleteChatMessage(id) {
        this.data.chat = this.data.chat.filter(m => m.id !== id);
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
        complaint.id = this.data.complaints[type].length + 1;
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
        application.id = this.data.applications[type].length + 1;
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
        notification.id = this.data.notifications.length + 1;
        notification.created = new Date().toISOString();
        this.data.notifications.unshift(notification);
        this.save();
        return notification;
    }

    getNotifications() {
        return this.data.notifications;
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

    // =========================================================
    // СТАТИСТИКА
    // =========================================================
    
    getStats() {
        return {
            totalUsers: this.data.users.length,
            onlineUsers: this.data.users.filter(u => u.online).length,
            totalTopics: this.data.topics.length,
            totalNews: this.data.news.length,
            totalChatMessages: this.data.chat.length,
            totalBanned: this.data.banned.length,
            totalMuted: this.data.muted.length,
            totalDevelopers: this.data.developers.length,
            totalComplaints: Object.values(this.data.complaints).reduce((sum, arr) => sum + arr.length, 0),
            totalApplications: Object.values(this.data.applications).reduce((sum, arr) => sum + arr.length, 0)
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
}

// Создаем глобальный экземпляр базы данных
const DB = new ForumDatabase();

// Экспортируем для использования
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ForumDatabase, DB };
}

console.log('✅ База данных загружена!');
console.log(`📊 Пользователей: ${DB.data.users.length}`);
console.log(`📊 Разработчиков: ${DB.data.developers.length}`);
console.log(`📊 Тем: ${DB.data.topics.length}`);
console.log(`📊 Сообщений в чате: ${DB.data.chat.length}`);