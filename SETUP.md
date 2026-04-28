# 한국AI미래연구회 사이트 — 배포 & 관리자 페이지 설정 가이드

## 📁 폴더 구조

```
한국AI미래연구회/
├── index.html          ← 사이트 본체
├── content.json        ← 모든 텍스트 + 이미지 경로 (CMS가 편집)
├── admin/
│   ├── index.html      ← 관리자 페이지 (Sveltia CMS)
│   └── config.yml      ← 콘텐츠 스키마
├── uploads/            ← CMS가 업로드한 이미지 보관
├── vercel.json         ← Vercel 캐싱/SEO 설정
└── SETUP.md            ← 이 문서

orbit7-HTML/            ← 템플릿 자산 (CSS/JS/이미지) — 같이 배포
```

## 🚀 1단계 — GitHub에 올리기

1. GitHub에서 새 저장소 생성 (예: `aifuture-site`, **Public** 또는 **Private** 모두 가능)
2. 터미널에서:
   ```bash
   cd "/Volumes/D Drive/program/AI협회"
   git init
   git add .
   git commit -m "초기 커밋"
   git remote add origin https://github.com/본인아이디/저장소명.git
   git branch -M main
   git push -u origin main
   ```

## 🌐 2단계 — Vercel 배포

1. https://vercel.com 가입 (GitHub 계정으로 로그인)
2. **Add New → Project** → 방금 만든 저장소 선택
3. **Framework Preset**: `Other` 선택
4. **Root Directory**: 그대로 두기 (저장소 루트)
5. **Deploy** 클릭 → 1~2분 후 사이트 URL 발급 (예: `https://aifuture-site.vercel.app`)

사이트 접속:
- **공개 사이트**: `https://aifuture-site.vercel.app/한국AI미래연구회/index.html`
- **관리자**: `https://aifuture-site.vercel.app/한국AI미래연구회/admin/`

## 🔐 3단계 — GitHub OAuth 앱 만들기 (관리자 로그인용)

Sveltia CMS는 GitHub OAuth로 본인 인증합니다. 별도 서버 필요 없음.

1. https://github.com/settings/developers → **OAuth Apps** → **New OAuth App**
2. 입력 항목:
   - **Application name**: `한국AI미래연구회 CMS`
   - **Homepage URL**: `https://aifuture-site.vercel.app` (Vercel에서 받은 URL)
   - **Authorization callback URL**: `https://aifuture-site.vercel.app/admin/`
3. **Register application** 클릭
4. 생성된 앱 페이지에서:
   - **Client ID** 복사
   - **Generate a new client secret** → secret 복사 (한 번만 보임!)

> Sveltia CMS는 PKCE 방식이라 client secret은 실제로는 사용 안 함. 그래도 OAuth 앱 생성은 필요.

## ⚙️ 4단계 — config.yml 수정

`admin/config.yml` 파일 열어서:

```yaml
backend:
  name: github
  repo: USER/REPO    # ← 여기를 본인 깃허브주소로
  branch: main
```

예: `repo: leejaewoong/aifuture-site`

수정 후 깃 푸시 → Vercel 자동 재배포.

## ✏️ 5단계 — 관리자 페이지 사용

1. 브라우저에서 `https://aifuture-site.vercel.app/한국AI미래연구회/admin/` 접속
2. **Sign in with GitHub** 클릭 → 본인 GitHub 계정으로 로그인
3. 처음 로그인 시 Sveltia CMS가 저장소 권한 요청 → 승인
4. 좌측 사이드바 **사이트 콘텐츠** 클릭
5. 항목 펼쳐서 텍스트 편집, 이미지는 **Choose an image** 버튼으로 업로드
6. 우측 상단 **Save** 클릭

**저장하면 일어나는 일**:
- Sveltia CMS가 GitHub API로 `content.json` 또는 `uploads/이미지.jpg` 변경분을 자동 커밋
- Vercel이 푸시 감지하고 1~2분 후 사이트 자동 재배포
- 모든 방문자에게 변경 내용 반영됨

## 📷 사진은 어떻게 저장되고 표시되나?

- 관리자 페이지에서 사진 업로드 → Sveltia가 GitHub의 `한국AI미래연구회/uploads/` 폴더에 파일 커밋
- `content.json`에는 그 사진의 경로(예: `/한국AI미래연구회/uploads/팀사진.jpg`)가 저장됨
- 사이트가 `content.json`을 fetch해서 `<img src="...">`에 적용
- 즉, 사진은 **GitHub 저장소에 영구 보관 → Vercel CDN으로 서빙**

## 🛡️ 보안 체크리스트

- [x] `admin/` 폴더에 `<meta name="robots" content="noindex">` 설정됨 (검색엔진 노출 방지)
- [x] `vercel.json`에 `X-Robots-Tag` 헤더 추가됨
- [x] GitHub OAuth로 본인만 로그인 가능
- [ ] (선택) `config.yml` 의 `backend.repo`를 Private 저장소로 운영하면 더 안전

## 🧪 로컬 테스트 (선택)

배포 전에 로컬에서 먼저 확인하고 싶다면:

```bash
# 1. 정적 서버 띄우기
cd "/Volumes/D Drive/program/AI협회"
python3 -m http.server 8000

# 2. 다른 터미널에서 CMS 로컬 백엔드 띄우기
npx @sveltia/cms-proxy-server
# 또는 Decap 사용 시: npx decap-server

# 3. 브라우저로 접속
# 사이트: http://localhost:8000/한국AI미래연구회/index.html
# 관리자: http://localhost:8000/한국AI미래연구회/admin/
```

`config.yml`에 `local_backend: true`가 이미 켜져 있어서, localhost에서 열면 자동으로 로컬 git에 커밋합니다 (GitHub 푸시는 본인이 수동으로).

## 🔄 자주 묻는 것

**Q. 관리자 페이지에서 저장했는데 사이트에 반영이 안 돼요**
→ Vercel이 재배포 중일 수 있음. Vercel 대시보드 **Deployments** 탭에서 진행 상태 확인. 보통 1~2분.

**Q. 이미지가 안 보여요**
→ `content.json`에 저장된 경로가 `/한국AI미래연구회/uploads/...` 형식인지 확인. `config.yml`의 `public_folder`와 일치해야 함.

**Q. Sveltia 대신 Decap CMS 쓰고 싶어요**
→ `admin/index.html`의 script 태그 두 줄 중 주석 처리된 Decap 줄을 활성화. 단, Decap은 OAuth 프록시 서버가 별도로 필요해서 더 복잡합니다.

**Q. content.json 직접 편집해도 되나요?**
→ 됩니다. CMS는 그저 이 JSON을 편집하는 GUI일 뿐. VS Code로 직접 편집하고 푸시해도 동일하게 작동합니다.
