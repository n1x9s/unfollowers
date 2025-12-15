// ==UserScript==
// @name         Instagram Unfollowers Finder + Mass Unfollow
// @namespace    https://instagram.com/
// @version      2.0
// @description  Найди тех, кто не подписан на тебя в ответ + массовая отписка
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
        UNFOLLOW_DELAY_MS: 2000, // Пауза между отписками (безопасно)
        BATCH_SIZE: 50,
    };

    // Хранилище исключений
    let excludedUsers = new Set();
    let analysisResults = null;

    const styles = `
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
        .unf-fab:active { transform: scale(0.95); }
        .unf-fab svg { width: 24px; height: 24px; color: white; }
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
        .unf-fab:hover .unf-fab-tooltip { opacity: 1; }
        .unf-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.65);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            backdrop-filter: blur(4px);
            animation: unf-fade-in 0.2s ease;
        }
        @keyframes unf-fade-in { from { opacity: 0; } to { opacity: 1; } }
        .unf-modal {
            background: #262626;
            border-radius: 16px;
            width: 90%;
            max-width: 550px;
            max-height: 85vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            animation: unf-slide-up 0.3s ease;
            box-shadow: 0 20px 60px rgba(0,0,0,0.4);
        }
        @keyframes unf-slide-up { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .unf-modal-header {
            padding: 16px 20px;
            border-bottom: 1px solid #363636;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .unf-modal-title { color: #f5f5f5; font-size: 16px; font-weight: 600; margin: 0; }
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
        .unf-close-btn:hover { background: #363636; color: #f5f5f5; }
        .unf-modal-body { padding: 20px; overflow-y: auto; flex: 1; }
        .unf-progress-section { margin-bottom: 20px; }
        .unf-progress-text { color: #a8a8a8; font-size: 14px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
        .unf-spinner {
            width: 16px; height: 16px;
            border: 2px solid #363636;
            border-top-color: #0095f6;
            border-radius: 50%;
            animation: unf-spin 0.8s linear infinite;
        }
        @keyframes unf-spin { to { transform: rotate(360deg); } }
        .unf-progress-bar { height: 4px; background: #363636; border-radius: 2px; overflow: hidden; }
        .unf-progress-fill { height: 100%; background: linear-gradient(90deg, #833AB4, #C13584); border-radius: 2px; transition: width 0.3s ease; width: 0%; }
        .unf-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 20px; }
        .unf-stat-card { background: #363636; padding: 16px; border-radius: 12px; text-align: center; }
        .unf-stat-value { color: #f5f5f5; font-size: 24px; font-weight: 700; margin-bottom: 4px; }
        .unf-stat-label { color: #a8a8a8; font-size: 12px; }
        .unf-stat-card.highlight { background: linear-gradient(135deg, #833AB4, #C13584); }
        .unf-stat-card.highlight .unf-stat-label { color: rgba(255,255,255,0.8); }
        .unf-tabs { display: flex; gap: 4px; background: #1a1a1a; padding: 4px; border-radius: 10px; margin-bottom: 16px; }
        .unf-tab {
            flex: 1; padding: 10px;
            background: transparent; border: none;
            color: #a8a8a8; font-size: 13px; font-weight: 600;
            cursor: pointer; border-radius: 8px; transition: all 0.2s;
        }
        .unf-tab.active { background: #363636; color: #f5f5f5; }
        .unf-tab:hover:not(.active) { color: #f5f5f5; }
        .unf-list { max-height: 300px; overflow-y: auto; background: #1a1a1a; border-radius: 12px; padding: 8px; }
        .unf-list::-webkit-scrollbar { width: 6px; }
        .unf-list::-webkit-scrollbar-track { background: transparent; }
        .unf-list::-webkit-scrollbar-thumb { background: #363636; border-radius: 3px; }
        .unf-user-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px;
            border-radius: 8px;
            transition: background 0.2s;
            cursor: pointer;
            text-decoration: none;
            position: relative;
        }
        .unf-user-item:hover { background: #262626; }
        .unf-user-item.excluded { opacity: 0.5; }
        .unf-user-item.excluded::after {
            content: '✓ Сохранён';
            position: absolute;
            right: 10px;
            color: #00d26a;
            font-size: 12px;
            font-weight: 600;
        }
        .unf-user-avatar { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; background: #363636; }
        .unf-user-info { flex: 1; min-width: 0; }
        .unf-user-name { color: #f5f5f5; font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .unf-user-fullname { color: #a8a8a8; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .unf-verified { color: #0095f6; margin-left: 4px; }
        .unf-user-actions { display: flex; gap: 8px; }
        .unf-exclude-btn {
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            border: none;
            transition: all 0.2s;
        }
        .unf-exclude-btn.exclude { background: #363636; color: #f5f5f5; }
        .unf-exclude-btn.exclude:hover { background: #00d26a; color: #000; }
        .unf-exclude-btn.include { background: #00d26a; color: #000; }
        .unf-exclude-btn.include:hover { background: #363636; color: #f5f5f5; }
        .unf-modal-footer { padding: 16px 20px; border-top: 1px solid #363636; display: flex; gap: 12px; flex-wrap: wrap; }
        .unf-btn {
            flex: 1;
            min-width: 120px;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            border: none;
            font-family: inherit;
        }
        .unf-btn:hover { opacity: 0.9; }
        .unf-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .unf-btn-primary { background: #0095f6; color: white; }
        .unf-btn-secondary { background: #363636; color: #f5f5f5; }
        .unf-btn-danger { background: #ed4956; color: white; }
        .unf-btn-danger:hover { background: #ff6b6b; }
        .unf-error { background: #3d1f1f; color: #ff6b6b; padding: 12px 16px; border-radius: 8px; font-size: 14px; margin-bottom: 16px; }
        .unf-empty { text-align: center; padding: 40px 20px; color: #a8a8a8; }
        .unf-empty-icon { font-size: 48px; margin-bottom: 12px; }
        .unf-warning {
            background: #3d3520;
            color: #ffc107;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 13px;
            margin-bottom: 16px;
            line-height: 1.5;
        }
        .unf-info-bar {
            background: #1a1a1a;
            padding: 12px 16px;
            border-radius: 8px;
            margin-bottom: 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 14px;
            color: #a8a8a8;
        }
        .unf-info-bar strong { color: #f5f5f5; }
        .unf-select-all-btn {
            padding: 6px 12px;
            background: #363636;
            border: none;
            border-radius: 6px;
            color: #f5f5f5;
            font-size: 12px;
            cursor: pointer;
            transition: background 0.2s;
        }
        .unf-select-all-btn:hover { background: #4a4a4a; }
        .unf-confirm-list {
            max-height: 200px;
            overflow-y: auto;
            background: #1a1a1a;
            border-radius: 8px;
            padding: 12px;
            margin: 16px 0;
            font-size: 13px;
            color: #a8a8a8;
        }
        .unf-unfollow-progress {
            text-align: center;
            padding: 20px;
        }
        .unf-unfollow-progress .unf-stat-value {
            font-size: 48px;
            margin-bottom: 8px;
        }
        .unf-unfollow-progress .current-user {
            color: #a8a8a8;
            font-size: 14px;
            margin-top: 16px;
        }
    `;

    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const getAppId = () => { for (const s of document.querySelectorAll('script')) { const m = s.textContent?.match(/"X-IG-App-ID":"(\d+)"/); if (m) return m[1]; } return '936619743392459'; };
    const getUserId = () => { for (const c of document.cookie.split(';')) { const [k, v] = c.trim().split('='); if (k === 'ds_user_id') return v; } return null; };
    const getCsrfToken = () => { for (const c of document.cookie.split(';')) { const [k, v] = c.trim().split('='); if (k === 'csrftoken') return v; } return ''; };

    async function fetchUsers(userId, type, cursor) {
        const url = new URL(`https://www.instagram.com/api/v1/friendships/${userId}/${type}/`);
        url.searchParams.set('count', CONFIG.BATCH_SIZE);
        if (cursor) url.searchParams.set('max_id', cursor);
        const res = await fetch(url, { headers: { 'X-IG-App-ID': getAppId(), 'X-CSRFToken': getCsrfToken(), 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    }

    async function getAllUsers(userId, type, onProgress) {
        const users = new Map();
        let cursor = null;
        while (true) {
            const data = await fetchUsers(userId, type, cursor);
            for (const u of (data.users || [])) users.set(u.username, { id: u.pk || u.id, username: u.username, full_name: u.full_name || '', is_verified: u.is_verified || false, profile_pic_url: u.profile_pic_url });
            onProgress(users.size);
            if (!data.next_max_id || !data.users?.length) break;
            cursor = data.next_max_id;
            await sleep(CONFIG.DELAY_MS);
        }
        return users;
    }

    // Отписка от пользователя
    async function unfollowUser(userId) {
        const res = await fetch(`https://www.instagram.com/api/v1/friendships/destroy/${userId}/`, {
            method: 'POST',
            headers: {
                'X-IG-App-ID': getAppId(),
                'X-CSRFToken': getCsrfToken(),
                'X-Requested-With': 'XMLHttpRequest',
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            credentials: 'include',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    }

    function createFAB() {
        const fab = document.createElement('button');
        fab.className = 'unf-fab';
        fab.innerHTML = `<span class="unf-fab-tooltip">Unfollowers</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
        fab.addEventListener('click', openModal);
        return fab;
    }

    function createModal() {
        const overlay = document.createElement('div');
        overlay.className = 'unf-overlay';
        overlay.innerHTML = `<div class="unf-modal"><div class="unf-modal-header"><h2 class="unf-modal-title">🔍 Анализ подписок</h2><button class="unf-close-btn"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button></div><div class="unf-modal-body"><div id="unf-content"></div></div><div class="unf-modal-footer" id="unf-footer" style="display: none;"></div></div>`;
        overlay.querySelector('.unf-close-btn').addEventListener('click', closeModal);
        overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
        return overlay;
    }

    function renderLoading(el, text, pct) { el.innerHTML = `<div class="unf-progress-section"><div class="unf-progress-text"><div class="unf-spinner"></div><span>${text}</span></div><div class="unf-progress-bar"><div class="unf-progress-fill" style="width:${pct}%"></div></div></div>`; }
    function renderError(el, msg) { el.innerHTML = `<div class="unf-error">❌ ${msg}</div><p style="color:#a8a8a8;text-align:center;">Попробуй обновить страницу</p>`; }

    function renderResults(content, footer, data) {
        analysisResults = data;
        const { followers, following, notFollowingBack, mutual, fans } = data;

        content.innerHTML = `
            <div class="unf-stats">
                <div class="unf-stat-card"><div class="unf-stat-value">${followers.size}</div><div class="unf-stat-label">Подписчиков</div></div>
                <div class="unf-stat-card"><div class="unf-stat-value">${following.size}</div><div class="unf-stat-label">Подписок</div></div>
                <div class="unf-stat-card"><div class="unf-stat-value">${mutual.length}</div><div class="unf-stat-label">Взаимных</div></div>
                <div class="unf-stat-card highlight"><div class="unf-stat-value">${notFollowingBack.length}</div><div class="unf-stat-label">Не подписаны</div></div>
            </div>
            <div class="unf-tabs">
                <button class="unf-tab active" data-tab="unfollowers">😒 Не подписаны (${notFollowingBack.length})</button>
                <button class="unf-tab" data-tab="fans">🌟 Фанаты (${fans.length})</button>
            </div>
            <div class="unf-info-bar">
                <span>Сохранено: <strong id="excluded-count">${excludedUsers.size}</strong> чел.</span>
                <button class="unf-select-all-btn" id="exclude-all-btn">Сохранить всех</button>
            </div>
            <div id="unf-tab-content"></div>`;

        const tabContent = content.querySelector('#unf-tab-content');
        const tabs = content.querySelectorAll('.unf-tab');
        const excludedCountEl = content.querySelector('#excluded-count');

        const updateExcludedCount = () => {
            excludedCountEl.textContent = excludedUsers.size;
        };

        const showTab = name => {
            tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === name));
            renderUserListWithExclude(tabContent, name === 'unfollowers' ? notFollowingBack : fans, updateExcludedCount);
        };

        tabs.forEach(t => t.addEventListener('click', () => showTab(t.dataset.tab)));

        content.querySelector('#exclude-all-btn').addEventListener('click', () => {
            const allExcluded = notFollowingBack.every(u => excludedUsers.has(u.username));
            if (allExcluded) {
                notFollowingBack.forEach(u => excludedUsers.delete(u.username));
            } else {
                notFollowingBack.forEach(u => excludedUsers.add(u.username));
            }
            showTab('unfollowers');
            updateExcludedCount();
        });

        showTab('unfollowers');

        footer.style.display = 'flex';
        footer.innerHTML = `
            <button class="unf-btn unf-btn-secondary" id="unf-copy-btn">📋 Копировать</button>
            <button class="unf-btn unf-btn-secondary" id="unf-download-btn">📥 Скачать</button>
            <button class="unf-btn unf-btn-danger" id="unf-mass-unfollow-btn">🚫 Отписаться</button>`;

        footer.querySelector('#unf-copy-btn').onclick = () => {
            const toUnfollow = notFollowingBack.filter(u => !excludedUsers.has(u.username));
            navigator.clipboard.writeText(toUnfollow.map(u => '@' + u.username).join('\n'));
            footer.querySelector('#unf-copy-btn').textContent = '✓ Скопировано!';
            setTimeout(() => footer.querySelector('#unf-copy-btn').textContent = '📋 Копировать', 2000);
        };

        footer.querySelector('#unf-download-btn').onclick = () => downloadReport(data);
        footer.querySelector('#unf-mass-unfollow-btn').onclick = () => showUnfollowConfirmation(content, footer, data);
    }

    function renderUserListWithExclude(el, users, onUpdate) {
        if (!users.length) {
            el.innerHTML = `<div class="unf-empty"><div class="unf-empty-icon">🎉</div><div>Список пуст!</div></div>`;
            return;
        }
        el.innerHTML = `<div class="unf-list"></div>`;
        const list = el.querySelector('.unf-list');

        users.forEach(u => {
            const isExcluded = excludedUsers.has(u.username);
            const item = document.createElement('div');
            item.className = `unf-user-item ${isExcluded ? 'excluded' : ''}`;
            item.innerHTML = `
                <img class="unf-user-avatar" src="${u.profile_pic_url}" alt="" loading="lazy">
                <div class="unf-user-info">
                    <div class="unf-user-name">${u.username}${u.is_verified ? '<span class="unf-verified">✓</span>' : ''}</div>
                    ${u.full_name ? `<div class="unf-user-fullname">${u.full_name}</div>` : ''}
                </div>
                <div class="unf-user-actions">
                    <button class="unf-exclude-btn ${isExcluded ? 'include' : 'exclude'}">
                        ${isExcluded ? '↩️ Вернуть' : '💾 Сохранить'}
                    </button>
                </div>`;

            const btn = item.querySelector('.unf-exclude-btn');
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (excludedUsers.has(u.username)) {
                    excludedUsers.delete(u.username);
                    item.classList.remove('excluded');
                    btn.className = 'unf-exclude-btn exclude';
                    btn.textContent = '💾 Сохранить';
                } else {
                    excludedUsers.add(u.username);
                    item.classList.add('excluded');
                    btn.className = 'unf-exclude-btn include';
                    btn.textContent = '↩️ Вернуть';
                }
                onUpdate();
            });

            // Клик по аватару/имени открывает профиль
            item.querySelector('.unf-user-avatar').addEventListener('click', () => {
                window.open(`https://www.instagram.com/${u.username}/`, '_blank');
            });
            item.querySelector('.unf-user-info').addEventListener('click', () => {
                window.open(`https://www.instagram.com/${u.username}/`, '_blank');
            });

            list.appendChild(item);
        });
    }

    function showUnfollowConfirmation(content, footer, data) {
        const toUnfollow = data.notFollowingBack.filter(u => !excludedUsers.has(u.username));

        if (toUnfollow.length === 0) {
            alert('Все пользователи сохранены! Некого отписывать.');
            return;
        }

        const estimatedTime = Math.ceil((toUnfollow.length * CONFIG.UNFOLLOW_DELAY_MS) / 60000);

        content.innerHTML = `
            <div class="unf-warning">
                ⚠️ <strong>Внимание!</strong><br>
                Ты собираешься отписаться от <strong>${toUnfollow.length}</strong> человек.<br>
                Это займёт примерно <strong>${estimatedTime} мин</strong>.<br><br>
                Сохранено и НЕ будет отписано: <strong>${excludedUsers.size}</strong> чел.
            </div>
            <div style="color: #f5f5f5; margin-bottom: 12px; font-weight: 600;">
                Будут отписаны:
            </div>
            <div class="unf-confirm-list">
                ${toUnfollow.map(u => `@${u.username}`).join('<br>')}
            </div>`;

        footer.innerHTML = `
            <button class="unf-btn unf-btn-secondary" id="unf-back-btn">← Назад</button>
            <button class="unf-btn unf-btn-danger" id="unf-confirm-btn">🚫 Подтвердить отписку</button>`;

        footer.querySelector('#unf-back-btn').onclick = () => renderResults(content, footer, data);
        footer.querySelector('#unf-confirm-btn').onclick = () => startMassUnfollow(content, footer, toUnfollow, data);
    }

    async function startMassUnfollow(content, footer, users, data) {
        let success = 0;
        let failed = 0;
        let stopped = false;

        footer.innerHTML = `<button class="unf-btn unf-btn-danger" id="unf-stop-btn">⏹ Остановить</button>`;
        footer.querySelector('#unf-stop-btn').onclick = () => { stopped = true; };

        for (let i = 0; i < users.length; i++) {
            if (stopped) break;

            const user = users[i];
            const progress = Math.round(((i + 1) / users.length) * 100);

            content.innerHTML = `
                <div class="unf-unfollow-progress">
                    <div class="unf-progress-bar" style="margin-bottom: 24px;">
                        <div class="unf-progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <div class="unf-stat-value">${i + 1} / ${users.length}</div>
                    <div class="unf-stat-label">отписано</div>
                    <div class="current-user">
                        <div class="unf-spinner" style="display: inline-block; margin-right: 8px;"></div>
                        Отписываюсь от @${user.username}...
                    </div>
                    <div style="margin-top: 16px; color: #a8a8a8; font-size: 13px;">
                        ✅ Успешно: ${success} &nbsp;&nbsp; ❌ Ошибок: ${failed}
                    </div>
                </div>`;

            try {
                await unfollowUser(user.id);
                success++;
                // Удаляем из списка подписок
                data.following.delete(user.username);
            } catch (e) {
                failed++;
                console.error(`[Unfollowers] Ошибка отписки от ${user.username}:`, e);

                // Если 403/429 - Instagram заблокировал, останавливаемся
                if (e.message.includes('403') || e.message.includes('429')) {
                    content.innerHTML = `
                        <div class="unf-error">
                            ⚠️ Instagram временно заблокировал отписки!<br>
                            Подожди 10-30 минут и попробуй снова.
                        </div>
                        <div style="text-align: center; color: #a8a8a8; margin-top: 16px;">
                            Отписано: ${success} из ${users.length}
                        </div>`;
                    footer.innerHTML = `<button class="unf-btn unf-btn-secondary" id="unf-close-modal-btn">Закрыть</button>`;
                    footer.querySelector('#unf-close-modal-btn').onclick = closeModal;
                    return;
                }
            }

            await sleep(CONFIG.UNFOLLOW_DELAY_MS);
        }

        // Готово
        content.innerHTML = `
            <div class="unf-empty">
                <div class="unf-empty-icon">${stopped ? '⏹' : '🎉'}</div>
                <div style="color: #f5f5f5; font-size: 18px; font-weight: 600; margin-bottom: 8px;">
                    ${stopped ? 'Остановлено' : 'Готово!'}
                </div>
                <div style="color: #a8a8a8;">
                    ✅ Отписано: ${success}<br>
                    ❌ Ошибок: ${failed}
                </div>
            </div>`;

        footer.innerHTML = `<button class="unf-btn unf-btn-primary" id="unf-done-btn">Готово</button>`;
        footer.querySelector('#unf-done-btn').onclick = closeModal;
    }

    function downloadReport(data) {
        const { followers, following, notFollowingBack, mutual, fans } = data;
        const toUnfollow = notFollowingBack.filter(u => !excludedUsers.has(u.username));
        const excluded = notFollowingBack.filter(u => excludedUsers.has(u.username));

        const txt = `Instagram Unfollowers Report
${new Date().toLocaleString()}
========================================

Подписчиков: ${followers.size}
Подписок: ${following.size}
Взаимных: ${mutual.length}
Не подписаны в ответ: ${notFollowingBack.length}
  - К отписке: ${toUnfollow.length}
  - Сохранено: ${excluded.length}
Фанаты: ${fans.length}

========================================
К ОТПИСКЕ (${toUnfollow.length})
========================================
${toUnfollow.map(u => `@${u.username}` + (u.full_name ? ` (${u.full_name})` : '')).join('\n')}

========================================
СОХРАНЕНЫ (${excluded.length})
========================================
${excluded.map(u => `@${u.username}` + (u.full_name ? ` (${u.full_name})` : '')).join('\n')}

========================================
ФАНАТЫ (${fans.length})
========================================
${fans.map(u => `@${u.username}` + (u.full_name ? ` (${u.full_name})` : '')).join('\n')}`;

        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain;charset=utf-8' }));
        a.download = `instagram-unfollowers-${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
    }

    let modal = null;
    function openModal() {
        if (modal) return;
        excludedUsers.clear(); // Сбрасываем исключения при новом открытии
        modal = createModal();
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
        startAnalysis();
    }

    function closeModal() {
        if (modal) { modal.remove(); modal = null; document.body.style.overflow = ''; }
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
        } catch (e) { renderError(content, e.message); }
    }

    function init() {
        if (document.getElementById('unf-styles')) return;
        const style = document.createElement('style'); style.id = 'unf-styles'; style.textContent = styles; document.head.appendChild(style);
        document.body.appendChild(createFAB());
        console.log('[Unfollowers] ✅ v2.0 с массовой отпиской загружен');
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(init, 500));
    else setTimeout(init, 500);
})();