/* ================================================================
 *  편집 모드 — 사이트 화면 위에서 직접 텍스트/이미지 편집 후 GitHub 커밋
 *  ?edit=1 모드에서만 로드되며, github_pat 이 localStorage에 있어야 동작
 * ================================================================ */
(function(){
'use strict';

const REPO   = 'PrakSuHun/aifuture-site';
const BRANCH = 'main';
const PAT    = localStorage.getItem('github_pat');
const USER   = localStorage.getItem('github_user') || 'admin';

if (!PAT) { location.replace('admin/'); return; }

// ── 한글 라벨 (data-edit 키 → 사람 친화적 설명) ───────────────────
const LABELS = {
	'nav.logo':'상단 로고 이미지','nav.home':'메뉴 — Home','nav.about':'메뉴 — About',
	'nav.scope':'메뉴 — Scope','nav.curriculum':'메뉴 — Curriculum','nav.speakers':'메뉴 — Speakers','nav.contact':'메뉴 — Contact',
	'hero.bg':'HOME 배경 이미지',
	'slide1.h1pre':'슬라이드1 제목 앞','slide1.h1em':'슬라이드1 제목 강조','slide1.h6pre':'슬라이드1 부제 앞','slide1.h6em':'슬라이드1 부제 강조','slide1.text':'슬라이드1 본문','slide1.cta':'슬라이드1 버튼',
	'slide2.h1pre':'슬라이드2 제목 앞','slide2.h1em':'슬라이드2 제목 강조','slide2.text':'슬라이드2 본문',
	'slide3.h1pre':'슬라이드3 제목 앞','slide3.h1em':'슬라이드3 제목 강조','slide3.text':'슬라이드3 본문',
	'about.title':'About 섹션 제목',
	'service1.title':'카드1 제목','service1.text':'카드1 본문',
	'service2.title':'카드2 제목','service2.text':'카드2 본문',
	'service3.title':'카드3 제목','service3.text':'카드3 본문',
	'whoweare.title':'좌측 칼럼 제목','whoweare.img':'좌측 칼럼 이미지','whoweare.text':'좌측 본문 전체 (강조 단어는 <span>으로 감쌈)',
	'mission.title':'미션 제목',
	'mission.entry1':'미션1 (라벨 + 퍼센트)','mission.entry2':'미션2 (라벨 + 퍼센트)','mission.entry3':'미션3 (라벨 + 퍼센트)','mission.entry4':'미션4 (라벨 + 퍼센트)','mission.entry5':'미션5 (라벨 + 퍼센트)',
	'coremsg.title':'Core Message 제목','coremsg.text':'Core Message 본문 (강조 문장은 <span>으로 감쌈)',
	'scope.title':'Scope 섹션 제목',
	'curriculum.title':'Curriculum 섹션 제목',
	'team.title':'Speakers 섹션 제목',
	'main.title':'메인 강사 상세 제목','main.text':'메인 강사 경력',
	'contact.title':'Contact 섹션 제목','contact.formTitle':'문의 폼 제목',
	'contact.phName':'폼 — 이름 placeholder','contact.phEmail':'폼 — 이메일 placeholder','contact.phMessage':'폼 — 메시지 placeholder','contact.submit':'폼 — 제출 버튼',
	'contact.infoTitle':'직접 연락처 제목','contact.email':'이메일 (표시)','contact.emailLink':'이메일 링크','contact.phone':'전화번호','contact.location':'위치/소속',
	'footer.copyright':'저작권 문구','footer.emailLink':'푸터 이메일 링크','footer.phoneLink':'푸터 전화 링크',
};
// (mission entries 위에서 직접 등록)
for (let i=1;i<=6;i++){
	LABELS['blog'+i+'.img']='Scope 카드'+i+' 이미지';
	LABELS['blog'+i+'.title']='Scope 카드'+i+' 제목';
	LABELS['blog'+i+'.text']='Scope 카드'+i+' 본문';
	LABELS['blog'+i+'.tag1']='Scope 카드'+i+' 태그1';
	LABELS['blog'+i+'.tag2']='Scope 카드'+i+' 태그2';
}
for (let i=1;i<=9;i++){
	LABELS['p'+i+'.img']='Curriculum 항목'+i+' 이미지';
	LABELS['p'+i+'.title']='Curriculum 항목'+i+' 제목';
	LABELS['p'+i+'.sub']='Curriculum 항목'+i+' 부제';
}
for (let i=1;i<=4;i++){
	LABELS['team'+i+'.img']='강사'+i+' 사진';
	LABELS['team'+i+'.name']='강사'+i+' 이름';
	LABELS['team'+i+'.role']='강사'+i+' 직함';
}
['all','why','how','what','overview'].forEach(k=>LABELS['filter.'+k]='필터 — '+k);

// ── 상태 ──────────────────────────────────────────────────────
let content = {};       // 현재 렌더된 content.json (메모리)
let dirtyKeys = new Set();  // 변경된 키
let pendingImages = {}; // key → { dataUrl, file, filename } 업로드 대기 이미지
let activeEl = null;    // 편집 중인 요소
let activeKey = null;
let activeType = null;  // 'text' | 'image' | 'href' | 'attr'

// ── 유틸 ──────────────────────────────────────────────────────
const $ = sel => document.querySelector(sel);
function getByPath(obj, path){
	return path.split('.').reduce((a,k)=> a!=null && a[k]!==undefined ? a[k] : undefined, obj);
}
function setByPath(obj, path, val){
	const parts = path.split('.');
	let o = obj;
	for (let i=0;i<parts.length-1;i++){
		if (!o[parts[i]] || typeof o[parts[i]]!=='object') o[parts[i]] = {};
		o = o[parts[i]];
	}
	o[parts[parts.length-1]] = val;
}
function toast(msg, kind){
	let t = $('#cmsToast');
	if (!t){ t = document.createElement('div'); t.id='cmsToast'; t.className='cms-toast'; document.body.appendChild(t); }
	t.className = 'cms-toast show ' + (kind || '');
	t.textContent = msg;
	setTimeout(()=>{ t.classList.remove('show'); }, 3000);
}
function setStatus(msg, kind){
	const el = $('#cmsStatus');
	if (!el) return;
	el.textContent = msg;
	el.className = 'status ' + (kind || '');
}
function applyValueToDom(key, val){
	document.querySelectorAll('[data-edit-text="'+CSS.escape(key)+'"]').forEach(el=>{
		el.innerHTML = val;
		if (dirtyKeys.has(key)) el.setAttribute('data-cms-dirty','1');
	});
	document.querySelectorAll('[data-edit-img="'+CSS.escape(key)+'"]').forEach(el=>{
		el.setAttribute('src', val);
		if (dirtyKeys.has(key)) el.setAttribute('data-cms-dirty','1');
	});
	document.querySelectorAll('[data-edit-href="'+CSS.escape(key)+'"]').forEach(el=>{
		el.setAttribute('href', val);
		if (dirtyKeys.has(key)) el.setAttribute('data-cms-dirty','1');
	});
	document.querySelectorAll('[data-edit-attr="'+CSS.escape(key)+'"]').forEach(el=>{
		const an = el.getAttribute('data-edit-attr-name') || 'placeholder';
		el.setAttribute(an, val);
		if (dirtyKeys.has(key)) el.setAttribute('data-cms-dirty','1');
	});
}

// ── 툴바 ──────────────────────────────────────────────────────
function buildToolbar(){
	const bar = document.createElement('div');
	bar.className = 'cms-toolbar';
	bar.innerHTML = `
		<div class="brand"><span class="tag">EDIT</span>한국AI미래연구회</div>
		<div class="status" id="cmsStatus">변경 사항 없음</div>
		<button class="btn-ghost" id="cmsLogout"><i class="fa fa-sign-out"></i> 로그아웃</button>
		<button class="btn-ghost" id="cmsExit"><i class="fa fa-eye"></i> 미리보기</button>
		<button class="btn-save" id="cmsSave" disabled><i class="fa fa-save"></i> 저장 (커밋)</button>
	`;
	document.body.insertBefore(bar, document.body.firstChild);

	$('#cmsLogout').addEventListener('click', () => {
		if (!confirm('로그아웃하면 토큰이 삭제됩니다. 계속할까요?')) return;
		localStorage.removeItem('github_pat');
		localStorage.removeItem('github_user');
		location.replace('admin/');
	});
	$('#cmsExit').addEventListener('click', () => {
		const u = new URL(location.href);
		u.searchParams.delete('edit');
		location.href = u.toString();
	});
	$('#cmsSave').addEventListener('click', commitToGitHub);
}

// ── 패널 (편집기) ──────────────────────────────────────────────
function buildPanel(){
	const p = document.createElement('aside');
	p.className = 'cms-panel';
	p.id = 'cmsPanel';
	p.innerHTML = `
		<div class="cms-panel-head">
			<div>
				<div class="key" id="cmsPanelKey"></div>
				<div class="label" id="cmsPanelLabel"></div>
			</div>
			<button class="close" id="cmsPanelClose">×</button>
		</div>
		<div class="cms-panel-body" id="cmsPanelBody"></div>
		<div class="cms-panel-foot">
			<button class="btn-cancel" id="cmsPanelCancel">취소</button>
			<button class="btn-apply"  id="cmsPanelApply">적용 (미리보기)</button>
		</div>
	`;
	document.body.appendChild(p);
	$('#cmsPanelClose').addEventListener('click', closePanel);
	$('#cmsPanelCancel').addEventListener('click', closePanel);
	$('#cmsPanelApply').addEventListener('click', applyPanelChange);
}

function openEditor(el){
	if (activeEl) activeEl.classList.remove('cms-active');
	activeEl = el;
	activeEl.classList.add('cms-active');
	activeKey = el.dataset.editText || el.dataset.editImg || el.dataset.editHref || el.dataset.editAttr;
	activeType = el.hasAttribute('data-edit-text') ? 'text'
	            : el.hasAttribute('data-edit-img')  ? 'image'
	            : el.hasAttribute('data-edit-href') ? 'href'
	            : 'attr';

	$('#cmsPanelKey').textContent   = activeKey;
	$('#cmsPanelLabel').textContent = LABELS[activeKey] || activeKey;

	const cur = getByPath(content, activeKey) || '';
	const body = $('#cmsPanelBody');

	if (activeType === 'image'){
		body.innerHTML = `
			<label>현재 이미지</label>
			<div class="cms-panel-img-preview" id="cmsImgPreview" style="background-image:url(${JSON.stringify(cur)});"></div>
			<div class="cms-img-controls">
				<label><input type="file" id="cmsImgFile" accept="image/*"> 📁 파일 업로드</label>
			</div>
			<label>또는 이미지 URL/경로</label>
			<input type="text" id="cmsInput" value="${escapeAttr(cur)}" placeholder="uploads/사진.jpg 또는 https://...">
			<div class="cms-help">파일을 선택하면 저장 시 GitHub의 <code>uploads/</code> 폴더에 자동 업로드되고 경로가 자동 입력됩니다.</div>
		`;
		$('#cmsImgFile').addEventListener('change', handleFilePick);
	} else {
		const isLong = String(cur).length > 80 || activeType === 'text';
		body.innerHTML = isLong
			? `<label>내용</label><textarea id="cmsInput">${escapeText(cur)}</textarea><div class="cms-help">HTML 태그 사용 가능 (예: &lt;br&gt;, &lt;strong&gt;)</div>`
			: `<label>내용</label><input type="text" id="cmsInput" value="${escapeAttr(cur)}"><div class="cms-help">짧은 텍스트 1줄</div>`;
	}
	$('#cmsPanel').classList.add('open');
	setTimeout(() => { const i = $('#cmsInput'); if (i) i.focus(); }, 100);
}

function closePanel(){
	$('#cmsPanel').classList.remove('open');
	if (activeEl) activeEl.classList.remove('cms-active');
	activeEl = null; activeKey = null; activeType = null;
}

function handleFilePick(e){
	const f = e.target.files[0];
	if (!f) return;
	if (f.size > 8 * 1024 * 1024){
		toast('파일이 너무 큽니다 (8MB 초과)', 'error');
		return;
	}
	const r = new FileReader();
	r.onload = ev => {
		const dataUrl = ev.target.result;
		// 미리보기
		$('#cmsImgPreview').style.backgroundImage = 'url(' + JSON.stringify(dataUrl) + ')';
		// 경로 생성: uploads/<timestamp>-<safe name>
		const safe = f.name.replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase();
		const ts = Date.now();
		const path = 'uploads/' + ts + '-' + safe;
		$('#cmsInput').value = path;
		// pending 업로드에 등록 — 키별로 저장
		pendingImages[activeKey] = { dataUrl: dataUrl, filename: path, file: f };
	};
	r.readAsDataURL(f);
}

function applyPanelChange(){
	if (!activeKey) return;
	const newVal = $('#cmsInput').value;
	const oldVal = getByPath(content, activeKey);
	if (newVal === oldVal && !pendingImages[activeKey]){
		closePanel();
		return;
	}
	setByPath(content, activeKey, newVal);
	dirtyKeys.add(activeKey);

	// 미리보기 즉시 적용 — 이미지면 dataUrl로, 그 외엔 newVal로
	if (activeType === 'image' && pendingImages[activeKey]){
		document.querySelectorAll('[data-edit-img="'+CSS.escape(activeKey)+'"]').forEach(el=>{
			el.setAttribute('src', pendingImages[activeKey].dataUrl);
			el.setAttribute('data-cms-dirty','1');
		});
	} else {
		applyValueToDom(activeKey, newVal);
	}
	updateSaveButton();
	closePanel();
	toast('적용됨 — 저장 버튼을 눌러 GitHub에 커밋하세요', 'warn');
}

function updateSaveButton(){
	const n = dirtyKeys.size;
	const btn = $('#cmsSave');
	btn.disabled = n === 0;
	btn.innerHTML = n > 0
		? '<i class="fa fa-save"></i> 저장 (' + n + '개 변경)'
		: '<i class="fa fa-save"></i> 저장 (커밋)';
	setStatus(n > 0 ? n + '개 항목 변경됨 — 저장 대기' : '변경 사항 없음', n > 0 ? 'dirty' : '');
}

// ── 오버레이 부착 ────────────────────────────────────────────
function attachOverlays(){
	const els = document.querySelectorAll('[data-edit-text],[data-edit-img],[data-edit-href],[data-edit-attr]');
	console.log('[CMS] 편집 가능 요소 발견:', els.length + '개');

	els.forEach(el=>{
		// 핸들러 — flexslider/Bootstrap nav 등 다른 핸들러보다 우선
		const handler = ev => {
			if (!document.documentElement.classList.contains('edit-mode')) return;
			ev.preventDefault(); ev.stopPropagation();
			if (typeof ev.stopImmediatePropagation === 'function') ev.stopImmediatePropagation();
			// input/textarea 클릭은 포커스 들어가지 않도록 즉시 blur
			if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
				try { el.blur(); } catch(_){}
			}
			openEditor(el);
		};
		// click + mousedown 둘 다 capture 단계로 등록 — 다른 라이브러리가 mousedown 먼저 처리하는 경우 대비
		el.addEventListener('click', handler, true);
		el.addEventListener('mousedown', ev => {
			if (!document.documentElement.classList.contains('edit-mode')) return;
			ev.preventDefault();
			ev.stopPropagation();
			if (typeof ev.stopImmediatePropagation === 'function') ev.stopImmediatePropagation();
		}, true);
	});

	// 모든 form 의 submit 차단 (편집 모드에서 실수로 보내지 않도록)
	document.querySelectorAll('form').forEach(f => {
		f.addEventListener('submit', ev => {
			ev.preventDefault();
			toast('편집 모드에서는 폼 전송이 비활성화됩니다', 'warn');
		}, true);
	});
}

// ── GitHub API ────────────────────────────────────────────────
async function gh(path, init){
	const r = await fetch('https://api.github.com' + path, Object.assign({
		headers: {
			'Authorization': 'Bearer ' + PAT,
			'Accept': 'application/vnd.github+json',
			'X-GitHub-Api-Version': '2022-11-28'
		}
	}, init || {}));
	const data = await r.json().catch(()=>({}));
	if (!r.ok){
		const msg = data.message || ('HTTP ' + r.status);
		throw new Error(msg + (data.documentation_url ? ' — ' + data.documentation_url : ''));
	}
	return data;
}

async function getFileSha(path){
	try {
		const d = await gh('/repos/' + REPO + '/contents/' + encodeURIComponent(path) + '?ref=' + BRANCH);
		return d.sha;
	} catch (e){
		if (e.message.includes('404') || e.message.toLowerCase().includes('not found')) return null;
		// 일부 응답은 message에 'Not Found' 포함
		if (/not found/i.test(e.message)) return null;
		throw e;
	}
}

function dataUrlToBase64(dataUrl){
	return dataUrl.split(',', 2)[1];
}

async function putFile(path, base64Content, message){
	const sha = await getFileSha(path);
	const body = {
		message: message,
		content: base64Content,
		branch: BRANCH
	};
	if (sha) body.sha = sha;
	return gh('/repos/' + REPO + '/contents/' + encodeURIComponent(path), {
		method: 'PUT',
		body: JSON.stringify(body)
	});
}

async function commitToGitHub(){
	if (dirtyKeys.size === 0){ toast('변경 사항이 없습니다'); return; }
	const btn = $('#cmsSave');
	btn.disabled = true;
	setStatus('저장 중...', 'saving');

	try {
		// 1. 대기 중인 이미지 업로드
		const imageKeys = Object.keys(pendingImages);
		for (const k of imageKeys){
			if (!dirtyKeys.has(k)) continue;
			const img = pendingImages[k];
			setStatus('이미지 업로드: ' + img.filename, 'saving');
			await putFile(img.filename, dataUrlToBase64(img.dataUrl), '이미지 업로드: ' + img.filename + ' (' + LABELS[k] + ')');
		}

		// 2. content.json 업데이트
		setStatus('content.json 업데이트 중...', 'saving');
		const jsonStr = JSON.stringify(content, null, 2) + '\n';
		const b64 = btoa(unescape(encodeURIComponent(jsonStr)));
		const summary = imageKeys.length > 0
			? '콘텐츠 수정 (' + dirtyKeys.size + '개 항목, 이미지 ' + imageKeys.length + '개)'
			: '콘텐츠 수정 (' + dirtyKeys.size + '개 항목)';
		await putFile('content.json', b64, summary);

		// 3. 성공 처리
		dirtyKeys.clear();
		pendingImages = {};
		document.querySelectorAll('[data-cms-dirty]').forEach(el => el.removeAttribute('data-cms-dirty'));
		updateSaveButton();
		setStatus('저장 완료 — Vercel 재배포 1~2분', 'saved');
		toast('GitHub 커밋 완료. Vercel 자동 재배포까지 1~2분 기다리세요.');
	} catch (e){
		console.error(e);
		setStatus('저장 실패: ' + e.message, 'error');
		toast('저장 실패: ' + e.message, 'error');
		btn.disabled = false;
	}
}

// ── 텍스트/속성 이스케이프 ─────────────────────────────────────
function escapeText(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escapeAttr(s){ return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }

// ── 초기화 ────────────────────────────────────────────────────
async function init(){
	console.log('[CMS] 편집 모드 초기화 시작');
	try {
		content = await window.__contentReady;
		if (!content || typeof content !== 'object') content = {};
		console.log('[CMS] content.json 로드 완료, 최상위 키:', Object.keys(content).length);

		buildToolbar();
		buildPanel();
		attachOverlays();
		updateSaveButton();
		toast('편집 모드 — 텍스트/이미지 클릭하여 편집');
		console.log('[CMS] 초기화 완료. window.__cms 로 디버그 가능');
		window.__cms = { content, dirtyKeys, pendingImages, openEditor };
	} catch (e) {
		console.error('[CMS] 초기화 실패:', e);
		alert('편집 모드 초기화 실패: ' + e.message);
	}
}

// content가 DOM에 적용된 직후 실행되도록 약간 지연
if (document.readyState === 'loading'){
	document.addEventListener('DOMContentLoaded', () => setTimeout(init, 200));
} else {
	setTimeout(init, 200);
}

})();
