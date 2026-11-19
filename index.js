/**
 * Chat Cut & Paste (SillyTavern extension)
 *
 * 1) 채팅 화면에서 메시지를 직접 눌러 선택 (Shift+클릭 / "범위" 버튼 = 범위 선택, 떨어진 메시지도 가능)
 * 2) 복사 / 잘라내기 → 클립보드에 보관
 * 3) 붙여넣을 채팅방으로 이동 (평소처럼 채팅방 전환)
 * 4) 원하는 메시지 아래의 "여기에 붙여넣기" 바를 눌러 삽입
 * 5) 마지막 붙여넣기는 "되돌리기"로 취소 가능
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
            range: '↕ 범위',
            rangeTip: '누른 뒤 범위의 끝 메시지를 누르면 그 사이가 모두 선택/해제됩니다',
            exit: '종료',
            selHint: '메시지를 눌러 선택 · Shift+클릭 또는 "범위"로 범위 선택 · Ctrl+C/X/A',
            rangeHint: '범위의 끝 메시지를 누르세요',
            rangeHintNoAnchor: '범위의 시작 메시지를 누르세요',
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
            undo: '↶ 되돌리기',
            close: '닫기',
            lastPasted: n => `✓ ${n}개 붙여넣음`,
            lastMoved: n => `✓ ${n}개 이동함`,
            toastCopied: n => `${n}개 메시지를 복사했습니다. 붙여넣을 채팅방으로 이동하세요.`,
            toastCut: n => `${n}개 메시지를 잘라냈습니다. 붙여넣는 순간 원본에서 삭제됩니다.`,
            toastNone: '선택된 메시지가 없습니다.',
            toastPasted: n => `${n}개 메시지를 붙여넣었습니다.`,
            toastMoved: n => `${n}개 메시지를 이동했습니다.`,
            toastUndone: '붙여넣기를 되돌렸습니다.',
            toastGroupCut: '그룹 채팅에서 잘라낸 메시지는 같은 채팅방 안에서만 붙여넣을 수 있습니다. 다른 방으로는 "복사"를 사용하세요.',
            errChanged: '원본 메시지가 바뀌었거나 사라져서 중단했습니다. 다시 선택해 주세요. (아무것도 변경되지 않았습니다)',
            errUndoChanged: '붙여넣은 뒤 채팅이 바뀌어서 되돌릴 수 없습니다. (아무것도 변경되지 않았습니다)',
            errGeneric: '실패: ',
            confirmCut: n => `${n}개 메시지를 이 위치로 이동할까요?\n원본 채팅방에서는 삭제됩니다. (직후 "되돌리기" 가능)`,
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
            range: '↕ Range',
            rangeTip: 'Then tap the last message of the range to select/deselect everything in between',
            exit: 'Done',
            selHint: 'Click to select · Shift+click or "Range" for a range · Ctrl+C/X/A',
            rangeHint: 'Tap the last message of the range',
            rangeHintNoAnchor: 'Tap the first message of the range',
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
            undo: '↶ Undo',
            close: 'Close',
            lastPasted: n => `✓ Pasted ${n}`,
            lastMoved: n => `✓ Moved ${n}`,
            toastCopied: n => `Copied ${n} message(s). Switch to the target chat to paste.`,
            toastCut: n => `Cut ${n} message(s). They are removed from the source when pasted.`,
            toastNone: 'No messages selected.',
            toastPasted: n => `Pasted ${n} message(s).`,
            toastMoved: n => `Moved ${n} message(s).`,
            toastUndone: 'Paste undone.',
            toastGroupCut: 'Messages cut from a group chat can only be pasted inside the same chat. Use "Copy" for other rooms.',
            errChanged: 'The source messages changed or disappeared, so nothing was done. Please select again.',
            errUndoChanged: 'The chat changed after pasting, so it cannot be undone. Nothing was changed.',
            errGeneric: 'Failed: ',
            confirmCut: n => `Move ${n} message(s) here?\nThey will be removed from the source chat. (You can undo right after.)`,
            noChat: 'No chat is open.',
            group: 'Group',
        },
    };

    // 언어는 실행 중에 바뀌지 않으므로 한 번만 계산 (매 렌더마다 localStorage 읽지 않음)
    const LANG = (() => {
        try {
            const saved = String(localStorage.getItem('language') || navigator.language || 'en').toLowerCase();
            return saved.startsWith('ko') ? 'ko' : 'en';
        } catch {
            return 'en';
        }
    })();
    const t = I18N[LANG];

    /* ------------------------------------------------------------------ */
    /* 상태                                                                */
    /* ------------------------------------------------------------------ */
    const state = {
        selecting: false,
        selected: new Set(), // 현재 채팅의 mesid
        anchor: null, // 범위 선택 기준
        rangeMode: false, // 터치용: 다음 클릭을 Shift+클릭처럼 처리
        clip: null, // { mode, indices, messages, source }
        undo: null, // 마지막 붙여넣기 되돌리기 정보 (메모리에만 보관)
        busy: false,
    };

    const ctx = () => SillyTavern.getContext();
    const clone = v => (typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v)));
    const toast = (type, msg) => (window.toastr?.[type] ? window.toastr[type](msg) : console.log(`[CCP] ${msg}`));
    const mesEl = id => document.querySelector(`#chat .mes[mesid="${id}"]`);

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
        const base = isGroup ? `${t.group}: ${groupName ?? c.groupId}` : (character?.name ?? '?');
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
        let shift = 0;
        for (const i of rm) if (i <= afterIndex) shift++;
        const list = rm.size ? chat.filter((_, i) => !rm.has(i)) : chat.slice();
        const insertAt = afterIndex + 1 - shift;
        list.splice(insertAt, 0, ...clones);
        return { list, insertAt };
    }

    const sig = m => `${m?.send_date ?? ''}|${m?.name ?? ''}|${m?.mes ?? ''}`;
    function sourceMatches(messages, clip) {
        return clip.indices.every((idx, k) => messages[idx] && sig(messages[idx]) === sig(clip.messages[k]));
    }

    // 채팅 전체의 지문 (길이 + FNV-1a 해시). 큰 문자열을 만들지 않고 비교용으로만 사용
    function fingerprint(messages) {
        let h = 0x811c9dc5;
        for (const m of messages) {
            const s = sig(m);
            for (let i = 0; i < s.length; i++) {
                h ^= s.charCodeAt(i);
                h = Math.imul(h, 0x01000193);
            }
            h ^= 0x0a;
            h = Math.imul(h, 0x01000193);
        }
        return `${messages.length}:${(h >>> 0).toString(16)}`;
    }

    function splitChat(raw) {
        const arr = Array.isArray(raw) ? raw : [];
        const hasHeader = arr[0] && typeof arr[0] === 'object' && arr[0].chat_metadata;
        return { header: hasHeader ? arr[0] : null, messages: hasHeader ? arr.slice(1) : arr };
    }

    // 스프레드(...)는 매우 긴 배열에서 인자 개수 한도에 걸릴 수 있어 push 루프로 교체
    function replaceArray(target, items) {
        target.length = 0;
        for (const x of items) target.push(x);
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

    const fetchRemoteChat = src => apiPost('/api/chats/get', {
        ch_name: src.charName,
        file_name: src.chatId,
        avatar_url: src.avatar,
    }).then(splitChat);

    const saveRemoteChat = (src, header, messages) => apiPost('/api/chats/save', {
        ch_name: src.charName,
        avatar_url: src.avatar,
        file_name: src.chatId,
        chat: header ? [header, ...messages] : messages,
    });

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
        state.rangeMode = false;
        if (!on) {
            state.selected.clear();
            state.anchor = null;
        }
        renderAll();
    }

    function toggleMessage(id, asRange) {
        const changed = [id];
        if (asRange && state.anchor !== null && state.anchor !== id) {
            // 기준 메시지의 현재 상태(선택/해제)를 범위 전체에 적용
            const add = state.selected.has(state.anchor);
            const [lo, hi] = [Math.min(state.anchor, id), Math.max(state.anchor, id)];
            for (let i = lo; i <= hi; i++) {
                if (add) state.selected.add(i);
                else state.selected.delete(i);
                changed.push(i);
            }
            state.rangeMode = false;
        } else if (state.selected.has(id)) {
            state.selected.delete(id);
        } else {
            state.selected.add(id);
        }
        state.anchor = id;
        refreshIds(changed);
        renderBar();
    }

    function selectAll() {
        const len = ctx().chat?.length ?? 0;
        for (let i = 0; i < len; i++) state.selected.add(i);
        renderAll();
    }

    function takeClip(mode) {
        const c = ctx();
        if (!c.chat) return toast('warning', t.noChat);
        const indices = [...state.selected].filter(i => i >= 0 && i < c.chat.length).sort((a, b) => a - b);
        if (!indices.length) return toast('warning', t.toastNone);

        state.clip = {
            mode,
            indices,
            messages: indices.map(i => clone(c.chat[i])),
            source: roomInfo(),
        };
        saveClip();
        setSelecting(false);

        if (mode === 'cut') {
            toast('info', t.toastCut(indices.length));
            if (state.clip.source.isGroup) toast('warning', t.toastGroupCut);
        } else {
            toast('success', t.toastCopied(indices.length));
        }
    }

    function clearClip() {
        state.clip = null;
        saveClip();
        renderAll();
    }

    /* ------------------------------------------------------------------ */
    /* 붙여넣기 / 되돌리기                                                 */
    /* ------------------------------------------------------------------ */
    async function pasteAfter(afterIndex) {
        const clip = state.clip;
        if (!clip || state.busy) return;

        const c = ctx();
        if (!c.chat || c.chatId == null) return toast('warning', t.noChat);

        const here = roomInfo();
        const same = sameRoom(here, clip.source);
        const isCut = clip.mode === 'cut';
        const count = clip.messages.length;

        if (isCut && !same && clip.source.isGroup) return toast('warning', t.toastGroupCut);
        // 같은 방 안 이동은 되돌리기가 있으니 확인창 생략, 다른 방으로의 이동만 확인
        if (isCut && !same && !(await confirmDialog(t.confirmCut(count)))) return;

        afterIndex = Math.max(-1, Math.min(afterIndex, c.chat.length - 1));
        state.busy = true;
        renderBar();

        try {
            // 1) 잘라내기: 원본이 아직 같은 내용인지 먼저 검증 (아무것도 건드리기 전에)
            let remote = null;
            if (isCut && same) {
                if (!sourceMatches(c.chat, clip)) throw new Error(t.errChanged);
            } else if (isCut) {
                const { header, messages } = await fetchRemoteChat(clip.source);
                if (!sourceMatches(messages, clip)) throw new Error(t.errChanged);
                remote = { header, messages };
            }

            // 2) 현재(대상) 채팅에 삽입 후 저장
            const before = c.chat.slice();
            const clones = clip.messages.map(clone);
            const { list, insertAt } = insertMessages(c.chat, afterIndex, clones, isCut && same ? clip.indices : []);
            replaceArray(c.chat, list);
            try {
                await c.saveChat();
            } catch (err) {
                replaceArray(c.chat, before); // 저장 실패 시 메모리 상태 원복
                throw err;
            }

            const undo = {
                target: here,
                before,
                afterFp: fingerprint(list),
                prevClip: isCut ? clip : null,
                isCut,
                count,
                remote: null,
            };

            // 3) 다른 방에서 잘라낸 경우: 대상 저장이 성공한 뒤에 원본에서 삭제
            if (remote) {
                const rm = new Set(clip.indices);
                const remaining = remote.messages.filter((_, i) => !rm.has(i));
                await saveRemoteChat(clip.source, remote.header, remaining);
                undo.remote = { source: clip.source, original: remote.messages, remainingFp: fingerprint(remaining) };
            }

            state.undo = undo;
            if (isCut) {
                state.clip = null;
                saveClip();
            }

            await c.reloadCurrentChat();
            toast('success', isCut ? t.toastMoved(count) : t.toastPasted(count));
            flashPasted(insertAt, count);
        } catch (err) {
            console.error('[CCP] paste failed', err);
            toast('error', t.errGeneric + (err?.message || err));
        } finally {
            state.busy = false;
            renderAll();
        }
    }

    async function undoLast() {
        const u = state.undo;
        if (!u || state.busy) return;
        const c = ctx();
        if (!c.chat || !sameRoom(roomInfo(), u.target)) return;

        state.busy = true;
        renderBar();
        try {
            // 붙여넣은 뒤로 대상 채팅이 바뀌지 않았는지 확인
            if (fingerprint(c.chat) !== u.afterFp) throw new Error(t.errUndoChanged);

            // 다른 방에서 이동한 경우: 원본 방을 먼저 복구 (실패해도 메시지가 사라지지 않는 순서)
            if (u.remote) {
                const { header, messages } = await fetchRemoteChat(u.remote.source);
                if (fingerprint(messages) !== u.remote.remainingFp) throw new Error(t.errUndoChanged);
                await saveRemoteChat(u.remote.source, header, u.remote.original);
            }

            replaceArray(c.chat, u.before);
            await c.saveChat();

            state.undo = null;
            if (u.prevClip) {
                state.clip = u.prevClip;
                saveClip();
            }
            await c.reloadCurrentChat();
            toast('success', t.toastUndone);
        } catch (err) {
            console.error('[CCP] undo failed', err);
            toast('error', t.errGeneric + (err?.message || err));
            if (err?.message === t.errUndoChanged) state.undo = null;
        } finally {
            state.busy = false;
            renderAll();
        }
    }

    function flashPasted(start, count) {
        setTimeout(() => {
            let first = null;
            for (let i = start; i < start + count; i++) {
                const el = mesEl(i);
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
    let barHtml = '';

    function ensureBar() {
        let bar = document.getElementById(BAR_ID);
        if (bar) return bar;

        bar = document.createElement('div');
        bar.id = BAR_ID;
        bar.addEventListener('click', onBarClick);
        document.body.appendChild(bar);
        barHtml = '';
        return bar;
    }

    const undoHere = () => Boolean(state.undo) && sameRoom(roomInfo(), state.undo.target);

    function barTemplate() {
        const dis = state.busy ? 'disabled' : '';

        if (state.selecting) {
            const n = state.selected.size;
            const nd = n ? '' : 'disabled';
            const hint = state.rangeMode ? (state.anchor === null ? t.rangeHintNoAnchor : t.rangeHint) : t.selHint;
            return `
                <div class="ccp-row">
                    <span class="ccp-title">${t.selMode}</span>
                    <span class="ccp-count">${t.selected(n)}</span>
                    <span class="ccp-spacer"></span>
                    <button data-act="copy" class="ccp-primary" ${nd}>${t.copy}</button>
                    <button data-act="cut" class="ccp-danger" ${nd}>${t.cut}</button>
                </div>
                <div class="ccp-row">
                    <button data-act="range" class="${state.rangeMode ? 'ccp-active' : ''}" title="${escapeHtml(t.rangeTip)}">${t.range}</button>
                    <button data-act="all">${t.selectAll}</button>
                    <button data-act="clear" ${nd}>${t.clearSel}</button>
                    <button data-act="exit">${t.exit}</button>
                    <span class="ccp-hint">${escapeHtml(hint)}</span>
                </div>`;
        }

        const undoBtn = undoHere() ? `<button data-act="undo" ${dis}>${t.undo}</button>` : '';

        if (state.clip) {
            const clip = state.clip;
            const label = clip.mode === 'cut' ? t.clipCut(clip.messages.length) : t.clipCopied(clip.messages.length);
            return `
                <div class="ccp-row">
                    <span class="ccp-title ccp-count">${state.busy ? t.busy : label}</span>
                </div>
                <div class="ccp-src">${t.source(escapeHtml(clip.source.label))}</div>
                <div class="ccp-row">
                    <button data-act="top" class="ccp-primary" ${dis}>${t.pasteTop}</button>
                    <button data-act="bottom" class="ccp-primary" ${dis}>${t.pasteBottom}</button>
                    ${undoBtn}
                    <span class="ccp-spacer"></span>
                    <button data-act="newsel" ${dis}>${t.newSel}</button>
                    <button data-act="dropclip" class="ccp-danger" ${dis}>${t.clearClip}</button>
                </div>
                <div class="ccp-hint">${t.pasteHint}</div>`;
        }

        if (undoBtn) {
            const u = state.undo;
            const label = state.busy ? t.busy : (u.isCut ? t.lastMoved(u.count) : t.lastPasted(u.count));
            return `
                <div class="ccp-row">
                    <span class="ccp-title ccp-count">${label}</span>
                    <span class="ccp-spacer"></span>
                    ${undoBtn}
                    <button data-act="closeundo" ${dis}>${t.close}</button>
                </div>`;
        }
        return '';
    }

    function renderBar() {
        const bar = ensureBar();
        const html = barTemplate();
        if (html === barHtml) return; // 바뀐 게 없으면 DOM을 건드리지 않음
        barHtml = html;
        bar.innerHTML = html;
        bar.classList.toggle('ccp-visible', Boolean(html));
    }

    function escapeHtml(v) {
        return String(v ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[ch]));
    }

    function onBarClick(e) {
        const btn = e.target.closest('button[data-act]');
        if (!btn || btn.disabled) return;
        const c = ctx();
        switch (btn.dataset.act) {
            case 'copy': return takeClip('copy');
            case 'cut': return takeClip('cut');
            case 'all': return selectAll();
            case 'clear':
                state.selected.clear();
                state.anchor = null;
                return renderAll();
            case 'range':
                state.rangeMode = !state.rangeMode;
                return renderBar();
            case 'exit': return setSelecting(false);
            case 'top': return pasteAfter(-1);
            case 'bottom': return pasteAfter((c.chat?.length ?? 0) - 1);
            case 'newsel': return setSelecting(true);
            case 'dropclip': return clearClip();
            case 'undo': return undoLast();
            case 'closeundo':
                state.undo = null;
                return renderBar();
        }
    }

    /* ---- 메시지 표시: 바뀐 메시지만 갱신 ---- */
    function cutPendingSet() {
        return state.clip?.mode === 'cut' && sameRoom(roomInfo(), state.clip.source)
            ? new Set(state.clip.indices)
            : null;
    }

    function markEl(el, cutSet) {
        const id = Number(el.getAttribute('mesid'));
        el.classList.toggle('ccp-selected', state.selecting && state.selected.has(id));
        el.classList.toggle('ccp-cut-pending', Boolean(cutSet?.has(id)));
    }

    /** 메시지에 ✂ 버튼과 (붙여넣기 모드일 때만) "여기에 붙여넣기" 바를 한 번만 주입 */
    function decorateEl(el, pasteMode) {
        const buttons = el.querySelector('.extraMesButtons');
        if (buttons && !buttons.querySelector('.ccp-mes-btn')) {
            const b = document.createElement('div');
            b.className = 'mes_button ccp-mes-btn fa-solid fa-scissors interactable';
            b.title = t.msgBtn;
            b.tabIndex = 0;
            buttons.prepend(b);
        }

        if (pasteMode) {
            const block = el.querySelector('.mes_block');
            if (block && !block.querySelector(':scope > .ccp-drop')) {
                const d = document.createElement('div');
                d.className = 'ccp-drop';
                d.innerHTML = `<i class="fa-solid fa-paste"></i><span>${escapeHtml(t.pasteHere)}</span>`;
                block.appendChild(d);
            }
        }
    }

    function updateBodyModes() {
        const body = document.body;
        body.classList.toggle('ccp-select-mode', state.selecting);
        body.classList.toggle('ccp-paste-mode', Boolean(state.clip) && !state.selecting);
        return body.classList.contains('ccp-paste-mode');
    }

    function processEls(els) {
        const pasteMode = updateBodyModes();
        const cutSet = cutPendingSet();
        for (const el of els) {
            decorateEl(el, pasteMode);
            markEl(el, cutSet);
        }
    }

    const refreshAllMessages = () => processEls(document.querySelectorAll('#chat .mes[mesid]'));

    function refreshIds(ids) {
        const cutSet = cutPendingSet();
        for (const id of new Set(ids)) {
            const el = mesEl(id);
            if (el) markEl(el, cutSet);
        }
    }

    function renderAll() {
        renderBar();
        refreshAllMessages();
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
            toggleMessage(Number(mes.getAttribute('mesid')), e.shiftKey || state.rangeMode);
        }, true);

        // 일반 상태: 메시지 버튼(✂) → 선택 모드 시작 / 붙여넣기 바 클릭
        chatEl.addEventListener('click', e => {
            const mes = e.target.closest('.mes[mesid]');
            if (!mes) return;
            const id = Number(mes.getAttribute('mesid'));

            if (e.target.closest('.ccp-mes-btn')) {
                state.selecting = true;
                state.selected.add(id);
                state.anchor = id;
                renderAll();
                return;
            }
            if (e.target.closest('.ccp-drop')) {
                pasteAfter(id);
            }
        });

        // 새로 추가/재렌더링된 메시지만 처리 (매번 전체 채팅을 훑지 않음)
        const pending = new Set();
        let queued = false;
        new MutationObserver(records => {
            for (const r of records) {
                for (const n of r.addedNodes) {
                    if (n.nodeType === 1 && n.matches?.('.mes[mesid]')) pending.add(n);
                }
            }
            if (!pending.size || queued) return;
            queued = true;
            requestAnimationFrame(() => {
                queued = false;
                const els = [...pending].filter(el => el.isConnected);
                pending.clear();
                processEls(els);
            });
        }).observe(chatEl, { childList: true });
    }

    function isTyping(target) {
        return Boolean(target?.closest?.('input, textarea, select, [contenteditable=""], [contenteditable="true"]'));
    }

    function onKeyDown(e) {
        if (!state.selecting || isTyping(e.target)) return;
        if (e.key === 'Escape') {
            setSelecting(false);
            return;
        }
        if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
        const key = e.key.toLowerCase();
        if (key === 'a') {
            e.preventDefault();
            selectAll();
        } else if ((key === 'c' || key === 'x') && state.selected.size) {
            // 다른 곳에 드래그로 선택한 텍스트가 있으면 기본 복사 동작을 존중
            if (String(window.getSelection?.() ?? '').length) return;
            e.preventDefault();
            takeClip(key === 'c' ? 'copy' : 'cut');
        }
    }

    function addMenuItem() {
        const menu = document.getElementById('extensionsMenu');
        if (!menu) return false;
        if (document.getElementById(MENU_ID)) return true;

        const item = document.createElement('div');
        item.id = MENU_ID;
        item.className = 'list-group-item flex-container flexGap5 interactable';
        item.title = t.menuTip;
        item.innerHTML = `<div class="fa-solid fa-scissors extensionsMenuExtensionButton"></div><span>${escapeHtml(t.menu)}</span>`;
        item.addEventListener('click', () => setSelecting(!state.selecting));
        menu.appendChild(item);
        return true;
    }

    function onChatChanged() {
        state.selecting = false;
        state.rangeMode = false;
        state.selected.clear();
        state.anchor = null;
        renderAll();
    }

    /** 조건이 맞을 때까지 재시도하되 무한 반복하지 않음 */
    function retry(fn, interval, maxTries) {
        if (fn()) return;
        let tries = 0;
        const timer = setInterval(() => {
            if (fn() || ++tries >= maxTries) clearInterval(timer);
        }, interval);
    }

    function init() {
        loadClip();

        retry(() => {
            const chatEl = document.getElementById('chat');
            if (!chatEl) return false;
            bindChatEvents(chatEl);
            const c = ctx();
            const events = c.eventTypes || c.event_types;
            c.eventSource?.on(events?.CHAT_CHANGED || 'chat_id_changed', onChatChanged);
            document.addEventListener('keydown', onKeyDown);
            renderAll();
            return true;
        }, 400, 300);

        // 메뉴가 늦게 생기는 경우 대비 (최대 약 1분)
        retry(addMenuItem, 800, 75);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
