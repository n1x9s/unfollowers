// ==UserScript==
// @name         Instagram Unfollowers Finder
// @namespace    https://instagram.com/
// @version      1.2
// @description  Найди тех, кто не подписан на тебя в ответ
// @author       You
// @match        https://www.instagram.com/*
// @icon         https://www.instagram.com/favicon.ico
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    const CONFIG = {
        DELAY_MS: 800,
        BATCH_SIZE: 50,
    };

    const styles = `
        /* Плавающая кнопка */
        .unf-fab {
            position: fixed;
            bottom: 24px;
            right: 24px;
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: linear-gradient(135deg, #833AB4, #C13584, #E1306C);
            border: none;
            cursor: pointer;
            box-shadow: 0 4px 16px rgba(131, 58, 180, 0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            transition: transform 0.2s, box-shadow 0.2s;
        }

        .unf-fab:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 20px rgba(131, 58, 180, 0.6);
        }

        .unf-fab:active {
            transform: scale(0.95);
        }

        .unf-fab svg {
            width: 24px;
            height: 24px;
            color: white;
        }

        .unf-fab-tooltip {
            position: absolute;
            right: 70px;
            background: #262626;
            color: white;
            padding: 8px 12px;
            border-radius: 8px;
            font-size: 14px;
            white-space: nowrap;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.2s;
        }

        .unf-fab:hover .unf-fab-tooltip {
            opacity: 1;
        }

        /* Модальное окно */
        .unf-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.65);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            backdrop-filter: blur(4px);
            animation: unf-fade-in 0.2s ease;
        }

        @keyframes unf-fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        .unf-modal {
            background: #262626;
            border-radius: 16px;
            width: 90%;
            max-width: 500px;
            max-height: 80vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            animation: unf-slide-up 0.3s ease;
            box-shadow: 0 20px 60px rgba(0,0,0,0.4);
        }

        @keyframes unf-slide-up {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }

        .unf-modal-header {
            padding: 16px 20px;
            border-bottom: 1px solid #363636;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .unf-modal-title {
            color: #f5f5f5;
            font-size: 16px;
            font-weight: 600;
            margin: 0;
        }

        .unf-close-btn {
            background: none;
            border: none;
            color: #a8a8a8;
            cursor: pointer;
            padding: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: background 0.2s;
        }

        .unf-close-btn:hover {
            background: #363636;
            color: #f5f5f5;
        }

        .unf-modal-body {
            padding: 20px;
            overflow-y: auto;
            flex: 1;
        }

        .unf-progress-section {
            margin-bottom: 20px;
        }

        .unf-progress-text {
            color: #a8a8a8;
            font-size: 14px;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .unf-spinner {
            width: 16px;
            height: 16px;
            border: 2px solid #363636;
            border-top-color: #0095f6;
            border-radius: 50%;
            animation: unf-spin 0.8s linear infinite;
        }

        @keyframes unf-spin {
            to { transform: rotate(360deg); }
        }

        .unf-progress-bar {
            height: 4px;
            background: #363636;
            border-radius: 2px;
            overflow: hidden;
        }

        .unf-progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #833AB4, #C13584);
            border-radius: 2px;
            transition: width 0.3s ease;
            width: 0%;
        }

        .unf-stats {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
            margin-bottom: 20px;
        }

        .unf-stat-card {
            background: #363636;
            padding: 16px;
            border-radius: 12px;
            text-align: center;
        }

        .unf-stat-value {
            color: #f5f5f5;
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 4px;
        }

        .unf-stat-label {
            color: #a8a8a8;
            font-size: 12px;
        }

        .unf-stat-card.highlight {
            background: linear-gradient(135deg, #833AB4, #C13584);
        }

        .unf-stat-card.highlight .unf-stat-label {
            color: rgba(255,255,255,0.8);
        }

        .unf-tabs {
            display: flex;
            gap: 4px;
            background: #1a1a1a;
            padding: 4px;
            border-radius: 10px;
            margin-bottom: 16px;
        }

        .unf-tab {
            flex: 1;
            padding: 10px;
            background: transparent;
            border: none;
            color: #a8a8a8;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            border-radius: 8px;
            transition: all 0.2s;
        }

        .unf-tab.active {
            background: #363636;
            color: #f5f5f5;
        }

        .unf-tab:hover:not(.active) {
            color: #f5f5f5;
        }

        .unf-list {
            max-height: 250px;
            overflow-y: auto;
            background: #1a1a1a;
            border-radius: 12px;
            padding: 8px;
        }

        .unf-list::-webkit-scrollbar {
            width: 6px;
        }

        .unf-list::-webkit-scrollbar-track {
            background: transparent;
        }

        .unf-list::-webkit-scrollbar-thumb {
            background: #363636;
            border-radius: 3px;
        }

        .unf-user-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px;
            border-radius: 8px;
            transition: background 0.2s;
            cursor: pointer;
            text-decoration: none;
        }

        .unf-user-item:hover {
            background: #262626;
        }

        .unf-user-avatar {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            object-fit: cover;
            background: #363636;
        }

        .unf-user-info {
            flex: 1;
            min-width: 0;
        }

        .unf-user-name {
            color: #f5f5f5;
            font-size: 14px;
            font-weight: 600;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .unf-user-fullname {
            color: #a8a8a8;
            font-size: 12px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .unf-verified {
            color: #0095f6;
            margin-left: 4px;
        }

        .unf-modal-footer {
            padding: 16px 20px;
            border-top: 1px solid #363636;
            display: flex;
            gap: 12px;
        }

        .unf-btn {
            flex: 1;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: opacity 0.2s;
            border: none;
            font-family: inherit;
        }

        .unf-btn:hover {
            opacity: 0.9;
        }

        .unf-btn-primary {
            background: #0095f6;
            color: white;
        }

        .unf-btn-secondary {
            background: #363636;
            color: #f5f5f5;
        }

        .unf-error {
            background: #3d1f1f;
            color: #ff6b6b;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 14px;
            margin-bottom: 16px;
        }

        .unf-empty {
            text-align: center;
            padding: 40px 20px;
            color: #a8a8a8;
        }

        .unf-empty-icon {
            font-size: 48px;
            margin-bottom: 12px;
        }
    `;

    // === УТИЛИТЫ ===
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    const getAppId = () => {
        for (const script of document.querySelectorAll('script')) {
            const m = script.textContent?.match(/"X-IG-App-ID":"(\d+)"/);
            if (m) return m[1];
        }
        return '936619743392459';
    };

    const getUserId = () => {
        for (const c of document.cookie.split(';')) {
            const [k, v] = c.trim().split('=');
            if (k === 'ds_user_id') return v;
        }
        return null;
    };

    const getCsrfToken = () => {
        for (const c of document.cookie.split(';')) {
            const [k, v] = c.trim().split('=');
            if (k === 'csrftoken') return v;
        }
        return '';
    };

    // === API ===
    async function fetchUsers(userId, type, cursor) {
        const url = new URL(`https://www.instagram.com/api/v1/friendships/${userId}/${type}/`);
        url.searchParams.set('count', CONFIG.BATCH_SIZE);
        if (cursor) url.searchParams.set('max_id', cursor);

        const res = await fetch(url, {
            headers: {
                'X-IG-App-ID': getAppId(),
                'X-CSRFToken': getCsrfToken(),
                'X-Requested-With': 'XMLHttpRequest',
            },
            credentials: 'include',
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    }

    async function getAllUsers(userId, type, onProgress) {
        const users = new Map();
        let cursor = null;

        while (true) {
            const data = await fetchUsers(userId, type, cursor);
            for (const u of (data.users || [])) {
                users.set(u.username, {
                    username: u.username,
                    full_name: u.full_name || '',
                    is_verified: u.is_verified || false,
                    profile_pic_url: u.profile_pic_url,
                });
            }
            onProgress(users.size);
            if (!data.next_max_id || !data.users?.length) break;
            cursor = data.next_max_id;
            await sleep(CONFIG.DELAY_MS);
        }
        return users;
    }

    // === UI ===
    function createFAB() {
        const fab = document.createElement('button');
        fab.className = 'unf-fab';
        fab.innerHTML = `
            <span class="unf-fab-tooltip">Unfollowers</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
        `;
        fab.addEventListener('click', openModal);
        return fab;
    }

    function createModal() {
        const overlay = document.createElement('div');
        overlay.className = 'unf-overlay';
        overlay.innerHTML = `
            <div class="unf-modal">
                <div class="unf-modal-header">
                    <h2 class="unf-modal-title">🔍 Анализ подписок</h2>
                    <button class="unf-close-btn">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
                <div class="unf-modal-body">
                    <div id="unf-content"></div>
                </div>
                <div class="unf-modal-footer" id="unf-footer" style="display: none;"></div>
            </div>
        `;
        overlay.querySelector('.unf-close-btn').addEventListener('click', closeModal);
        overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
        return overlay;
    }

    function renderLoading(el, text, pct) {
        el.innerHTML = `
            <div class="unf-progress-section">
                <div class="unf-progress-text">
                    <div class="unf-spinner"></div>
                    <span>${text}</span>
                </div>
                <div class="unf-progress-bar">
                    <div class="unf-progress-fill" style="width:${pct}%"></div>
                </div>
            </div>`;
    }

    function renderError(el, msg) {
        el.innerHTML = `
            <div class="unf-error">❌ ${msg}</div>
            <p style="color:#a8a8a8;text-align:center;">Попробуй обновить страницу</p>`;
    }

    function renderResults(content, footer, data) {
        const { followers, following, notFollowingBack, mutual, fans } = data;

        content.innerHTML = `
            <div class="unf-stats">
                <div class="unf-stat-card">
                    <div class="unf-stat-value">${followers.size}</div>
                    <div class="unf-stat-label">Подписчиков</div>
                </div>
                <div class="unf-stat-card">
                    <div class="unf-stat-value">${following.size}</div>
                    <div class="unf-stat-label">Подписок</div>
                </div>
                <div class="unf-stat-card">
                    <div class="unf-stat-value">${mutual.length}</div>
                    <div class="unf-stat-label">Взаимных</div>
                </div>
                <div class="unf-stat-card highlight">
                    <div class="unf-stat-value">${notFollowingBack.length}</div>
                    <div class="unf-stat-label">Не подписаны</div>
                </div>
            </div>
            <div class="unf-tabs">
                <button class="unf-tab active" data-tab="unfollowers">😒 Не подписаны (${notFollowingBack.length})</button>
                <button class="unf-tab" data-tab="fans">🌟 Фанаты (${fans.length})</button>
            </div>
            <div id="unf-tab-content"></div>`;

        const tabContent = content.querySelector('#unf-tab-content');
        const tabs = content.querySelectorAll('.unf-tab');

        const showTab = name => {
            tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === name));
            renderUserList(tabContent, name === 'unfollowers' ? notFollowingBack : fans);
        };

        tabs.forEach(t => t.addEventListener('click', () => showTab(t.dataset.tab)));
        showTab('unfollowers');

        footer.style.display = 'flex';
        footer.innerHTML = `
            <button class="unf-btn unf-btn-secondary" id="unf-copy-btn">📋 Копировать</button>
            <button class="unf-btn unf-btn-primary" id="unf-download-btn">📥 Скачать</button>`;

        footer.querySelector('#unf-copy-btn').onclick = () => {
            navigator.clipboard.writeText(notFollowingBack.map(u => '@' + u.username).join('\n'));
            footer.querySelector('#unf-copy-btn').textContent = '✓ Скопировано!';
            setTimeout(() => footer.querySelector('#unf-copy-btn').textContent = '📋 Копировать', 2000);
        };

        footer.querySelector('#unf-download-btn').onclick = () => downloadReport(data);
    }

    function renderUserList(el, users) {
        if (!users.length) {
            el.innerHTML = `<div class="unf-empty"><div class="unf-empty-icon">🎉</div><div>Список пуст!</div></div>`;
            return;
        }
        el.innerHTML = `<div class="unf-list"></div>`;
        const list = el.querySelector('.unf-list');
        users.forEach(u => {
            const a = document.createElement('a');
            a.className = 'unf-user-item';
            a.href = `https://www.instagram.com/${u.username}/`;
            a.target = '_blank';
            a.innerHTML = `
                <img class="unf-user-avatar" src="${u.profile_pic_url}" alt="" loading="lazy">
                <div class="unf-user-info">
                    <div class="unf-user-name">${u.username}${u.is_verified ? '<span class="unf-verified">✓</span>' : ''}</div>
                    ${u.full_name ? `<div class="unf-user-fullname">${u.full_name}</div>` : ''}
                </div>`;
            list.appendChild(a);
        });
    }

    function downloadReport(data) {
        const { followers, following, notFollowingBack, mutual, fans } = data;
        const txt = `Instagram Unfollowers Report
${new Date().toLocaleString()}
========================================

Подписчиков: ${followers.size}
Подписок: ${following.size}
Взаимных: ${mutual.length}
Не подписаны в ответ: ${notFollowingBack.length}
Фанаты: ${fans.length}

========================================
НЕ ПОДПИСАНЫ В ОТВЕТ (${notFollowingBack.length})
========================================
${notFollowingBack.map(u => `@${u.username}` + (u.full_name ? ` (${u.full_name})` : '')).join('\n')}

========================================
ФАНАТЫ (${fans.length})
========================================
${fans.map(u => `@${u.username}` + (u.full_name ? ` (${u.full_name})` : '')).join('\n')}`;

        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain;charset=utf-8' }));
        a.download = `instagram-unfollowers-${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
    }

    // === МОДАЛКА ===
    let modal = null;

    function openModal() {
        if (modal) return;
        modal = createModal();
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
        startAnalysis();
    }

    function closeModal() {
        if (modal) {
            modal.remove();
            modal = null;
            document.body.style.overflow = '';
        }
    }

    async function startAnalysis() {
        const content = document.getElementById('unf-content');
        const footer = document.getElementById('unf-footer');

        try {
            const userId = getUserId();
            if (!userId) throw new Error('Не удалось найти user_id. Убедись, что залогинен.');

            renderLoading(content, 'Загружаю подписчиков...', 10);
            const followers = await getAllUsers(userId, 'followers', n => renderLoading(content, `Подписчики: ${n}`, 30));

            await sleep(1500);
            renderLoading(content, 'Загружаю подписки...', 50);
            const following = await getAllUsers(userId, 'following', n => renderLoading(content, `Подписки: ${n}`, 70));

            renderLoading(content, 'Анализирую...', 90);
            await sleep(300);

            const notFollowingBack = [], mutual = [], fans = [];
            for (const [un, u] of following) (followers.has(un) ? mutual : notFollowingBack).push(u);
            for (const [un, u] of followers) if (!following.has(un)) fans.push(u);

            notFollowingBack.sort((a, b) => a.username.localeCompare(b.username));
            fans.sort((a, b) => a.username.localeCompare(b.username));

            renderResults(content, footer, { followers, following, notFollowingBack, mutual, fans });
        } catch (e) {
            renderError(content, e.message);
        }
    }

    // === INIT ===
    function init() {
        if (document.getElementById('unf-styles')) return;

        const style = document.createElement('style');
        style.id = 'unf-styles';
        style.textContent = styles;
        document.head.appendChild(style);

        document.body.appendChild(createFAB());
        console.log('[Unfollowers] ✅ Кнопка добавлена (правый нижний угол)');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(init, 500));
    } else {
        setTimeout(init, 500);
    }
})();