/**
 * Chat Cut & Paste (SillyTavern extension)
 *
 * 1) 채팅 화면에서 메시지를 직접 눌러 선택 (Shift+클릭 = 범위 선택, 떨어진 메시지도 가능)
 * 2) 복사 / 잘라내기 → 클립보드에 보관
 * 3) 붙여넣을 채팅방으로 이동 (평소처럼 채팅방 전환)
 * 4) 원하는 메시지 아래의 "여기에 붙여넣기" 바를 눌러 삽입
 *
 * 잘라내기는 붙여넣는 순간에 원본에서 삭제됩니다 (파일 탐색기와 같은 방식).
 */
(() => {
    'use strict';

    const BAR_ID = 'ccp-bar';
    const MENU_ID = 'ccp-menu-item';
    const STORE_KEY = 'ccp-clipboard-v2';

    /* ------------------------------------------------------------------ */
    /* i18n                                                                */
    /* ------------------------------------------------------------------ */
    const I18N = {
        ko: {
            menu: '채팅 선택 (복사/잘라내기)',
            menuTip: '채팅 화면에서 메시지를 직접 골라 복사하거나 잘라냅니다',
            msgBtn: '여기서부터 선택 (복사/잘라내기)',
            selMode: '✂ 선택 모드',
            selected: n => `${n}개 선택됨`,
            copy: '복사',
            cut: '잘라내기',
            selectAll: '전체 선택',
            clearSel: '선택 해제',
            exit: '종료',
            selHint: '메시지를 눌러 선택 · Shift+클릭으로 범위 선택',
            clipCopied: n => `📋 ${n}개 복사됨`,
            clipCut: n => `✂ ${n}개 잘라냄 (붙여넣으면 원본에서 삭제)`,
            source: s => `원본: ${s}`,
            pasteTop: '↑ 맨 위에',
            pasteBottom: '↓ 맨 아래에',
            newSel: '새로 선택',
            clearClip: '비우기',
            pasteHint: '붙여넣을 위치의 메시지 아래에 있는 “여기에 붙여넣기” 바를 누르세요',
            pasteHere: '여기에 붙여넣기',
            busy: '처리 중...',
            toastCopied: n => `${n}개 메시지를 복사했습니다. 붙여넣을 채팅방으로 이동하세요.`,
            toastCut: n => `${n}개 메시지를 잘라냈습니다. 붙여넣는 순간 원본에서 삭제됩니다.`,
            toastNone: '선택된 메시지가 없습니다.',
            toastPasted: n => `${n}개 메시지를 붙여넣었습니다.`,
            toastMoved: n => `${n}개 메시지를 이동했습니다.`,
            toastGroupCut: '그룹 채팅에서 잘라낸 메시지는 같은 채팅방 안에서만 붙여넣을 수 있습니다. 다른 방으로는 "복사"를 사용하세요.',
            errChanged: '원본 메시지가 바뀌었거나 사라져서 중단했습니다. 다시 선택해 주세요. (아무것도 변경되지 않았습니다)',
            errGeneric: '붙여넣기 실패: ',
            confirmCut: n => `${n}개 메시지를 이 위치로 이동할까요?\n원본 채팅방에서는 삭제됩니다.`,
            noChat: '열려 있는 채팅이 없습니다.',
            group: '그룹',
        },
        en: {
            menu: 'Chat select (copy/cut)',
            menuTip: 'Pick messages directly in the chat to copy or cut',
            msgBtn: 'Start selecting from here (copy/cut)',
            selMode: '✂ Select mode',
            selected: n => `${n} selected`,
            copy: 'Copy',
            cut: 'Cut',
            selectAll: 'Select all',
            clearSel: 'Clear',
            exit: 'Done',
            selHint: 'Click messages to select · Shift+click for a range',
            clipCopied: n => `📋 ${n} copied`,
            clipCut: n => `✂ ${n} cut (removed from source when pasted)`,
            source: s => `From: ${s}`,
            pasteTop: '↑ To top',
            pasteBottom: '↓ To bottom',
            newSel: 'Select new',
            clearClip: 'Clear',
            pasteHint: 'Click the “Paste here” bar under the message where you want to insert',
            pasteHere: 'Paste here',
            busy: 'Working...',
            toastCopied: n => `Copied ${n} message(s). Switch to the target chat to paste.`,
            toastCut: n => `Cut ${n} message(s). They are removed from the source when pasted.`,
            toastNone: 'No messages selected.',
            toastPasted: n => `Pasted ${n} message(s).`,
            toastMoved: n => `Moved ${n} message(s).`,
            toastGroupCut: 'Messages cut from a group chat can only be pasted inside the same chat. Use "Copy" for other rooms.',
            errChanged: 'The source messages changed or disappeared, so nothing was done. Please select again.',
            errGeneric: 'Paste failed: ',
            confirmCut: n => `Move ${n} message(s) here?\nThey will be removed from the source chat.`,
            noChat: 'No chat is open.',
            group: 'Group',
        },
    };

    function lang() {
        const saved = String(localStorage.getItem('language') || navigator.language || 'en').toLowerCase();
        return saved.startsWith('ko') ? 'ko' : 'en';
    }
    const T = () => I18N[lang()];

    /* ------------------------------------------------------------------ */
    /* 상태                                                                */
    /* ------------------------------------------------------------------ */
    const state = {
        selecting: false,
        selected: new Set(), // 현재 채팅의 mesid
        anchor: null, // Shift 범위 선택 기준
        clip: null, // { mode, indices, messages, source }
        busy: false,
    };

    const ctx = () => SillyTavern.getContext();
    const clone = v => (typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v)));
    const toast = (type, msg) => (window.toastr?.[type] ? window.toastr[type](msg) : console.log(`[CCP] ${msg}`));

    function loadClip() {
        try {
            const raw = sessionStorage.getItem(STORE_KEY);
            if (raw) state.clip = JSON.parse(raw);
        } catch { /* ignore */ }
    }
    function saveClip() {
        try {
            if (state.clip) sessionStorage.setItem(STORE_KEY, JSON.stringify(state.clip));
            else sessionStorage.removeItem(STORE_KEY);
        } catch { /* 용량 초과 등은 무시: 메모리에는 남아 있음 */ }
    }

    /* ------------------------------------------------------------------ */
    /* 채팅방 식별                                                         */
    /* ------------------------------------------------------------------ */
    function roomInfo() {
        const c = ctx();
        const isGroup = Boolean(c.groupId);
        const character = !isGroup && c.characterId !== undefined && c.characterId !== null
            ? c.characters?.[c.characterId]
            : null;
        const groupName = isGroup ? c.groups?.find(g => String(g.id) === String(c.groupId))?.name : null;
        const base = isGroup ? `${T().group}: ${groupName ?? c.groupId}` : (character?.name ?? '?');
        return {
            isGroup,
            groupId: c.groupId ?? null,
            avatar: character?.avatar ?? null,
            charName: character?.name ?? null,
            chatId: c.chatId ?? null,
            label: `${base} / ${c.chatId ?? '?'}`,
        };
    }

    function sameRoom(a, b) {
        if (!a || !b || a.chatId == null || b.chatId == null) return false;
        if (a.isGroup !== b.isGroup) return false;
        if (String(a.chatId) !== String(b.chatId)) return false;
        return a.isGroup ? String(a.groupId) === String(b.groupId) : a.avatar === b.avatar;
    }

    /* ------------------------------------------------------------------ */
    /* 순수 로직 (테스트 대상)                                             */
    /* ------------------------------------------------------------------ */
    // chat 배열에서 removeIdx를 제거하고 afterIndex(-1 = 맨 위) 뒤에 clones를 삽입
    function insertMessages(chat, afterIndex, clones, removeIdx = []) {
        const rm = new Set(removeIdx);
        const shift = [...rm].filter(i => i <= afterIndex).length;
        const list = chat.filter((_, i) => !rm.has(i));
        const insertAt = afterIndex + 1 - shift;
        list.splice(insertAt, 0, ...clones);
        return { list, insertAt };
    }

    const sig = m => `${m?.send_date ?? ''}|${m?.name ?? ''}|${m?.mes ?? ''}`;
    function sourceMatches(messages, clip) {
        return clip.indices.every((idx, k) => messages[idx] && sig(messages[idx]) === sig(clip.messages[k]));
    }

    function splitChat(raw) {
        const arr = Array.isArray(raw) ? raw : [];
        const hasHeader = arr[0] && typeof arr[0] === 'object' && arr[0].chat_metadata;
        return { header: hasHeader ? arr[0] : null, messages: hasHeader ? arr.slice(1) : arr };
    }
    /* ---- end pure ---- */

    async function apiPost(url, body) {
        const c = ctx();
        const res = await fetch(url, {
            method: 'POST',
            headers: c.getRequestHeaders(),
            cache: 'no-cache',
            body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error((await res.text().catch(() => '')) || res.statusText);
        return res.json().catch(() => ({}));
    }

    async function confirmDialog(message) {
        const c = ctx();
        try {
            if (c.callGenericPopup && c.POPUP_TYPE) {
                const r = await c.callGenericPopup(message.replace(/\n/g, '<br>'), c.POPUP_TYPE.CONFIRM);
                return r === 1 || r === true || r === c.POPUP_RESULT?.AFFIRMATIVE;
            }
        } catch { /* fallthrough */ }
        return window.confirm(message);
    }

    /* ------------------------------------------------------------------ */
    /* 선택 / 클립보드                                                     */
    /* ------------------------------------------------------------------ */
    function setSelecting(on) {
        state.selecting = on;
        if (!on) {
            state.selected.clear();
            state.anchor = null;
        }
        renderAll();
    }

    function toggleMessage(id, withShift) {
        if (withShift && state.anchor !== null) {
            const [lo, hi] = [Math.min(state.anchor, id), Math.max(state.anchor, id)];
            for (let i = lo; i <= hi; i++) state.selected.add(i);
        } else if (state.selected.has(id)) {
            state.selected.delete(id);
        } else {
            state.selected.add(id);
        }
        state.anchor = id;
        renderAll();
    }

    function takeClip(mode) {
        const c = ctx();
        if (!c.chat) return toast('warning', T().noChat);
        const indices = [...state.selected].filter(i => i >= 0 && i < c.chat.length).sort((a, b) => a - b);
        if (!indices.length) return toast('warning', T().toastNone);

        state.clip = {
            mode,
            indices,
            messages: indices.map(i => clone(c.chat[i])),
            source: roomInfo(),
        };
        saveClip();
        setSelecting(false);

        if (mode === 'cut') {
            toast('info', T().toastCut(indices.length));
            if (state.clip.source.isGroup) toast('warning', T().toastGroupCut);
        } else {
            toast('success', T().toastCopied(indices.length));
        }
    }

    function clearClip() {
        state.clip = null;
        saveClip();
        renderAll();
    }

    /* ------------------------------------------------------------------ */
    /* 붙여넣기                                                            */
    /* ------------------------------------------------------------------ */
    async function pasteAfter(afterIndex) {
        const clip = state.clip;
        if (!clip || state.busy) return;

        const c = ctx();
        if (!c.chat || c.chatId == null) return toast('warning', T().noChat);

        const here = roomInfo();
        const same = sameRoom(here, clip.source);
        const isCut = clip.mode === 'cut';
        const count = clip.messages.length;

        if (isCut && !same && clip.source.isGroup) return toast('warning', T().toastGroupCut);
        if (isCut && !(await confirmDialog(T().confirmCut(count)))) return;

        afterIndex = Math.max(-1, Math.min(afterIndex, c.chat.length - 1));
        state.busy = true;
        renderBar();

        try {
            // 1) 잘라내기: 원본이 아직 같은 내용인지 먼저 검증 (아무것도 건드리기 전에)
            let remoteSource = null;
            if (isCut && same) {
                if (!sourceMatches(c.chat, clip)) throw new Error(T().errChanged);
            } else if (isCut) {
                const raw = await apiPost('/api/chats/get', {
                    ch_name: clip.source.charName,
                    file_name: clip.source.chatId,
                    avatar_url: clip.source.avatar,
                });
                const { header, messages } = splitChat(raw);
                if (!sourceMatches(messages, clip)) throw new Error(T().errChanged);
                remoteSource = { header, messages };
            }

            // 2) 현재(대상) 채팅에 삽입 후 저장
            const clones = clip.messages.map(clone);
            const { list, insertAt } = insertMessages(c.chat, afterIndex, clones, isCut && same ? clip.indices : []);
            c.chat.splice(0, c.chat.length, ...list);
            await c.saveChat();

            // 3) 다른 방에서 잘라낸 경우: 대상 저장이 성공한 뒤에 원본에서 삭제
            if (remoteSource) {
                const rm = new Set(clip.indices);
                const remaining = remoteSource.messages.filter((_, i) => !rm.has(i));
                await apiPost('/api/chats/save', {
                    ch_name: clip.source.charName,
                    avatar_url: clip.source.avatar,
                    file_name: clip.source.chatId,
                    chat: remoteSource.header ? [remoteSource.header, ...remaining] : remaining,
                });
            }

            if (isCut) {
                state.clip = null;
                saveClip();
            }

            await c.reloadCurrentChat();
            toast('success', isCut ? T().toastMoved(count) : T().toastPasted(count));
            flashPasted(insertAt, count);
        } catch (err) {
            console.error('[CCP] paste failed', err);
            toast('error', T().errGeneric + (err?.message || err));
        } finally {
            state.busy = false;
            renderAll();
        }
    }

    function flashPasted(start, count) {
        setTimeout(() => {
            let first = null;
            for (let i = start; i < start + count; i++) {
                const el = document.querySelector(`#chat .mes[mesid="${i}"]`);
                if (!el) continue;
                first ??= el;
                el.classList.add('ccp-flash');
                setTimeout(() => el.classList.remove('ccp-flash'), 2000);
            }
            first?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }, 300);
    }

    /* ------------------------------------------------------------------ */
    /* UI                                                                  */
    /* ------------------------------------------------------------------ */
    function ensureBar() {
        let bar = document.getElementById(BAR_ID);
        if (bar) return bar;

        bar = document.createElement('div');
        bar.id = BAR_ID;
        bar.addEventListener('click', onBarClick);
        document.body.appendChild(bar);
        return bar;
    }

    function renderBar() {
        const bar = ensureBar();
        const t = T();
        const dis = state.busy ? 'disabled' : '';
        const n = state.selected.size;

        if (state.selecting) {
            bar.innerHTML = `
                <div class="ccp-row">
                    <span class="ccp-title">${t.selMode}</span>
                    <span class="ccp-count">${t.selected(n)}</span>
                    <span class="ccp-spacer"></span>
                    <button data-act="copy" class="ccp-primary" ${n ? '' : 'disabled'}>${t.copy}</button>
                    <button data-act="cut" class="ccp-danger" ${n ? '' : 'disabled'}>${t.cut}</button>
                </div>
                <div class="ccp-row">
                    <button data-act="all">${t.selectAll}</button>
                    <button data-act="clear" ${n ? '' : 'disabled'}>${t.clearSel}</button>
                    <button data-act="exit">${t.exit}</button>
                    <span class="ccp-hint">${t.selHint}</span>
                </div>`;
            bar.classList.add('ccp-visible');
        } else if (state.clip) {
            const clip = state.clip;
            const label = clip.mode === 'cut' ? t.clipCut(clip.messages.length) : t.clipCopied(clip.messages.length);
            bar.innerHTML = `
                <div class="ccp-row">
                    <span class="ccp-title ccp-count">${state.busy ? t.busy : label}</span>
                </div>
                <div class="ccp-src">${t.source(escapeHtml(clip.source.label))}</div>
                <div class="ccp-row">
                    <button data-act="top" class="ccp-primary" ${dis}>${t.pasteTop}</button>
                    <button data-act="bottom" class="ccp-primary" ${dis}>${t.pasteBottom}</button>
                    <span class="ccp-spacer"></span>
                    <button data-act="newsel" ${dis}>${t.newSel}</button>
                    <button data-act="dropclip" class="ccp-danger" ${dis}>${t.clearClip}</button>
                </div>
                <div class="ccp-hint">${t.pasteHint}</div>`;
            bar.classList.add('ccp-visible');
        } else {
            bar.classList.remove('ccp-visible');
            bar.innerHTML = '';
        }
    }

    function escapeHtml(v) {
        return String(v ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[ch]));
    }

    function onBarClick(e) {
        const act = e.target.closest('button[data-act]')?.dataset.act;
        if (!act) return;
        const c = ctx();
        switch (act) {
            case 'copy': return takeClip('copy');
            case 'cut': return takeClip('cut');
            case 'all':
                (c.chat || []).forEach((_, i) => state.selected.add(i));
                return renderAll();
            case 'clear':
                state.selected.clear();
                state.anchor = null;
                return renderAll();
            case 'exit': return setSelecting(false);
            case 'top': return pasteAfter(-1);
            case 'bottom': return pasteAfter((c.chat?.length ?? 0) - 1);
            case 'newsel': return setSelecting(true);
            case 'dropclip': return clearClip();
        }
    }

    /** 메시지별 표시(선택/잘라냄 대기)와 body 모드 클래스 갱신 */
    function refreshMarks() {
        document.body.classList.toggle('ccp-select-mode', state.selecting);
        document.body.classList.toggle('ccp-paste-mode', Boolean(state.clip) && !state.selecting);

        const cutPending = state.clip?.mode === 'cut' && sameRoom(roomInfo(), state.clip.source)
            ? new Set(state.clip.indices)
            : null;

        document.querySelectorAll('#chat .mes[mesid]').forEach(el => {
            const id = Number(el.getAttribute('mesid'));
            el.classList.toggle('ccp-selected', state.selecting && state.selected.has(id));
            el.classList.toggle('ccp-cut-pending', Boolean(cutPending?.has(id)));
        });
    }

    /** 각 메시지에 "선택 시작" 버튼과 "여기에 붙여넣기" 바를 한 번만 주입 */
    function decorateMessages() {
        const t = T();
        document.querySelectorAll('#chat .mes[mesid]').forEach(el => {
            const buttons = el.querySelector('.extraMesButtons');
            if (buttons && !buttons.querySelector('.ccp-mes-btn')) {
                const b = document.createElement('div');
                b.className = 'mes_button ccp-mes-btn fa-solid fa-scissors interactable';
                b.title = t.msgBtn;
                b.tabIndex = 0;
                buttons.prepend(b);
            }

            const block = el.querySelector('.mes_block');
            if (block && !block.querySelector(':scope > .ccp-drop')) {
                const d = document.createElement('div');
                d.className = 'ccp-drop';
                d.innerHTML = `<i class="fa-solid fa-paste"></i><span>${escapeHtml(t.pasteHere)}</span>`;
                block.appendChild(d);
            }
        });
        refreshMarks();
    }

    function renderAll() {
        renderBar();
        decorateMessages();
    }

    /* ------------------------------------------------------------------ */
    /* 이벤트                                                              */
    /* ------------------------------------------------------------------ */
    function bindChatEvents(chatEl) {
        // 선택 모드: 메시지 어디를 눌러도 선택 토글 (캡처 단계에서 가로챔)
        chatEl.addEventListener('click', e => {
            if (!state.selecting) return;
            const mes = e.target.closest('.mes[mesid]');
            if (!mes) return;
            e.preventDefault();
            e.stopPropagation();
            toggleMessage(Number(mes.getAttribute('mesid')), e.shiftKey);
        }, true);

        // 일반 상태: 메시지 버튼(✂) → 선택 모드 시작 / 붙여넣기 바 클릭
        chatEl.addEventListener('click', e => {
            const mes = e.target.closest('.mes[mesid]');
            if (!mes) return;
            const id = Number(mes.getAttribute('mesid'));

            if (e.target.closest('.ccp-mes-btn')) {
                state.selecting = true;
                toggleMessage(id, false);
                return;
            }
            if (e.target.closest('.ccp-drop')) {
                pasteAfter(id);
            }
        });

        // 메시지가 추가/재렌더링될 때마다 주입
        let queued = false;
        new MutationObserver(() => {
            if (queued) return;
            queued = true;
            requestAnimationFrame(() => {
                queued = false;
                decorateMessages();
            });
        }).observe(chatEl, { childList: true });
    }

    function addMenuItem() {
        const menu = document.getElementById('extensionsMenu');
        if (!menu || document.getElementById(MENU_ID)) return Boolean(menu);

        const item = document.createElement('div');
        item.id = MENU_ID;
        item.className = 'list-group-item flex-container flexGap5 interactable';
        item.title = T().menuTip;
        item.innerHTML = `<div class="fa-solid fa-scissors extensionsMenuExtensionButton"></div><span>${escapeHtml(T().menu)}</span>`;
        item.addEventListener('click', () => {
            setSelecting(!state.selecting);
        });
        menu.appendChild(item);
        return true;
    }

    function onChatChanged() {
        state.selecting = false;
        state.selected.clear();
        state.anchor = null;
        renderAll();
    }

    function init() {
        loadClip();

        const tryBind = () => {
            const chatEl = document.getElementById('chat');
            if (!chatEl) return false;
            bindChatEvents(chatEl);
            addMenuItem();
            const c = ctx();
            const events = c.eventTypes || c.event_types;
            c.eventSource?.on(events?.CHAT_CHANGED || 'chat_id_changed', onChatChanged);
            document.addEventListener('keydown', e => {
                if (e.key === 'Escape' && state.selecting) setSelecting(false);
            });
            renderAll();
            return true;
        };

        if (!tryBind()) {
            const timer = setInterval(() => tryBind() && clearInterval(timer), 400);
        }
        // 메뉴가 늦게 생기는 경우 대비
        const menuTimer = setInterval(() => addMenuItem() && document.getElementById(MENU_ID) && clearInterval(menuTimer), 800);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
